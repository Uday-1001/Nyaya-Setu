import { prisma } from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import type { CrimeClassification } from "../../generated/prisma/client";
import { classifyVictimStatement } from "../victim/complaint.service";

export class CrimeClassificationService {
  /**
   * Classify a statement through the external ML pipeline and persist the result.
   */
  static async classifyFromStatement(victimStatementId: string) {
    const statement = await prisma.victimStatement.findUnique({
      where: { id: victimStatementId },
      include: { classification: true },
    });

    if (!statement) {
      throw new ApiError(404, "Victim statement not found");
    }

    if (statement.classification) {
      throw new ApiError(
        400,
        "Classification already exists for this statement",
      );
    }

    return classifyVictimStatement(statement.userId, statement.id);
  }

  /**
   * Get classification for a statement
   */
  static async getClassification(
    classificationId: string,
  ): Promise<CrimeClassification | null> {
    return prisma.crimeClassification.findUnique({
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
  static async getClassificationByStatement(victimStatementId: string) {
    return prisma.crimeClassification.findUnique({
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
  static async updateClassificationScore(
    classificationId: string,
    confidenceScore: number,
    urgencyLevel?: string,
  ): Promise<CrimeClassification> {
    const classification = await prisma.crimeClassification.findUnique({
      where: { id: classificationId },
    });

    if (!classification) {
      throw new ApiError(404, "Classification not found");
    }

    return prisma.crimeClassification.update({
      where: { id: classificationId },
      data: {
        confidenceScore,
        urgencyLevel: urgencyLevel as any,
      },
      include: {
        bnsSection: true,
        victimStatement: true,
      },
    });
  }
}
