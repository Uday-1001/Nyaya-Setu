"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitVictimStatementToStation = exports.getLatestVictimStatement = exports.createVictimStatement = exports.victimLanguageFromCode = exports.languageEnumToIso = void 0;
const enums_1 = require("../../generated/prisma/enums");
const database_1 = require("../../config/database");
const ApiError_1 = require("../../utils/ApiError");
const catalog_service_1 = require("./catalog.service");
const languageEnumToIso = (lang) => {
    if (lang === enums_1.Language.HINDI)
        return "hi";
    return "en";
};
exports.languageEnumToIso = languageEnumToIso;
const firNumber_1 = require("../../utils/firNumber");
const victimLanguageFromCode = (code) => {
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
    };
    if (!code)
        return enums_1.Language.ENGLISH;
    return languageMap[code.trim().toLowerCase()] ?? enums_1.Language.ENGLISH;
};
exports.victimLanguageFromCode = victimLanguageFromCode;
const createVictimStatement = async (userId, payload) => {
    await (0, catalog_service_1.ensureVictimCatalog)();
    if (!payload.rawText.trim()) {
        throw new ApiError_1.ApiError(400, "Statement text is required.");
    }
    const accusedPersonName = payload.accusedPersonName?.trim();
    if (!accusedPersonName) {
        throw new ApiError_1.ApiError(400, "Name of the person against whom FIR is being lodged is required.");
    }
    const accusedAddress = payload.accusedAddress?.trim();
    if (!accusedAddress) {
        throw new ApiError_1.ApiError(400, "Address of the person against whom FIR is being lodged is required.");
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
    return database_1.prisma.victimStatement.create({
        data: {
            userId,
            rawText: rawTextWithAccused,
            translatedText: payload.translatedText?.trim() || null,
            language: (0, exports.victimLanguageFromCode)(payload.language),
            incidentDate: payload.incidentDate
                ? new Date(payload.incidentDate)
                : null,
            incidentTime: payload.incidentTime?.trim() || null,
            incidentLocation: payload.incidentLocation?.trim() || null,
            witnessDetails: payload.witnessDetails?.trim() || null,
        },
    });
};
exports.createVictimStatement = createVictimStatement;
const getLatestVictimStatement = async (userId) => database_1.prisma.victimStatement.findFirst({
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
exports.getLatestVictimStatement = getLatestVictimStatement;
const submitVictimStatementToStation = async (userId, payload) => {
    await (0, catalog_service_1.ensureVictimCatalog)();
    const stationId = payload.stationId?.trim();
    if (!stationId) {
        throw new ApiError_1.ApiError(400, "stationId is required.");
    }
    const station = await database_1.prisma.policeStation.findUnique({
        where: { id: stationId },
    });
    if (!station) {
        throw new ApiError_1.ApiError(404, "Selected police station was not found.");
    }
    const statement = payload.statementId
        ? await database_1.prisma.victimStatement.findFirst({
            where: { id: payload.statementId, userId },
            include: { classification: true },
        })
        : await database_1.prisma.victimStatement.findFirst({
            where: { userId },
            include: { classification: true },
            orderBy: { createdAt: "desc" },
        });
    if (!statement) {
        throw new ApiError_1.ApiError(404, "No victim statement found to submit.");
    }
    if (statement.firId) {
        const existingFir = await database_1.prisma.fIR.findUnique({
            where: { id: statement.firId },
            include: { station: true, bnsSections: true },
        });
        if (existingFir) {
            return { fir: existingFir, alreadySubmitted: true };
        }
    }
    const statementText = (statement.rawText ??
        statement.translatedText ??
        "").trim();
    if (!statementText) {
        throw new ApiError_1.ApiError(400, "The selected statement is empty and cannot be sent.");
    }
    const fir = await database_1.prisma.$transaction(async (tx) => {
        const firNumber = await (0, firNumber_1.generateUniqueFirNumber)(tx);
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
                incidentLocation: statement.incidentLocation?.trim() || "Location to be confirmed",
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
exports.submitVictimStatementToStation = submitVictimStatementToStation;
