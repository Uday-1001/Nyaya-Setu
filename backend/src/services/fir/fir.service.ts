import { prisma } from "../../config/database";
import { ApiError } from "../../utils/ApiError";
import { FIRStatus, UrgencyLevel, Role } from "../../generated/prisma/enums";
import type { FIR, BNSSection } from "../../generated/prisma/client";
import { generateUniqueFirNumber } from "../../utils/firNumber";

export interface CreateFIRInput {
  victimId: string;
  stationId: string;
  incidentDate: Date;
  incidentTime?: string;
  incidentLocation: string;
  accusedPersonName: string;
  accusedAddress: string;
  assetsDescription?: string;
  incidentDescription: string;
  bnsSectionIds?: string[];
  urgencyLevel?: UrgencyLevel;
}

export interface CreateOfficerDraftFIRInput {
  /** The officer's own user ID — used as a placeholder victimId for officer-generated drafts */
  officerUserId: string;
  stationId: string;
  incidentDate: Date;
  incidentLocation: string;
  incidentDescription: string;
  bnsSectionIds?: string[];
  urgencyLevel?: UrgencyLevel;
  /** Optionally link the originating voice recording */
  voiceRecordingId?: string;
}

export interface UpdateFIRInput {
  incidentDate?: Date;
  incidentTime?: string;
  incidentLocation?: string;
  incidentDescription?: string;
  status?: FIRStatus;
  urgencyLevel?: UrgencyLevel;
}

export class FIRService {
  private static async ensureFirNumber<
    T extends { id: string; firNumber: string | null },
  >(fir: T, db: typeof prisma = prisma): Promise<T> {
    if (fir.firNumber) {
      return fir;
    }

    const firNumber = await generateUniqueFirNumber(db);
    const updated = await db.fIR.update({
      where: { id: fir.id },
      data: { firNumber },
      select: { firNumber: true },
    });

    return {
      ...fir,
      firNumber: updated.firNumber,
    };
  }

  static async createFIR(input: CreateFIRInput): Promise<FIR> {
    // Validate victim exists
    const victim = await prisma.user.findUnique({
      where: { id: input.victimId },
    });

    if (!victim) {
      throw new ApiError(404, "Victim not found");
    }

    if (victim.role !== Role.VICTIM) {
      throw new ApiError(400, "User must be a victim to file an FIR");
    }

    // Validate station exists
    const station = await prisma.policeStation.findUnique({
      where: { id: input.stationId },
    });

    if (!station) {
      throw new ApiError(404, "Police station not found");
    }

    const accusedPersonName = input.accusedPersonName?.trim();
    if (!accusedPersonName) {
      throw new ApiError(
        400,
        "Name of the person against whom FIR is being lodged is required",
      );
    }

    const accusedAddress = input.accusedAddress?.trim();
    if (!accusedAddress) {
      throw new ApiError(
        400,
        "Address of the person against whom FIR is being lodged is required",
      );
    }

    const assetsDescription = input.assetsDescription?.trim();

    const incidentDescription = input.incidentDescription?.trim() || "";
    if (!incidentDescription) {
      throw new ApiError(400, "Incident description is required");
    }

    const statementPrefix = [
      `Accused person name: ${accusedPersonName}`,
      `Accused person address: ${accusedAddress}`,
    ];
    if (assetsDescription) {
      statementPrefix.push(`Assets description: ${assetsDescription}`);
    }

    const incidentDescriptionWithAccused = `${statementPrefix.join("\n")}\n\n${incidentDescription}`;

    // Create FIR
    const firNumber = await generateUniqueFirNumber(prisma);

    const fir = await prisma.fIR.create({
      data: {
        firNumber,
        victimId: input.victimId,
        stationId: input.stationId,
        incidentDate: input.incidentDate,
        incidentTime: input.incidentTime,
        incidentLocation: input.incidentLocation,
        incidentDescription: incidentDescriptionWithAccused,
        urgencyLevel: input.urgencyLevel || UrgencyLevel.MEDIUM,
        status: FIRStatus.DRAFT,
        isOnlineFIR: true,
        bnsSections: input.bnsSectionIds
          ? {
              connect: input.bnsSectionIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        victim: true,
        station: true,
        bnsSections: true,
      },
    });

    return fir;
  }

  /**
   * Officer-generated draft FIR from a voice recording.
   * Uses the officer's own user record as the FIR owner (victim field)
   * since this is an officer-initiated draft directly from a voice statement.
   */
  static async createOfficerDraftFIR(
    input: CreateOfficerDraftFIRInput,
  ): Promise<FIR> {
    const officer = await prisma.user.findUnique({
      where: { id: input.officerUserId },
      include: { officer: { include: { station: true } } },
    });

    if (!officer) {
      throw new ApiError(404, "Officer user not found");
    }

    if (!officer.officer) {
      throw new ApiError(403, "User does not have an officer profile");
    }

    const stationId = input.stationId || officer.officer.stationId;

    const station = await prisma.policeStation.findUnique({
      where: { id: stationId },
    });

    if (!station) {
      throw new ApiError(404, "Police station not found");
    }

    const firNumber = await generateUniqueFirNumber(prisma);

    const fir = await prisma.fIR.create({
      data: {
        firNumber,
        // Link the FIR's victim to the officer's own user — acts as a placeholder for officer-generated drafts
        victimId: input.officerUserId,
        stationId,
        officerId: officer.officer.id,
        incidentDate: input.incidentDate,
        incidentLocation: input.incidentLocation,
        incidentDescription: input.incidentDescription,
        urgencyLevel: input.urgencyLevel || UrgencyLevel.MEDIUM,
        status: FIRStatus.DRAFT,
        isOnlineFIR: false,
        bnsSections: input.bnsSectionIds?.length
          ? { connect: input.bnsSectionIds.map((id) => ({ id })) }
          : undefined,
        // Link voice recording if provided
        voiceRecordings: input.voiceRecordingId
          ? { connect: { id: input.voiceRecordingId } }
          : undefined,
      },
      include: {
        victim: { select: { id: true, name: true, phone: true } },
        officer: {
          include: { user: { select: { name: true } }, station: true },
        },
        station: true,
        bnsSections: true,
        voiceRecordings: {
          include: { victimStatement: true },
        },
        caseUpdates: true,
        victimStatements: true,
      },
    });

    return fir;
  }

  static async updateFIR(firId: string, input: UpdateFIRInput): Promise<FIR> {
    const fir = await prisma.fIR.findUnique({ where: { id: firId } });

    if (!fir) {
      throw new ApiError(404, "FIR not found");
    }

    if (
      fir.status !== FIRStatus.DRAFT &&
      input.status &&
      input.status !== fir.status
    ) {
      throw new ApiError(400, "Can only change status from specific states");
    }

    if (
      fir.isOnlineFIR &&
      typeof input.incidentDescription === "string" &&
      input.incidentDescription.trim() !== fir.incidentDescription.trim()
    ) {
      throw new ApiError(
        400,
        "Online FIR victim statements are read-only and cannot be modified.",
      );
    }

    return prisma.fIR.update({
      where: { id: firId },
      data: input,
      include: {
        victim: true,
        officer: true,
        station: true,
        bnsSections: true,
        victimStatements: true,
        voiceRecordings: true,
      },
    });
  }

  static async submitFIR(firId: string, officerId: string): Promise<FIR> {
    const fir = await prisma.fIR.findUnique({ where: { id: firId } });

    if (!fir) {
      throw new ApiError(404, "FIR not found");
    }

    if (fir.status !== FIRStatus.DRAFT) {
      throw new ApiError(400, "Only draft FIRs can be submitted");
    }

    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
    });

    if (!officer) {
      throw new ApiError(404, "Officer not found");
    }

    const acknowledgmentNo = `ACK-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const firNumber = fir.firNumber ?? (await generateUniqueFirNumber(prisma));

    return prisma.fIR.update({
      where: { id: firId },
      data: {
        status: FIRStatus.ACKNOWLEDGED,
        officerId,
        acknowledgmentNo,
        firNumber,
        officerSignedAt: new Date(),
      },
      include: {
        victim: true,
        officer: true,
        station: true,
        bnsSections: true,
      },
    });
  }

  static async getFIR(firId: string): Promise<FIR | null> {
    const fir = await prisma.fIR.findUnique({
      where: { id: firId },
      include: {
        victim: true,
        officer: true,
        station: true,
        bnsSections: true,
        victimStatements: true,
        voiceRecordings: true,
        evidenceItems: true,
        caseUpdates: true,
        smsNotifications: true,
      },
    });

    return fir ? this.ensureFirNumber(fir) : null;
  }

  static async getFIRsByVictim(victimId: string, status?: FIRStatus) {
    const where: any = { victimId };
    if (status) {
      where.status = status;
    }

    const firs = await prisma.fIR.findMany({
      where,
      include: {
        officer: true,
        station: true,
        bnsSections: true,
        voiceRecordings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(firs.map((fir) => this.ensureFirNumber(fir)));
  }

  static async getFIRsByStation(stationId: string, status?: FIRStatus) {
    const where: any = { stationId };
    if (status) {
      where.status = status;
    }

    const firs = await prisma.fIR.findMany({
      where,
      include: {
        victim: true,
        officer: true,
        bnsSections: true,
        voiceRecordings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(firs.map((fir) => this.ensureFirNumber(fir)));
  }

  static async getFIRsByOfficer(officerId: string, status?: FIRStatus) {
    const where: any = { officerId };
    if (status) {
      where.status = status;
    }

    const firs = await prisma.fIR.findMany({
      where,
      include: {
        victim: true,
        station: true,
        bnsSections: true,
        voiceRecordings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(firs.map((fir) => this.ensureFirNumber(fir)));
  }

  static async trackFIRByAcknowledgment(acknowledgmentNo: string) {
    const fir = await prisma.fIR.findUnique({
      where: { acknowledgmentNo },
      include: {
        victim: true,
        officer: true,
        station: true,
        bnsSections: true,
        caseUpdates: true,
      },
    });

    if (!fir) {
      throw new ApiError(404, "FIR not found with this acknowledgment number");
    }

    return this.ensureFirNumber(fir);
  }

  static async addCaseUpdate(
    firId: string,
    status: FIRStatus,
    note?: string,
    updatedById?: string,
  ) {
    const fir = await prisma.fIR.findUnique({ where: { id: firId } });

    if (!fir) {
      throw new ApiError(404, "FIR not found");
    }

    return prisma.caseUpdate.create({
      data: {
        firId,
        status,
        note,
        updatedById,
      },
    });
  }

  static async generateAIFIRSummary(
    firId: string,
    aiGeneratedSummary: string,
  ): Promise<FIR> {
    return prisma.fIR.update({
      where: { id: firId },
      data: { aiGeneratedSummary },
      include: {
        victim: true,
        officer: true,
        station: true,
        bnsSections: true,
      },
    });
  }

  static async clearSavedStatements(firId: string) {
    const fir = await prisma.fIR.findUnique({
      where: { id: firId },
      include: { victimStatements: true },
    });

    if (!fir) {
      throw new ApiError(404, "FIR not found");
    }

    if (fir.isOnlineFIR) {
      throw new ApiError(
        400,
        "Online FIR statements are read-only and cannot be cleared.",
      );
    }

    const deleted = await prisma.victimStatement.deleteMany({
      where: { firId },
    });

    await prisma.fIR.update({
      where: { id: firId },
      data: { aiGeneratedSummary: null },
    });

    return {
      firId,
      deletedCount: deleted.count,
    };
  }

  static async deleteFIR(firId: string) {
    const fir = await prisma.fIR.findUnique({ where: { id: firId } });
    if (!fir) {
      throw new ApiError(404, "FIR not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.caseUpdate.deleteMany({ where: { firId } });
      await tx.evidenceItem.deleteMany({ where: { firId } });
      await tx.sMSNotification.deleteMany({ where: { firId } });

      await tx.voiceRecording.updateMany({
        where: { firId },
        data: { firId: null },
      });

      await tx.victimStatement.updateMany({
        where: { firId },
        data: {
          firId: null,
          isUsedForFIR: false,
        },
      });

      await tx.fIR.delete({ where: { id: firId } });
    });

    return { firId };
  }
}
