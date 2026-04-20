"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneralComplaintController = void 0;
const enums_1 = require("../../generated/prisma/enums");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const server_shared_1 = require("../../server.shared");
const ApiError_1 = require("../../utils/ApiError");
const generalComplaint_service_1 = require("../../services/officer/generalComplaint.service");
class GeneralComplaintController {
    static async listPending(req, res) {
        const user = await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.OFFICER]);
        const rows = await generalComplaint_service_1.OfficerGeneralComplaintService.listPendingForOfficer(user.id);
        (0, server_shared_1.sendJson)(res, 200, {
            success: true,
            data: rows,
            count: rows.length,
        });
    }
    static async decide(req, res, body) {
        const user = await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.OFFICER]);
        const firId = String(body.firId ?? "").trim();
        const decision = String(body.decision ?? "").toUpperCase();
        const note = body.note ? String(body.note) : undefined;
        if (!firId) {
            throw new ApiError_1.ApiError(400, "firId is required.");
        }
        if (decision !== "GENERAL" && decision !== "FIR") {
            throw new ApiError_1.ApiError(400, "decision must be either GENERAL or FIR.");
        }
        const result = await generalComplaint_service_1.OfficerGeneralComplaintService.decideComplaint(user.id, firId, decision, note);
        (0, server_shared_1.sendJson)(res, 200, {
            success: true,
            data: result,
            message: decision === "FIR"
                ? "Complaint converted to FIR successfully."
                : "Complaint marked as general complaint.",
        });
    }
}
exports.GeneralComplaintController = GeneralComplaintController;
