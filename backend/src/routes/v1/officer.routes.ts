import type { RouteDefinition } from "../types";
import { asyncHandler } from "../../utils/asyncHandler";
import { FIRController } from "../../controllers/officer/fir.controller";
import { OfficerDashboardController } from "../../controllers/officer/dashboard.controller";
import { OfficerRecordingController } from "../../controllers/officer/recording.controller";

export const officerRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/officer/dashboard",
    handler: asyncHandler(OfficerDashboardController.getDashboard),
  },
  {
    method: "GET",
    path: "/api/officer/profile",
    handler: asyncHandler(OfficerDashboardController.getProfile),
  },
  {
    method: "PUT",
    path: "/api/officer/profile",
    handler: asyncHandler(OfficerDashboardController.updateProfile),
  },
  {
    method: "POST",
    path: "/api/officer/profile/reverify-request",
    handler: asyncHandler(OfficerDashboardController.requestReverification),
  },

  // FIR Management
  {
    method: "POST",
    path: "/api/officer/fir/generate-from-recording",
    handler: asyncHandler(FIRController.generateFIRFromRecording),
  },
  {
    method: "POST",
    path: "/api/officer/fir/create",
    handler: asyncHandler(FIRController.createFIR),
  },
  {
    method: "PUT",
    path: "/api/officer/fir/update",
    handler: asyncHandler(FIRController.updateFIR),
  },
  {
    method: "POST",
    path: "/api/officer/fir/submit",
    handler: asyncHandler(FIRController.submitFIR),
  },
  {
    method: "POST",
    path: "/api/officer/fir/:firId/summary",
    handler: asyncHandler(FIRController.generateSummary),
  },
  {
    method: "GET",
    path: "/api/officer/fir/:firId/pdf",
    handler: asyncHandler(FIRController.downloadPDF),
  },
  {
    method: "DELETE",
    path: "/api/officer/fir/:firId/statements",
    handler: asyncHandler(FIRController.clearSavedStatements),
  },
  {
    method: "DELETE",
    path: "/api/officer/fir/:firId",
    handler: asyncHandler(FIRController.deleteFIR),
  },
  {
    method: "GET",
    path: "/api/officer/fir/:firId",
    handler: asyncHandler(FIRController.getFIR),
  },
  {
    method: "GET",
    path: "/api/officer/firs",
    handler: asyncHandler(FIRController.getFIRsByStation),
  },

  // Voice Recording
  {
    method: "GET",
    path: "/api/officer/voice-recordings",
    handler: asyncHandler(OfficerRecordingController.listRecordings),
  },
  {
    method: "GET",
    path: "/api/officer/voice-recordings/:recordingId",
    handler: asyncHandler(OfficerRecordingController.getRecording),
  },
  {
    method: "GET",
    path: "/api/officer/voice-recordings/:recordingId/audio",
    handler: asyncHandler(OfficerRecordingController.streamAudio),
  },
  {
    method: "POST",
    path: "/api/officer/voice-recordings/:recordingId/verify",
    handler: asyncHandler(OfficerRecordingController.verifyRecording),
  },
  {
    method: "DELETE",
    path: "/api/officer/voice-recordings/:recordingId",
    handler: asyncHandler(OfficerRecordingController.deleteRecording),
  },
  {
    method: "POST",
    path: "/api/officer/voice-recording/upload",
    handler: asyncHandler(FIRController.uploadVoiceRecording),
  },

  // Evidence Checklist
  {
    method: "GET",
    path: "/api/officer/fir/:firId/checklist",
    handler: asyncHandler(FIRController.getEvidenceChecklist),
  },
  {
    method: "POST",
    path: "/api/officer/evidence/collect",
    handler: asyncHandler(FIRController.markEvidenceCollected),
  },

  // Case Updates
  {
    method: "POST",
    path: "/api/officer/case-update/add",
    handler: asyncHandler(FIRController.addCaseUpdate),
  },

  // Anomaly Detection
  {
    method: "POST",
    path: "/api/officer/fir/analyze-anomalies",
    handler: asyncHandler(FIRController.getAnomalyAnalysis),
  },
];
