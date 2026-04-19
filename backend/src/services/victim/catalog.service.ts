import { ApiError } from "../../utils/ApiError";
import { CrimeCategory, Language } from "../../generated/prisma/enums";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { remoteCatalog } from "../ml/mlClient";

const CATALOG_UPDATE_BATCH_SIZE = 40;
const MIN_CATALOG_SECTION_COUNT = 300;

const asCrimeCategory = (raw: string): CrimeCategory => {
  const key = raw.trim().toUpperCase();
  if (key === CrimeCategory.VIOLENT) return CrimeCategory.VIOLENT;
  if (key === CrimeCategory.PROPERTY) return CrimeCategory.PROPERTY;
  if (key === CrimeCategory.CYBERCRIME) return CrimeCategory.CYBERCRIME;
  if (key === CrimeCategory.DOMESTIC_VIOLENCE)
    return CrimeCategory.DOMESTIC_VIOLENCE;
  if (key === CrimeCategory.FINANCIAL_FRAUD)
    return CrimeCategory.FINANCIAL_FRAUD;
  if (key === CrimeCategory.SEXUAL_OFFENSE) return CrimeCategory.SEXUAL_OFFENSE;
  if (key === CrimeCategory.PUBLIC_ORDER) return CrimeCategory.PUBLIC_ORDER;
  if (key === CrimeCategory.DRUG_OFFENSE) return CrimeCategory.DRUG_OFFENSE;
  return CrimeCategory.OTHER;
};

export const ensureVictimCatalog = async () => {
  // Sync BNS catalog from the trained ML artifacts (no local hardcoded mapping file).
  const existingCount = await prisma.bNSSection.count();
  if (existingCount < MIN_CATALOG_SECTION_COUNT) {
    if (!env.mlServiceUrl) {
      throw new ApiError(
        503,
        "ML_SERVICE_URL is not configured. Catalog synchronization requires the ML service.",
      );
    }

    console.log(
      "[Catalog] Synchronizing trained ML catalog into PostgreSQL...",
    );
    const defaultSections = await remoteCatalog();
    if (!defaultSections || defaultSections.length === 0) {
      throw new ApiError(
        503,
        "ML catalog endpoint did not return any BNS sections. Ensure ml-service is running and trained.",
      );
    }

    const mappedSections = defaultSections.map((section) => ({
      sectionNumber: section.sectionNumber.trim(),
      sectionTitle: section.sectionTitle,
      description: section.description,
      category: asCrimeCategory(section.category),
      ipcEquivalent: section.ipcEquivalent ?? null,
      ipcTitle: section.ipcTitle ?? null,
      ipcDescription: section.ipcDescription ?? null,
      isBailable: section.isBailable ?? false,
      isCognizable: section.isCognizable ?? true,
      isCompoundable: section.isCompoundable ?? false,
      mappingReasoning: section.mappingReasoning ?? null,
    }));

    // Insert new records in one fast non-transactional bulk call.
    await prisma.bNSSection.createMany({
      data: mappedSections,
      skipDuplicates: true,
    });

    // Update existing rows in small batches to avoid DB transaction startup timeouts.
    for (let i = 0; i < mappedSections.length; i += CATALOG_UPDATE_BATCH_SIZE) {
      const batch = mappedSections.slice(i, i + CATALOG_UPDATE_BATCH_SIZE);
      await Promise.all(
        batch.map((section) =>
          prisma.bNSSection.update({
            where: { sectionNumber: section.sectionNumber },
            data: {
              sectionTitle: section.sectionTitle,
              description: section.description,
              category: section.category,
              ipcEquivalent: section.ipcEquivalent,
              ipcTitle: section.ipcTitle,
              ipcDescription: section.ipcDescription,
              isBailable: section.isBailable,
              isCognizable: section.isCognizable,
              isCompoundable: section.isCompoundable,
              mappingReasoning: section.mappingReasoning,
            },
          }),
        ),
      );
    }

    console.log(
      `[Catalog] BNS synchronization complete (${defaultSections.length} sections).`,
    );
  }

  const stationCount = await prisma.policeStation.count();
  if (stationCount === 0) {
    await prisma.policeStation.createMany({
      data: [
        {
          name: "Andheri East Police Station",
          stationCode: "MH-ANDHERI-E",
          address: "Andheri East, Mumbai",
          district: "Mumbai Suburban",
          state: "Maharashtra",
          pincode: "400069",
          latitude: 19.1136,
          longitude: 72.8697,
          phone: "02226830123",
          email: "andherieast@police.gov.in",
          jurisdictionArea: "Andheri East and MIDC belt",
        },
        {
          name: "Connaught Place Police Station",
          stationCode: "DL-CP-01",
          address: "Connaught Place, New Delhi",
          district: "New Delhi",
          state: "Delhi",
          pincode: "110001",
          latitude: 28.6315,
          longitude: 77.2167,
          phone: "01123456789",
          email: "cpstation@police.gov.in",
          jurisdictionArea: "Connaught Place and nearby circles",
        },
        {
          name: "T Nagar Police Station",
          stationCode: "TN-TNAGAR",
          address: "T Nagar, Chennai",
          district: "Chennai",
          state: "Tamil Nadu",
          pincode: "600017",
          latitude: 13.0418,
          longitude: 80.2337,
          phone: "04428150111",
          email: "tnagar@police.gov.in",
          jurisdictionArea: "T Nagar and adjoining residential areas",
        },
      ],
    });
  }

  const rightsCount = await prisma.rightsExplainer.count();
  if (rightsCount === 0) {
    const sections = await prisma.bNSSection.findMany({ take: 5 });
    await Promise.all(
      sections.map((section) =>
        prisma.rightsExplainer.create({
          data: {
            bnsSectionId: section.id,
            title: `${section.sectionNumber} Victim Rights Guide`,
            content:
              section.victimsRightsNote ??
              "Victims are entitled to FIR acknowledgment, updates, and respectful recording of their complaint.",
            legalBasis: section.ipcEquivalent
              ? `Earlier linked to IPC ${section.ipcEquivalent}`
              : null,
            language: Language.ENGLISH,
          },
        }),
      ),
    );
  }
};
