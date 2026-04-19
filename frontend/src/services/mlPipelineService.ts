import api from "./api";

export type VictimPipelineTextPayload = {
  rawText: string;
  accusedPersonName: string;
  accusedAddress: string;
  assetsDescription?: string;
  language?: string;
  incidentDate?: string;
  incidentTime?: string;
  incidentLocation?: string;
  witnessDetails?: string;
};

export type MlPipelineResponse = {
  statement: { id: string; rawText: string | null };
  classification: unknown;
  resolution: unknown;
  rights: unknown;
  mlTrace?: {
    transcript?: string;
    rawComplaintText?: string;
    entities?: Record<string, unknown>;
    classifications?: Array<{
      sectionNumber: string;
      confidence: number;
      title?: string;
    }>;
    victimRightsSummary?: string;
    victimRightsBullets?: string[];
    modelVersion?: string;
  };
};

/** Text path: Whisper skipped; Python still runs NER/classifier/rights when ML_SERVICE_URL is set. */
export const mlPipelineService = {
  async runText(
    payload: VictimPipelineTextPayload,
  ): Promise<MlPipelineResponse> {
    const { data } = await api.post<MlPipelineResponse>("/victim/ml/pipeline", {
      rawText: payload.rawText,
      accusedPersonName: payload.accusedPersonName,
      accusedAddress: payload.accusedAddress,
      assetsDescription: payload.assetsDescription || undefined,
      language: payload.language ?? "hi",
      incidentDate: payload.incidentDate || undefined,
      incidentTime: payload.incidentTime || undefined,
      incidentLocation: payload.incidentLocation || undefined,
      witnessDetails: payload.witnessDetails || undefined,
    });
    return data;
  },

  /** Hindi / Hinglish audio → multipart field `audio` (same contract as Python service). */
  async runAudio(formData: FormData): Promise<MlPipelineResponse> {
    const { data } = await api.post<MlPipelineResponse>(
      "/victim/ml/pipeline",
      formData,
    );
    return data;
  },
};
