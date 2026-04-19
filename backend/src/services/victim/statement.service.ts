import { Language } from "../../generated/prisma/enums";
import { prisma } from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { ensureVictimCatalog } from "./catalog.service";

export const languageEnumToIso = (lang: Language): string => {
  if (lang === Language.HINDI) return "hi";
  return "en";
};

import { generateUniqueFirNumber } from "../../utils/firNumber";
export const victimLanguageFromCode = (code?: string): Language => {
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
  };
  if (!code) return Language.ENGLISH;
  return languageMap[code.trim().toLowerCase()] ?? Language.ENGLISH;
};

export const createVictimStatement = async (
  userId: string,
  payload: {
    rawText: string;
    accusedPersonName: string;
    accusedAddress: string;
    assetsDescription?: string;
    translatedText?: string;
    language?: string;
    incidentDate?: string;
    incidentTime?: string;
    incidentLocation?: string;
    witnessDetails?: string;
  },
) => {
  await ensureVictimCatalog();

  if (!payload.rawText.trim()) {
    throw new ApiError(400, "Statement text is required.");
  }

  const accusedPersonName = payload.accusedPersonName?.trim();
  if (!accusedPersonName) {
    throw new ApiError(
      400,
      "Name of the person against whom FIR is being lodged is required.",
    );
  }

  const accusedAddress = payload.accusedAddress?.trim();
  if (!accusedAddress) {
    throw new ApiError(
      400,
      "Address of the person against whom FIR is being lodged is required.",
    );
  }

  const assetsDescription = payload.assetsDescription?.trim();

  const statementText = payload.rawText.trim();
  const statementPrefix = [
    `Accused person name: ${accusedPersonName}`,
    `Accused person address: ${accusedAddress}`,
  ];
  if (assetsDescription) {
    statementPrefix.push(`Assets description: ${assetsDescription}`);
  }

  const rawTextWithAccused = `${statementPrefix.join("\n")}\n\n${statementText}`;

  return prisma.victimStatement.create({
    data: {
      userId,
      rawText: rawTextWithAccused,
      translatedText: payload.translatedText?.trim() || null,
      language: victimLanguageFromCode(payload.language),
      incidentDate: payload.incidentDate
        ? new Date(payload.incidentDate)
        : null,
      incidentTime: payload.incidentTime?.trim() || null,
      incidentLocation: payload.incidentLocation?.trim() || null,
      witnessDetails: payload.witnessDetails?.trim() || null,
    },
  });
};

export const getLatestVictimStatement = async (userId: string) =>
  prisma.victimStatement.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      classification: {
        include: {
          bnsSection: true,
        },
      },
    },
  });

export const submitVictimStatementToStation = async (
  userId: string,
  payload: { stationId: string; statementId?: string },
) => {
  await ensureVictimCatalog();

  const stationId = payload.stationId?.trim();
  if (!stationId) {
    throw new ApiError(400, "stationId is required.");
  }

  const station = await prisma.policeStation.findUnique({
    where: { id: stationId },
  });
  if (!station) {
    throw new ApiError(404, "Selected police station was not found.");
  }

  const statement = payload.statementId
    ? await prisma.victimStatement.findFirst({
        where: { id: payload.statementId, userId },
        include: { classification: true },
      })
    : await prisma.victimStatement.findFirst({
        where: { userId },
        include: { classification: true },
        orderBy: { createdAt: "desc" },
      });

  if (!statement) {
    throw new ApiError(404, "No victim statement found to submit.");
  }

  if (statement.firId) {
    const existingFir = await prisma.fIR.findUnique({
      where: { id: statement.firId },
      include: { station: true, bnsSections: true },
    });
    if (existingFir) {
      return { fir: existingFir, alreadySubmitted: true };
    }
  }

  const statementText = (
    statement.rawText ??
    statement.translatedText ??
    ""
  ).trim();
  if (!statementText) {
    throw new ApiError(
      400,
      "The selected statement is empty and cannot be sent.",
    );
  }

  const fir = await prisma.$transaction(async (tx) => {
    const firNumber = await generateUniqueFirNumber(tx);

    const createdFir = await tx.fIR.create({
      data: {
        firNumber,
        victimId: userId,
        stationId,
        status: "DRAFT",
        isOnlineFIR: true,
        urgencyLevel: statement.classification?.urgencyLevel ?? "MEDIUM",
        incidentDate: statement.incidentDate ?? new Date(),
        incidentTime: statement.incidentTime?.trim() || null,
        incidentLocation:
          statement.incidentLocation?.trim() || "Location to be confirmed",
        incidentDescription: statementText,
        bnsSections: statement.classification?.bnsSectionId
          ? { connect: [{ id: statement.classification.bnsSectionId }] }
          : undefined,
      },
      include: {
        station: true,
        bnsSections: true,
      },
    });

    await tx.victimStatement.update({
      where: { id: statement.id },
      data: {
        firId: createdFir.id,
        isUsedForFIR: true,
      },
    });

    await tx.caseUpdate.create({
      data: {
        firId: createdFir.id,
        status: "DRAFT",
        note: "Victim submitted statement online for station review.",
        updatedById: userId,
      },
    });

    return createdFir;
  });

  return { fir, alreadySubmitted: false };
};
