"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficerSectionController = void 0;
const auth_middleware_1 = require("../../middleware/auth.middleware");
const enums_1 = require("../../generated/prisma/enums");
const bnsipc_translator_1 = require("../../services/bns/bnsipc.translator");
const server_shared_1 = require("../../server.shared");
class OfficerSectionController {
    static async search(req, res, body) {
        await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.OFFICER]);
        const query = String(body.q ?? body.query ?? "").trim();
        const sections = await bnsipc_translator_1.BNSIPCTranslatorService.searchBNSSection(query);
        (0, server_shared_1.sendJson)(res, 200, {
            success: true,
            data: sections,
            count: sections.length,
        });
    }
    static async getBySectionNumber(req, res, body) {
        await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.OFFICER]);
        const sectionNumber = String(body.sectionNumber ?? "").trim();
        const section = await bnsipc_translator_1.BNSIPCTranslatorService.getBNSSectionByNumber(sectionNumber);
        (0, server_shared_1.sendJson)(res, 200, {
            success: true,
            data: section,
        });
    }
    static async analyzeComplaint(req, res, body) {
        try {
            await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.OFFICER]);
            const complaint = String(body.complaint ?? body.rawComplaintText ?? "").trim();
            const language = String(body.language ?? "hi").trim();
            console.log("[Section Controller] analyzeComplaint called");
            console.log("[Section Controller] complaint:", complaint.substring(0, 50));
            console.log("[Section Controller] language:", language);
            if (!complaint) {
                console.log("[Section Controller] Complaint is empty");
                (0, server_shared_1.sendJson)(res, 400, {
                    success: false,
                    error: "Complaint text is required",
                });
                return;
            }
            console.log("[Section Controller] Calling BNSIPCTranslatorService.analyzeComplaintWithML");
            const result = await bnsipc_translator_1.BNSIPCTranslatorService.analyzeComplaintWithML(complaint, language);
            console.log("[Section Controller] Analysis result:", {
                sectionsCount: result.sections.length,
                urgency: result.urgencyLevel,
            });
            (0, server_shared_1.sendJson)(res, 200, {
                success: true,
                data: {
                    sections: result.sections,
                    urgencyLevel: result.urgencyLevel,
                    transcript: result.transcript,
                    mlAnalysis: {
                        primarySection: result.mlResponse.primary_section_number,
                        severityScore: result.mlResponse.severity_score,
                        urgencyReason: result.mlResponse.urgency_reason,
                        victimRights: result.mlResponse.victim_rights,
                    },
                },
            });
        }
        catch (error) {
            console.error("[Section Controller] analyzeComplaint Error:", error);
            throw error;
        }
    }
}
exports.OfficerSectionController = OfficerSectionController;
