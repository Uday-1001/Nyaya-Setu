import api from "./api";
import type { MockFIR, TimelineEntry, VoiceRec } from "../data/officerMock";

type BackendFIRStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "UNDER_INVESTIGATION"
  | "CHARGESHEET_FILED"
  | "CLOSED"
  | "REJECTED";

type BackendUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type BackendBnsSection = {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  ipcEquivalent: string | null;
  ipcTitle: string | null;
  ipcDescription: string | null;
  description: string | null;
  mappingReasoning: string | null;
  maxImprisonmentMonths: number | null;
  isLifeOrDeath: boolean;
  isCognizable: boolean;
  isBailable: boolean;
};

type BackendVoiceRecording = {
  id: string;
  language: string;
  durationSecs: number | null;
  isVerified: boolean;
  recordedAt: string;
  transcript: string | null;
  fileUrl?: string;
  fir: { id: string; firNumber: string | null } | null;
  victimStatement?: { id: string; rawText: string | null } | null;
};

type BackendFIR = {
  id: string;
  firNumber: string | null;
  acknowledgmentNo: string | null;
  isOnlineFIR: boolean;
  urgencyLevel: BackendUrgency;
  status: BackendFIRStatus;
  createdAt: string;
  updatedAt: string;
  incidentDate: string;
  incidentLocation: string;
  incidentDescription: string;
  aiGeneratedSummary: string | null;
  officerSignedAt: string | null;
  victim: { name: string; phone: string };
  officer: {
    id: string;
    badgeNumber: string;
    rank: string;
  } | null;
  station: {
    name: string;
    district: string;
  } | null;
  victimStatements?: Array<{
    id: string;
    rawText: string | null;
    translatedText: string | null;
    language: string;
    incidentDate: string | null;
    incidentTime: string | null;
    incidentLocation: string | null;
    witnessDetails: string | null;
    createdAt: string;
  }>;
  bnsSections: BackendBnsSection[];
  voiceRecordings?: BackendVoiceRecording[];
  caseUpdates?: Array<{
    status: string;
    note: string | null;
    createdAt: string;
  }>;
};

type BackendGeneralComplaintMeta = {
  mode?: string;
  stage?: string;
  recommendation?: string;
  signatureDigest?: string;
  decision?: "GENERAL" | "FIR";
};

type DashboardResponse = {
  stats: {
    firsReceived: number;
    documentsPending: number;
    reviewedToday: number;
    voiceUnverified: number;
  };
  queue: BackendFIR[];
};

type OfficerProfileResponse = {
  id: string;
  badgeNumber: string;
  rank: string;
  department: string;
  cctnsId: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  station: { name: string; district: string; jurisdictionArea: string | null };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    preferredLang: string;
  };
  stats: { docsGenerated: number; firsHandled: number; voiceVerified: number };
};

const mapStatus = (status: BackendFIRStatus): MockFIR["status"] => {
  switch (status) {
    case "CHARGESHEET_FILED":
      return "Document Generated";
    case "CLOSED":
    case "REJECTED":
      return "Signed";
    case "ACKNOWLEDGED":
    case "UNDER_INVESTIGATION":
    case "SUBMITTED":
      return "Under Review";
    case "DRAFT":
    default:
      return "AI Ready";
  }
};

const parseGeneralComplaintMeta = (
  aiGeneratedSummary: string | null,
): BackendGeneralComplaintMeta | null => {
  if (!aiGeneratedSummary) return null;
  const prefix = "GENERAL_COMPLAINT::";
  if (!aiGeneratedSummary.startsWith(prefix)) return null;
  try {
    return JSON.parse(aiGeneratedSummary.slice(prefix.length));
  } catch {
    return null;
  }
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatDuration = (durationSecs: number | null | undefined) => {
  const total = Math.max(0, durationSecs ?? 0);
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const punishmentLine = (section?: BackendBnsSection) => {
  if (!section) return "As per applicable law";
  if (section.isLifeOrDeath) return "Life imprisonment or death";
  if (!section.maxImprisonmentMonths) return "Punishment to be determined";
  const years = Math.floor(section.maxImprisonmentMonths / 12);
  if (years > 0)
    return `Imprisonment up to ${years} year${years > 1 ? "s" : ""}`;
  return `Imprisonment up to ${section.maxImprisonmentMonths} months`;
};

const voiceLabel = (index: number) => `Recording ${index + 1}`;

const buildTimeline = (fir: BackendFIR): TimelineEntry[] => {
  const updates = fir.caseUpdates?.map((entry) => ({
    action: entry.note || `Status updated to ${entry.status}`,
    time: formatDateTime(entry.createdAt),
  }));

  if (updates && updates.length > 0) {
    return updates;
  }

  return [
    {
      action: "FIR received from victim portal",
      time: formatDateTime(fir.createdAt),
    },
    {
      action: "AI summary prepared for officer review",
      time: formatDateTime(fir.updatedAt),
    },
  ];
};

const mapFir = (fir: BackendFIR): MockFIR => {
  const complaintMeta = parseGeneralComplaintMeta(fir.aiGeneratedSummary);
  const isGeneralComplaint = Boolean(
    complaintMeta && complaintMeta.mode === "GENERAL_COMPLAINT",
  );
  const uiStatus: MockFIR["status"] =
    isGeneralComplaint && fir.status === "DRAFT"
      ? "General Review"
      : mapStatus(fir.status);

  const primarySection = fir.bnsSections[0];
  const voiceCount = fir.voiceRecordings?.length ?? 0;
  const verifiedVoice =
    fir.voiceRecordings?.some((recording) => recording.isVerified) ?? false;

  const statementHistory = (fir.victimStatements ?? []).map((statement) => ({
    id: statement.id,
    text:
      statement.rawText || statement.translatedText || fir.incidentDescription,
    language: statement.language,
    createdAt: formatDateTime(statement.createdAt),
    incidentDate: statement.incidentDate
      ? formatDateTime(statement.incidentDate)
      : "N/A",
    incidentTime: statement.incidentTime || "N/A",
    incidentLocation: statement.incidentLocation || fir.incidentLocation,
    witnessDetails: statement.witnessDetails || "N/A",
  }));

  return {
    id: fir.id,
    firNo: fir.firNumber || fir.acknowledgmentNo || fir.id,
    bnsCode: primarySection ? `§${primarySection.sectionNumber}` : "§—",
    bnsTitle: primarySection?.sectionTitle || "Pending section mapping",
    ipcEquiv: primarySection?.ipcEquivalent
      ? `§${primarySection.ipcEquivalent}`
      : "N/A",
    punishmentLine: punishmentLine(primarySection),
    cognizable: primarySection?.isCognizable ? "Cognizable" : "Non-Cognizable",
    bailable: primarySection?.isBailable ? "Bailable" : "Non-Bailable",
    urgency: fir.urgencyLevel,
    status: uiStatus,
    isOnlineFIR: fir.isOnlineFIR,
    received: formatDateTime(fir.createdAt),
    location: fir.incidentLocation,
    aiSummaryLine: fir.aiGeneratedSummary
      ? "AI summary ready for review"
      : "Awaiting AI summary",
    victimName: fir.victim.name,
    victimPhone: fir.victim.phone,
    incidentDate: formatDateTime(fir.incidentDate),
    statement: fir.incidentDescription,
    statementTags: ["Victim Portal", "Officer Review"].concat(
      fir.voiceRecordings?.length
        ? [`${voiceCount} voice recording${voiceCount > 1 ? "s" : ""}`]
        : [],
    ),
    aiSummaryDefault: fir.aiGeneratedSummary || fir.incidentDescription,
    voiceNote: `${voiceCount} voice recording${voiceCount === 1 ? "" : "s"}`,
    sectionMappings: fir.bnsSections.map((section) => ({
      sectionNumber: section.sectionNumber,
      sectionTitle: section.sectionTitle,
      ipcEquivalent: section.ipcEquivalent,
      ipcTitle: section.ipcTitle,
      reasoning: section.mappingReasoning,
      description: section.description,
      cognizable: section.isCognizable,
      bailable: section.isBailable,
    })),
    timeline: buildTimeline(fir),
    checklistVoiceOk: verifiedVoice,
    isGeneralComplaint,
    complaintRecommendation: complaintMeta?.recommendation ?? null,
    signatureOnFile: Boolean(complaintMeta?.signatureDigest),
    officerDetails: fir.officer
      ? {
          badgeNumber: fir.officer.badgeNumber,
          rank: fir.officer.rank,
          stationName: fir.station?.name || "N/A",
          district: fir.station?.district || "N/A",
        }
      : null,
    statementHistory,
  };
};

const mapVoiceRecording = (
  recording: BackendVoiceRecording,
  index: number,
): VoiceRec => ({
  id: recording.id,
  firId: recording.fir?.id,
  firNo: recording.fir?.firNumber || "Unlinked FIR",
  label: voiceLabel(index),
  duration: formatDuration(recording.durationSecs),
  language: recording.language.slice(0, 2),
  verified: recording.isVerified,
  recordedAt: formatDateTime(recording.recordedAt),
  transcript:
    recording.transcript || recording.victimStatement?.rawText || undefined,
});

export const officerService = {
  async createFIR(payload: Record<string, unknown>) {
    const { data } = await api.post<{ success: true; data: BackendFIR }>(
      "/officer/fir/create",
      payload,
    );
    return data.data;
  },

  async getDashboard() {
    const { data } = await api.get<{ success: true; data: DashboardResponse }>(
      "/officer/dashboard",
    );
    return {
      stats: [
        {
          value: String(data.data.stats.firsReceived),
          label: "FIRs Received",
          labelHi: "प्राप्त एफआईआर",
        },
        {
          value: String(data.data.stats.documentsPending),
          label: "Documents Pending",
          labelHi: "लंबित दस्तावेज़",
        },
        {
          value: String(data.data.stats.reviewedToday),
          label: "Reviewed Today",
          labelHi: "आज समीक्षा की गई",
        },
        {
          value: String(data.data.stats.voiceUnverified),
          label: "Voice Unverified",
          labelHi: "असत्यापित आवाज़",
        },
      ],
      queue: data.data.queue.map(mapFir),
    };
  },

  async listFirs() {
    const { data } = await api.get<{ success: true; data: BackendFIR[] }>(
      "/officer/firs",
    );
    return data.data.map(mapFir);
  },

  async listGeneralComplaints() {
    const { data } = await api.get<{ success: true; data: BackendFIR[] }>(
      "/officer/general-complaints",
    );
    return data.data.map(mapFir);
  },

  async decideGeneralComplaint(payload: {
    firId: string;
    decision: "GENERAL" | "FIR";
    note?: string;
  }) {
    const { data } = await api.post<{ success: true; data: BackendFIR }>(
      "/officer/general-complaints/decision",
      payload,
    );
    return mapFir(data.data);
  },

  async getFir(firId: string) {
    const { data } = await api.get<{ success: true; data: BackendFIR }>(
      `/officer/fir/${firId}`,
    );
    return mapFir(data.data);
  },

  async listVoiceRecordings(firId?: string) {
    const { data } = await api.get<{
      success: true;
      data: BackendVoiceRecording[];
    }>("/officer/voice-recordings", {
      params: firId ? { firId } : undefined,
    });
    return data.data.map(mapVoiceRecording);
  },

  async verifyVoiceRecording(recordingId: string) {
    await api.post(`/officer/voice-recordings/${recordingId}/verify`);
  },

  async deleteVoiceRecording(recordingId: string) {
    const { data } = await api.delete<{
      success: true;
      data: { id: string };
      message: string;
    }>(`/officer/voice-recordings/${recordingId}`);
    return data.data;
  },

  async getVoiceRecording(recordingId: string) {
    const { data } = await api.get<{
      success: true;
      data: BackendVoiceRecording;
    }>(`/officer/voice-recordings/${recordingId}`);
    return mapVoiceRecording(data.data, 0);
  },

  async getVoiceRecordingAudio(recordingId: string) {
    const response = await api.get(
      `/officer/voice-recordings/${recordingId}/audio`,
      {
        responseType: "blob",
      },
    );
    return response.data as Blob;
  },

  async uploadVoiceRecording(payload: FormData) {
    const { data } = await api.post<{
      success: true;
      data: BackendVoiceRecording;
    }>("/officer/voice-recording/upload", payload);
    return mapVoiceRecording(data.data, 0);
  },

  async generateSummary(firId: string) {
    const { data } = await api.post<{ success: true; data: BackendFIR }>(
      `/officer/fir/${firId}/summary`,
    );
    return mapFir(data.data);
  },

  async submitFIR(firId: string) {
    const { data } = await api.post<{ success: true; data: BackendFIR }>(
      "/officer/fir/submit",
      { firId },
    );
    return mapFir(data.data);
  },

  async downloadFirPdf(firId: string) {
    const response = await api.get(`/officer/fir/${firId}/pdf`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },

  async clearSavedStatements(firId: string) {
    const { data } = await api.delete<{
      success: true;
      data: { firId: string; deletedCount: number };
      message: string;
    }>(`/officer/fir/${firId}/statements`);
    return data.data;
  },

  async deleteFir(firId: string) {
    const { data } = await api.delete<{
      success: true;
      data: { firId: string };
      message: string;
    }>(`/officer/fir/${firId}`);
    return data.data;
  },

  async getProfile() {
    const { data } = await api.get<{
      success: true;
      data: OfficerProfileResponse;
    }>("/officer/profile");
    return data.data;
  },

  async updateProfile(payload: {
    name?: string;
    phone?: string;
    preferredLang?: string;
  }) {
    const { data } = await api.put<{
      success: true;
      data: OfficerProfileResponse;
      message: string;
    }>("/officer/profile", payload);
    return data.data;
  },

  async requestReverification() {
    const { data } = await api.post<{
      success: true;
      data: OfficerProfileResponse;
      message: string;
    }>("/officer/profile/reverify-request");
    return data.data;
  },

  async generateFIRFromRecording(recordingId: string) {
    // Call the dedicated officer endpoint — avoids the 403 from victim-only /fir/create
    const { data } = await api.post<{ success: true; data: BackendFIR }>(
      "/officer/fir/generate-from-recording",
      { recordingId },
    );
    return mapFir(data.data);
  },

  async getBnsBySectionNumber(sectionNumber: string) {
    try {
      const { data } = await api.get<{
        success: true;
        data: { bnsSection: BackendBnsSection };
      }>(
        `/officer/bns/${sectionNumber}`, // Or any valid endpoint
      );
      return data.data;
    } catch {
      // Fallback for missing backend endpoint
      return {
        bnsSection: {
          id: sectionNumber,
          sectionNumber,
          sectionTitle: "Section " + sectionNumber,
          ipcEquivalent: null,
          ipcTitle: null,
          ipcDescription: null,
          description: null,
          mappingReasoning: null,
          maxImprisonmentMonths: null,
          isLifeOrDeath: false,
          isCognizable: true,
          isBailable: true,
        } as BackendBnsSection,
      };
    }
  },
};
