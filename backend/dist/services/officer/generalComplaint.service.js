"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficerGeneralComplaintService = void 0;
const database_1 = require("../../config/database");
const ApiError_1 = require("../../utils/ApiError");
const firNumber_1 = require("../../utils/firNumber");
const GENERAL_COMPLAINT_PREFIX = "GENERAL_COMPLAINT::";
const parseMeta = (value) => {
    if (!value || !value.startsWith(GENERAL_COMPLAINT_PREFIX))
        return null;
    const raw = value.slice(GENERAL_COMPLAINT_PREFIX.length);
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const serializeMeta = (meta) => `${GENERAL_COMPLAINT_PREFIX}${JSON.stringify(meta)}`;
class OfficerGeneralComplaintService {
    static async listPendingForOfficer(officerUserId) {
        const officer = await database_1.prisma.officer.findUnique({
            where: { userId: officerUserId },
            select: { id: true, stationId: true },
        });
        if (!officer) {
            throw new ApiError_1.ApiError(403, "Officer profile not found.");
        }
        const complaints = await database_1.prisma.fIR.findMany({
            where: {
                stationId: officer.stationId,
                status: "DRAFT",
                aiGeneratedSummary: { startsWith: GENERAL_COMPLAINT_PREFIX },
            },
            include: {
                victim: { select: { id: true, name: true, phone: true, email: true } },
                station: { select: { id: true, name: true, district: true } },
                bnsSections: { select: { sectionNumber: true, sectionTitle: true } },
                caseUpdates: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ urgencyLevel: "desc" }, { createdAt: "asc" }],
        });
        return complaints.map((complaint) => {
            const meta = parseMeta(complaint.aiGeneratedSummary);
            return {
                ...complaint,
                complaintMeta: meta,
            };
        });
    }
    static async decideComplaint(officerUserId, firId, decision, officerNote) {
        const officer = await database_1.prisma.officer.findUnique({
            where: { userId: officerUserId },
            select: { id: true, stationId: true },
        });
        if (!officer) {
            throw new ApiError_1.ApiError(403, "Officer profile not found.");
        }
        const fir = await database_1.prisma.fIR.findFirst({
            where: {
                id: firId,
                stationId: officer.stationId,
            },
        });
        if (!fir) {
            throw new ApiError_1.ApiError(404, "General complaint not found for this station.");
        }
        const meta = parseMeta(fir.aiGeneratedSummary);
        if (!meta) {
            throw new ApiError_1.ApiError(400, "Selected record is not a general complaint.");
        }
        if (meta.stage !== "PENDING_OFFICER_DECISION") {
            throw new ApiError_1.ApiError(409, "Complaint has already been decided.");
        }
        const nextMeta = {
            ...meta,
            stage: decision === "FIR" ? "ESCALATED_TO_FIR" : "CLOSED_AS_GENERAL",
            decision,
            decidedByOfficerId: officer.id,
            decidedAt: new Date().toISOString(),
            officerNote: officerNote?.trim() || undefined,
        };
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const acknowledgmentNo = decision === "FIR"
                ? fir.acknowledgmentNo ||
                    `ACK-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
                : fir.acknowledgmentNo;
            const firNumber = fir.firNumber || (await (0, firNumber_1.generateUniqueFirNumber)(tx));
            const updatedFir = await tx.fIR.update({
                where: { id: fir.id },
                data: {
                    firNumber,
                    officerId: officer.id,
                    acknowledgmentNo,
                    officerSignedAt: decision === "FIR" ? new Date() : fir.officerSignedAt,
                    status: decision === "FIR" ? "ACKNOWLEDGED" : "REJECTED",
                    aiGeneratedSummary: serializeMeta(nextMeta),
                },
                include: {
                    victim: { select: { id: true, name: true, phone: true } },
                    station: { select: { id: true, name: true, district: true } },
                    bnsSections: { select: { sectionNumber: true, sectionTitle: true } },
                },
            });
            await tx.caseUpdate.create({
                data: {
                    firId: fir.id,
                    status: decision === "FIR" ? "ACKNOWLEDGED" : "REJECTED",
                    updatedById: officerUserId,
                    note: decision === "FIR"
                        ? `Officer accepted complaint as FIR.${officerNote?.trim() ? ` Note: ${officerNote.trim()}` : ""}`
                        : `Officer closed complaint as general complaint.${officerNote?.trim() ? ` Note: ${officerNote.trim()}` : ""}`,
                },
            });
            return updatedFir;
        });
        return {
            ...updated,
            complaintMeta: nextMeta,
        };
    }
}
exports.OfficerGeneralComplaintService = OfficerGeneralComplaintService;
