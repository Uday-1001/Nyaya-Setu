"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutController = exports.updateMeController = exports.meController = exports.refreshController = exports.loginController = void 0;
const enums_1 = require("../generated/prisma/enums");
const client_1 = require("../generated/prisma/client");
const database_1 = require("../config/database");
const hash_1 = require("../utils/hash");
const ApiError_1 = require("../utils/ApiError");
const databaseError_1 = require("../utils/databaseError");
const server_shared_1 = require("../server.shared");
const auth_shared_1 = require("./auth.shared");
const shared_auth_service_1 = require("../services/auth/shared.auth.service");
const jwt_1 = require("../utils/jwt");
const auth_middleware_1 = require("../middleware/auth.middleware");
const genderMap = {
    male: enums_1.Gender.MALE,
    female: enums_1.Gender.FEMALE,
    other: enums_1.Gender.OTHER,
    prefer_not_to_say: enums_1.Gender.PREFER_NOT_TO_SAY,
    "": null,
};
const languageMap = {
    en: enums_1.Language.ENGLISH,
    hi: enums_1.Language.HINDI,
    bh: enums_1.Language.BHOJPURI,
    mr: enums_1.Language.MARATHI,
    ta: enums_1.Language.TAMIL,
    te: enums_1.Language.TELUGU,
    bn: enums_1.Language.BENGALI,
    gu: enums_1.Language.GUJARATI,
    kn: enums_1.Language.KANNADA,
    ml: enums_1.Language.MALAYALAM,
    pa: enums_1.Language.PUNJABI,
    or: enums_1.Language.ODIA,
    ENGLISH: enums_1.Language.ENGLISH,
    HINDI: enums_1.Language.HINDI,
    BHOJPURI: enums_1.Language.BHOJPURI,
    MARATHI: enums_1.Language.MARATHI,
    TAMIL: enums_1.Language.TAMIL,
    TELUGU: enums_1.Language.TELUGU,
    BENGALI: enums_1.Language.BENGALI,
    GUJARATI: enums_1.Language.GUJARATI,
    KANNADA: enums_1.Language.KANNADA,
    MALAYALAM: enums_1.Language.MALAYALAM,
    PUNJABI: enums_1.Language.PUNJABI,
    ODIA: enums_1.Language.ODIA,
};
const findUserForLogin = async (email) => database_1.prisma.user
    .findFirst({
    where: {
        email,
    },
    include: {
        officer: true,
    },
})
    .catch((error) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        (0, databaseError_1.normalizeDatabaseError)(error);
    }
    (0, databaseError_1.normalizeDatabaseError)(error);
});
const loginController = async (req, res, body) => {
    const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
    const password = String(body.password ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new ApiError_1.ApiError(400, "Enter a valid email address.");
    }
    if (!password) {
        throw new ApiError_1.ApiError(400, "Password is required.");
    }
    const user = await findUserForLogin(email);
    if (!user || !(0, hash_1.verifyPassword)(password, user.passwordHash)) {
        throw new ApiError_1.ApiError(401, "Invalid email or password.");
    }
    if (!user.isActive) {
        throw new ApiError_1.ApiError(403, "This account is inactive. Please contact support.");
    }
    if (user.role === enums_1.Role.OFFICER &&
        user.officer?.verificationStatus !== enums_1.OfficerVerificationStatus.VERIFIED) {
        throw new ApiError_1.ApiError(403, "Officer account is pending admin approval.");
    }
    const result = (0, shared_auth_service_1.buildAuthResponse)(user);
    (0, auth_shared_1.setAuthCookies)(res, result);
    (0, server_shared_1.sendJson)(res, 200, result);
};
exports.loginController = loginController;
const refreshController = async (req, res, body) => {
    const cookies = (0, server_shared_1.parseCookies)(req);
    const refreshToken = String(body.refreshToken ?? cookies.refreshToken ?? "");
    if (!refreshToken) {
        throw new ApiError_1.ApiError(401, "Refresh token is required.");
    }
    const tokenPayload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    const user = await database_1.prisma.user
        .findUnique({
        where: {
            id: tokenPayload.sub,
        },
        include: {
            officer: true,
        },
    })
        .catch((error) => (0, databaseError_1.normalizeDatabaseError)(error));
    if (!user || !user.isActive) {
        throw new ApiError_1.ApiError(401, "Session is no longer valid.");
    }
    if (user.role === enums_1.Role.OFFICER &&
        user.officer?.verificationStatus !== enums_1.OfficerVerificationStatus.VERIFIED) {
        throw new ApiError_1.ApiError(403, "Officer account is pending admin approval.");
    }
    const result = (0, shared_auth_service_1.buildAuthResponse)(user);
    (0, auth_shared_1.setAuthCookies)(res, result);
    (0, server_shared_1.sendJson)(res, 200, result);
};
exports.refreshController = refreshController;
const meController = async (req, res) => {
    const authHeader = req.headers.authorization;
    const cookies = (0, server_shared_1.parseCookies)(req);
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";
    const accessToken = bearerToken || cookies.accessToken;
    if (!accessToken) {
        throw new ApiError_1.ApiError(401, "Authentication required.");
    }
    const tokenPayload = (0, jwt_1.verifyAccessToken)(accessToken);
    const user = await database_1.prisma.user
        .findUnique({
        where: {
            id: tokenPayload.sub,
        },
        include: {
            officer: true,
        },
    })
        .catch((error) => (0, databaseError_1.normalizeDatabaseError)(error));
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found.");
    }
    (0, server_shared_1.sendJson)(res, 200, (0, shared_auth_service_1.toSafeUser)(user));
};
exports.meController = meController;
const updateMeController = async (req, res, body) => {
    const user = await (0, auth_middleware_1.getAuthenticatedUser)(req);
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, "name")) {
        const name = String(body.name ?? "").trim();
        if (name.length < 2) {
            throw new ApiError_1.ApiError(400, "Full name must be at least 2 characters.");
        }
        updates.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(body, "phone")) {
        const phone = String(body.phone ?? "").trim();
        if (!/^[6-9]\d{9}$/.test(phone)) {
            throw new ApiError_1.ApiError(400, "Enter a valid 10-digit Indian mobile number.");
        }
        if (phone !== user.phone) {
            const existing = await database_1.prisma.user.findFirst({
                where: {
                    phone,
                    id: { not: user.id },
                },
            });
            if (existing) {
                throw new ApiError_1.ApiError(409, "An account with this phone already exists.");
            }
        }
        updates.phone = phone;
    }
    if (Object.prototype.hasOwnProperty.call(body, "gender")) {
        const genderRaw = String(body.gender ?? "")
            .trim()
            .toLowerCase();
        if (!(genderRaw in genderMap)) {
            throw new ApiError_1.ApiError(400, "Invalid gender value.");
        }
        updates.gender = genderMap[genderRaw];
    }
    if (Object.prototype.hasOwnProperty.call(body, "language")) {
        const languageRaw = String(body.language ?? "").trim();
        const mapped = languageMap[languageRaw];
        if (!mapped) {
            throw new ApiError_1.ApiError(400, "Invalid language value.");
        }
        updates.preferredLang = mapped;
    }
    if (Object.prototype.hasOwnProperty.call(body, "aadhaarLast4")) {
        const aadhaarLast4 = String(body.aadhaarLast4 ?? "").trim();
        if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) {
            throw new ApiError_1.ApiError(400, "Aadhaar field must contain exactly 4 digits.");
        }
        updates.aadhaarLast4 = aadhaarLast4 || null;
    }
    if (!Object.keys(updates).length) {
        throw new ApiError_1.ApiError(400, "No profile fields were provided to update.");
    }
    const updated = await database_1.prisma.user
        .update({
        where: { id: user.id },
        data: updates,
        include: { officer: true },
    })
        .catch((error) => (0, databaseError_1.normalizeDatabaseError)(error));
    (0, server_shared_1.sendJson)(res, 200, (0, shared_auth_service_1.toSafeUser)(updated));
};
exports.updateMeController = updateMeController;
const logoutController = async (_req, res) => {
    (0, auth_shared_1.clearAuthCookies)(res);
    (0, server_shared_1.sendJson)(res, 200, { success: true, message: "Logged out successfully." });
};
exports.logoutController = logoutController;
