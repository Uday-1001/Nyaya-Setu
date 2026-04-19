"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdminBnssSections = exports.listAdminBnsSections = void 0;
const database_1 = require("../../config/database");
const mlClient_1 = require("../ml/mlClient");
const listAdminBnsSections = async (query) => database_1.prisma.bNSSection.findMany({
    where: query
        ? {
            OR: [
                { sectionNumber: { contains: query, mode: "insensitive" } },
                { sectionTitle: { contains: query, mode: "insensitive" } },
                { ipcEquivalent: { contains: query, mode: "insensitive" } },
            ],
        }
        : undefined,
    orderBy: [{ sectionNumber: "asc" }],
    take: 100,
});
exports.listAdminBnsSections = listAdminBnsSections;
const listAdminBnssSections = async (query) => {
    const rows = await (0, mlClient_1.remoteBnssCatalog)();
    if (!rows) {
        return [];
    }
    const normalized = rows.map((row) => ({
        sectionNumber: row.sectionNumber,
        sectionTitle: row.sectionTitle,
        description: row.description,
        category: row.category,
        crpcEquivalent: row.crpcEquivalent ?? null,
        crpcTitle: row.crpcTitle ?? null,
        crpcDescription: row.crpcDescription ?? null,
        isBailable: row.isBailable ?? false,
        isCognizable: row.isCognizable ?? true,
        isCompoundable: row.isCompoundable ?? false,
        mappingReasoning: row.mappingReasoning ?? null,
    }));
    if (!query?.trim()) {
        return normalized;
    }
    const q = query.trim().toLowerCase();
    return normalized.filter((sec) => sec.sectionNumber.toLowerCase().includes(q) ||
        sec.sectionTitle.toLowerCase().includes(q) ||
        (sec.crpcEquivalent ?? "").toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q));
};
exports.listAdminBnssSections = listAdminBnssSections;
