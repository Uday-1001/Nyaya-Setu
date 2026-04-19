import type { IncomingMessage, ServerResponse } from "node:http";
import {
  Gender,
  Language,
  OfficerVerificationStatus,
  Role,
} from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/database";
import { verifyPassword } from "../utils/hash";
import { ApiError } from "../utils/ApiError";
import { normalizeDatabaseError } from "../utils/databaseError";
import { sendJson, parseCookies } from "../server.shared";
import { clearAuthCookies, setAuthCookies } from "./auth.shared";
import {
  buildAuthResponse,
  toSafeUser,
} from "../services/auth/shared.auth.service";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwt";
import { getAuthenticatedUser } from "../middleware/auth.middleware";

const genderMap: Record<string, Gender | null> = {
  male: Gender.MALE,
  female: Gender.FEMALE,
  other: Gender.OTHER,
  prefer_not_to_say: Gender.PREFER_NOT_TO_SAY,
  "": null,
};

const languageMap: Record<string, Language> = {
  en: Language.ENGLISH,
  hi: Language.HINDI,
  bh: Language.BHOJPURI,
  mr: Language.MARATHI,
  ta: Language.TAMIL,
  te: Language.TELUGU,
  bn: Language.BENGALI,
  gu: Language.GUJARATI,
  kn: Language.KANNADA,
  ml: Language.MALAYALAM,
  pa: Language.PUNJABI,
  or: Language.ODIA,
  ENGLISH: Language.ENGLISH,
  HINDI: Language.HINDI,
  BHOJPURI: Language.BHOJPURI,
  MARATHI: Language.MARATHI,
  TAMIL: Language.TAMIL,
  TELUGU: Language.TELUGU,
  BENGALI: Language.BENGALI,
  GUJARATI: Language.GUJARATI,
  KANNADA: Language.KANNADA,
  MALAYALAM: Language.MALAYALAM,
  PUNJABI: Language.PUNJABI,
  ODIA: Language.ODIA,
};

const findUserForLogin = async (email: string) =>
  prisma.user
    .findFirst({
      where: {
        email,
      },
      include: {
        officer: true,
      },
    })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        normalizeDatabaseError(error);
      }
      normalizeDatabaseError(error);
    });

export const loginController = async (
  req: IncomingMessage,
  res: ServerResponse,
  body: Record<string, unknown>,
) => {
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body.password ?? "");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(400, "Enter a valid email address.");
  }

  if (!password) {
    throw new ApiError(400, "Password is required.");
  }

  const user = await findUserForLogin(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      "This account is inactive. Please contact support.",
    );
  }

  if (
    user.role === Role.OFFICER &&
    user.officer?.verificationStatus !== OfficerVerificationStatus.VERIFIED
  ) {
    throw new ApiError(403, "Officer account is pending admin approval.");
  }

  const result = buildAuthResponse(user);
  setAuthCookies(res, result);
  sendJson(res, 200, result);
};

export const refreshController = async (
  req: IncomingMessage,
  res: ServerResponse,
  body: Record<string, unknown>,
) => {
  const cookies = parseCookies(req);
  const refreshToken = String(body.refreshToken ?? cookies.refreshToken ?? "");

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  const tokenPayload = verifyRefreshToken(refreshToken);
  const user = await prisma.user
    .findUnique({
      where: {
        id: tokenPayload.sub,
      },
      include: {
        officer: true,
      },
    })
    .catch((error: unknown) => normalizeDatabaseError(error));

  if (!user || !user.isActive) {
    throw new ApiError(401, "Session is no longer valid.");
  }

  if (
    user.role === Role.OFFICER &&
    user.officer?.verificationStatus !== OfficerVerificationStatus.VERIFIED
  ) {
    throw new ApiError(403, "Officer account is pending admin approval.");
  }

  const result = buildAuthResponse(user);
  setAuthCookies(res, result);
  sendJson(res, 200, result);
};

export const meController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const authHeader = req.headers.authorization;
  const cookies = parseCookies(req);
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  const accessToken = bearerToken || cookies.accessToken;

  if (!accessToken) {
    throw new ApiError(401, "Authentication required.");
  }

  const tokenPayload = verifyAccessToken(accessToken);
  const user = await prisma.user
    .findUnique({
      where: {
        id: tokenPayload.sub,
      },
      include: {
        officer: true,
      },
    })
    .catch((error: unknown) => normalizeDatabaseError(error));

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  sendJson(res, 200, toSafeUser(user));
};

export const updateMeController = async (
  req: IncomingMessage,
  res: ServerResponse,
  body: Record<string, unknown>,
) => {
  const user = await getAuthenticatedUser(req);

  const updates: {
    name?: string;
    phone?: string;
    gender?: Gender | null;
    preferredLang?: Language;
    aadhaarLast4?: string | null;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = String(body.name ?? "").trim();
    if (name.length < 2) {
      throw new ApiError(400, "Full name must be at least 2 characters.");
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    const phone = String(body.phone ?? "").trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      throw new ApiError(400, "Enter a valid 10-digit Indian mobile number.");
    }

    if (phone !== user.phone) {
      const existing = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: user.id },
        },
      });

      if (existing) {
        throw new ApiError(409, "An account with this phone already exists.");
      }
    }

    updates.phone = phone;
  }

  if (Object.prototype.hasOwnProperty.call(body, "gender")) {
    const genderRaw = String(body.gender ?? "")
      .trim()
      .toLowerCase();
    if (!(genderRaw in genderMap)) {
      throw new ApiError(400, "Invalid gender value.");
    }
    updates.gender = genderMap[genderRaw];
  }

  if (Object.prototype.hasOwnProperty.call(body, "language")) {
    const languageRaw = String(body.language ?? "").trim();
    const mapped = languageMap[languageRaw];
    if (!mapped) {
      throw new ApiError(400, "Invalid language value.");
    }
    updates.preferredLang = mapped;
  }

  if (Object.prototype.hasOwnProperty.call(body, "aadhaarLast4")) {
    const aadhaarLast4 = String(body.aadhaarLast4 ?? "").trim();
    if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) {
      throw new ApiError(400, "Aadhaar field must contain exactly 4 digits.");
    }
    updates.aadhaarLast4 = aadhaarLast4 || null;
  }

  if (!Object.keys(updates).length) {
    throw new ApiError(400, "No profile fields were provided to update.");
  }

  const updated = await prisma.user
    .update({
      where: { id: user.id },
      data: updates,
      include: { officer: true },
    })
    .catch((error: unknown) => normalizeDatabaseError(error));

  sendJson(res, 200, toSafeUser(updated));
};

export const logoutController = async (
  _req: IncomingMessage,
  res: ServerResponse,
) => {
  clearAuthCookies(res);
  sendJson(res, 200, { success: true, message: "Logged out successfully." });
};
