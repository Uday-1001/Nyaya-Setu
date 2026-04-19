"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrimeClassificationService = void 0;
const database_1 = require("../../config/database");
const ApiError_1 = require("../../utils/ApiError");
const complaint_service_1 = require("../victim/complaint.service");
class CrimeClassificationService {
    /**
     * Classify a statement through the external ML pipeline and persist the result.
     */
    static async classifyFromStatement(victimStatementId) {
        const statement = await database_1.prisma.victimStatement.findUnique({
            where: { id: victimStatementId },
            include: { classification: true },
        });
        if (!statement) {
            throw new ApiError_1.ApiError(404, "Victim statement not found");
        }
        if (statement.classification) {
            throw new ApiError_1.ApiError(400, "Classification already exists for this statement");
        }
        return (0, complaint_service_1.classifyVictimStatement)(statement.userId, statement.id);
    }
    /**
     * Get classification for a statement
     */
    static async getClassification(classificationId) {
        return database_1.prisma.crimeClassification.findUnique({
            where: { id: classificationId },
            include: {
                bnsSection: true,
                victimStatement: true,
            },
        });
    }
    /**
     * Get classification by victim statement
     */
    static async getClassificationByStatement(victimStatementId) {
        return database_1.prisma.crimeClassification.findUnique({
            where: { victimStatementId },
            include: {
                bnsSection: true,
                victimStatement: true,
            },
        });
    }
    /**
     * Update classification with officers notes/updates
     */
    static async updateClassificationScore(classificationId, confidenceScore, urgencyLevel) {
        const classification = await database_1.prisma.crimeClassification.findUnique({
            where: { id: classificationId },
        });
        if (!classification) {
            throw new ApiError_1.ApiError(404, "Classification not found");
        }
        return database_1.prisma.crimeClassification.update({
            where: { id: classificationId },
            data: {
                confidenceScore,
                urgencyLevel: urgencyLevel,
            },
            include: {
                bnsSection: true,
                victimStatement: true,
            },
        });
    }
}
exports.CrimeClassificationService = CrimeClassificationService;
