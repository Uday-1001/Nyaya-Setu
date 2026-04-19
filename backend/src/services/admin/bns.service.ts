import { prisma } from "../../config/database";
import { remoteBnssCatalog } from "../ml/mlClient";

export const listAdminBnsSections = async (query?: string) =>
  prisma.bNSSection.findMany({
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

export const listAdminBnssSections = async (query?: string) => {
  const rows = await remoteBnssCatalog();
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
  return normalized.filter(
    (sec) =>
      sec.sectionNumber.toLowerCase().includes(q) ||
      sec.sectionTitle.toLowerCase().includes(q) ||
      (sec.crpcEquivalent ?? "").toLowerCase().includes(q) ||
      sec.description.toLowerCase().includes(q),
  );
};
