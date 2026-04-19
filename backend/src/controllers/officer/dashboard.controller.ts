import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuthenticatedUser } from "../../middleware/auth.middleware";
import { Role } from "../../generated/prisma/enums";
import { OfficerPortalService } from "../../services/officer/portal.service";
import { sendJson } from "../../server.shared";

export class OfficerDashboardController {
  static async getDashboard(req: IncomingMessage, res: ServerResponse) {
    const user = await getAuthenticatedUser(req, [Role.OFFICER]);
    const dashboard = await OfficerPortalService.getDashboard(user.id);

    sendJson(res, 200, {
      success: true,
      data: dashboard,
    });
  }

  static async getProfile(req: IncomingMessage, res: ServerResponse) {
    const user = await getAuthenticatedUser(req, [Role.OFFICER]);
    const profile = await OfficerPortalService.getOfficerProfile(user.id);

    sendJson(res, 200, {
      success: true,
      data: profile,
    });
  }

  static async updateProfile(
    req: IncomingMessage,
    res: ServerResponse,
    body: {
      name?: string;
      phone?: string;
      preferredLang?:
        | "ENGLISH"
        | "HINDI"
        | "BHOJPURI"
        | "MARATHI"
        | "TAMIL"
        | "TELUGU"
        | "BENGALI"
        | "GUJARATI"
        | "KANNADA"
        | "MALAYALAM"
        | "PUNJABI"
        | "ODIA";
    },
  ) {
    const user = await getAuthenticatedUser(req, [Role.OFFICER]);
    const profile = await OfficerPortalService.updateOfficerProfile(user.id, {
      name: body.name,
      phone: body.phone,
      preferredLang: body.preferredLang,
    });

    sendJson(res, 200, {
      success: true,
      data: profile,
      message: "Officer profile updated successfully.",
    });
  }

  static async requestReverification(
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const user = await getAuthenticatedUser(req, [Role.OFFICER]);
    const profile = await OfficerPortalService.requestReverification(user.id);

    sendJson(res, 200, {
      success: true,
      data: profile,
      message: "Re-verification request submitted successfully.",
    });
  }
}
