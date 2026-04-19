import { prisma } from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { ensureVictimCatalog } from "./catalog.service";
import { env } from "../../config/env";
import { remoteClassifyText } from "../ml/mlClient";
import type { MlClassificationPayload } from "../../types/ml.types";
import { languageEnumToIso } from "./statement.service";

const formatImprisonmentRange = (section: {
  sectionNumber: string;
  sectionTitle: string;
  isLifeOrDeath: boolean;
  minImprisonmentMonths: number | null;
  maxImprisonmentMonths: number | null;
}) => {
  if (section.isLifeOrDeath) {
    return "Life imprisonment or more severe punishment where specified.";
  }

  const min = section.minImprisonmentMonths;
  const max = section.maxImprisonmentMonths;

  if (typeof min === "number" && typeof max === "number") {
    return `${min} to ${max} months`;
  }

  return `Statutory imprisonment range is to be confirmed under BNS Section ${section.sectionNumber} (${section.sectionTitle}) during officer/legal review.`;
};

const formatFineRange = (section: {
  sectionNumber: string;
  sectionTitle: string;
  minFine: number | null;
  maxFine: number | null;
}) => {
  const min = section.minFine;
  const max = section.maxFine;

  if (typeof min === "number" && typeof max === "number") {
    return `INR ${min} to INR ${max}`;
  }

  return `Fine range is to be confirmed under BNS Section ${section.sectionNumber} (${section.sectionTitle}) during officer/legal review.`;
};

export const persistVictimClassification = async (
  statementId: string,
  payload: MlClassificationPayload,
) => {
  await ensureVictimCatalog();

  const section = await prisma.bNSSection.findUnique({
    where: { sectionNumber: payload.primarySectionNumber },
  });

  if (!section) {
    throw new ApiError(
      500,
      `BNS catalog is missing section ${payload.primarySectionNumber}.`,
    );
  }

  const alternativeSections = payload.alternatives.map((a) => ({
    sectionNumber: a.sectionNumber,
    title: a.title ?? a.sectionNumber,
    confidence: a.confidence,
  }));

  return prisma.crimeClassification.upsert({
    where: { victimStatementId: statementId },
    update: {
      bnsSectionId: section.id,
      confidenceScore: payload.primaryConfidence,
      urgencyLevel: payload.urgencyLevel,
      urgencyReason: payload.urgencyReason,
      severityScore: payload.severityScore,
      alternativeSections,
      modelVersion: payload.modelVersion,
    },
    create: {
      victimStatementId: statementId,
      bnsSectionId: section.id,
      confidenceScore: payload.primaryConfidence,
      urgencyLevel: payload.urgencyLevel,
      urgencyReason: payload.urgencyReason,
      severityScore: payload.severityScore,
      alternativeSections,
      modelVersion: payload.modelVersion,
    },
    include: {
      bnsSection: true,
      victimStatement: true,
    },
  });
};

export const classifyVictimStatement = async (
  userId: string,
  statementId?: string,
) => {
  await ensureVictimCatalog();

  const statement = statementId
    ? await prisma.victimStatement.findFirst({
        where: { id: statementId, userId },
      })
    : await prisma.victimStatement.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

  if (!statement) {
    throw new ApiError(404, "No statement found to classify.");
  }

  const text = statement.rawText ?? statement.translatedText ?? "";
  const iso = languageEnumToIso(statement.language);

  if (!env.mlServiceUrl) {
    throw new ApiError(
      503,
      "ML_SERVICE_URL is not configured. The BNS classification service is required.",
    );
  }

  const payload = await remoteClassifyText(text, iso);
  if (!payload) {
    throw new ApiError(
      503,
      "The ML classification service did not return a result. Ensure the Python ML service is running.",
    );
  }

  return persistVictimClassification(statement.id, payload);
};

export const getVictimResolution = async (
  statementId: string,
  userId: string,
) => {
  const statement = await prisma.victimStatement.findFirst({
    where: { id: statementId, userId },
    include: {
      classification: {
        include: { bnsSection: true },
      },
    },
  });

  if (!statement?.classification?.bnsSection) {
    throw new ApiError(404, "No classification found for this statement.");
  }

  const section = statement.classification.bnsSection;
  const imprisonment = formatImprisonmentRange(section);
  const fine = formatFineRange(section);

  return {
    sectionNumber: section.sectionNumber,
    sectionTitle: section.sectionTitle,
    punishmentRange: imprisonment,
    fineRange: fine,
    compensationNote:
      section.compensationNote ??
      "Compensation depends on the court order, documented loss, and victim impact.",
    expectedNextSteps: [
      "Carry identity proof and supporting evidence to the police station.",
      "Ask for your FIR copy or acknowledgment number.",
      "Preserve screenshots, medical papers, recordings, or payment receipts.",
    ],
  };
};
