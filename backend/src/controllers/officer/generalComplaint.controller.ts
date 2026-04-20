import type { IncomingMessage, ServerResponse } from "node:http";
import { Role } from "../../generated/prisma/enums";
import { getAuthenticatedUser } from "../../middleware/auth.middleware";
import { sendJson } from "../../server.shared";
import { ApiError } from "../../utils/ApiError";
import { OfficerGeneralComplaintService } from "../../services/officer/generalComplaint.service";

export class GeneralComplaintController {
  static async listPending(req: IncomingMessage, res: ServerResponse) {
    const user = await getAuthenticatedUser(req, [Role.OFFICER]);
    const rows = await OfficerGeneralComplaintService.listPendingForOfficer(
      user.id,
    );

    sendJson(res, 200, {
      success: true,
      data: rows,
      count: rows.length,
    });
  }

  static async decide(
    req: IncomingMessage,
    res: ServerResponse,
    body: Record<string, unknown>,
  ) {
    const user = await getAuthenticatedUser(req, [Role.OFFICER]);
    const firId = String(body.firId ?? "").trim();
    const decision = String(body.decision ?? "").toUpperCase();
    const note = body.note ? String(body.note) : undefined;

    if (!firId) {
      throw new ApiError(400, "firId is required.");
    }
    if (decision !== "GENERAL" && decision !== "FIR") {
      throw new ApiError(400, "decision must be either GENERAL or FIR.");
    }

    const result = await OfficerGeneralComplaintService.decideComplaint(
      user.id,
      firId,
      decision,
      note,
    );

    sendJson(res, 200, {
      success: true,
      data: result,
      message:
        decision === "FIR"
          ? "Complaint converted to FIR successfully."
          : "Complaint marked as general complaint.",
    });
  }
}
