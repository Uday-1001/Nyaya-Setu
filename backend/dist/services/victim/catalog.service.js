"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureVictimCatalog = void 0;
const ApiError_1 = require("../../utils/ApiError");
const enums_1 = require("../../generated/prisma/enums");
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const mlClient_1 = require("../ml/mlClient");
const CATALOG_UPDATE_BATCH_SIZE = 40;
const MIN_CATALOG_SECTION_COUNT = 300;
const asCrimeCategory = (raw) => {
    const key = raw.trim().toUpperCase();
    if (key === enums_1.CrimeCategory.VIOLENT)
        return enums_1.CrimeCategory.VIOLENT;
    if (key === enums_1.CrimeCategory.PROPERTY)
        return enums_1.CrimeCategory.PROPERTY;
    if (key === enums_1.CrimeCategory.CYBERCRIME)
        return enums_1.CrimeCategory.CYBERCRIME;
    if (key === enums_1.CrimeCategory.DOMESTIC_VIOLENCE)
        return enums_1.CrimeCategory.DOMESTIC_VIOLENCE;
    if (key === enums_1.CrimeCategory.FINANCIAL_FRAUD)
        return enums_1.CrimeCategory.FINANCIAL_FRAUD;
    if (key === enums_1.CrimeCategory.SEXUAL_OFFENSE)
        return enums_1.CrimeCategory.SEXUAL_OFFENSE;
    if (key === enums_1.CrimeCategory.PUBLIC_ORDER)
        return enums_1.CrimeCategory.PUBLIC_ORDER;
    if (key === enums_1.CrimeCategory.DRUG_OFFENSE)
        return enums_1.CrimeCategory.DRUG_OFFENSE;
    return enums_1.CrimeCategory.OTHER;
};
const ensureVictimCatalog = async () => {
    // Sync BNS catalog from the trained ML artifacts (no local hardcoded mapping file).
    const existingCount = await database_1.prisma.bNSSection.count();
    if (existingCount < MIN_CATALOG_SECTION_COUNT) {
        if (!env_1.env.mlServiceUrl) {
            throw new ApiError_1.ApiError(503, "ML_SERVICE_URL is not configured. Catalog synchronization requires the ML service.");
        }
        console.log("[Catalog] Synchronizing trained ML catalog into PostgreSQL...");
        const defaultSections = await (0, mlClient_1.remoteCatalog)();
        if (!defaultSections || defaultSections.length === 0) {
            throw new ApiError_1.ApiError(503, "ML catalog endpoint did not return any BNS sections. Ensure ml-service is running and trained.");
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
        await database_1.prisma.bNSSection.createMany({
            data: mappedSections,
            skipDuplicates: true,
        });
        // Update existing rows in small batches to avoid DB transaction startup timeouts.
        for (let i = 0; i < mappedSections.length; i += CATALOG_UPDATE_BATCH_SIZE) {
            const batch = mappedSections.slice(i, i + CATALOG_UPDATE_BATCH_SIZE);
            await Promise.all(batch.map((section) => database_1.prisma.bNSSection.update({
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
            })));
        }
        console.log(`[Catalog] BNS synchronization complete (${defaultSections.length} sections).`);
    }
    const stationCount = await database_1.prisma.policeStation.count();
    if (stationCount === 0) {
        await database_1.prisma.policeStation.createMany({
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
    const rightsCount = await database_1.prisma.rightsExplainer.count();
    if (rightsCount === 0) {
        const sections = await database_1.prisma.bNSSection.findMany({ take: 5 });
        await Promise.all(sections.map((section) => database_1.prisma.rightsExplainer.create({
            data: {
                bnsSectionId: section.id,
                title: `${section.sectionNumber} Victim Rights Guide`,
                content: section.victimsRightsNote ??
                    "Victims are entitled to FIR acknowledgment, updates, and respectful recording of their complaint.",
                legalBasis: section.ipcEquivalent
                    ? `Earlier linked to IPC ${section.ipcEquivalent}`
                    : null,
                language: enums_1.Language.ENGLISH,
            },
        })));
    }
};
exports.ensureVictimCatalog = ensureVictimCatalog;
