import api from "./api";

export type VictimStatementPayload = {
  rawText: string;
  accusedPersonName: string;
  accusedAddress: string;
  assetsDescription?: string;
  translatedText?: string;
  language?: string;
  incidentDate?: string;
  incidentTime?: string;
  incidentLocation?: string;
  witnessDetails?: string;
};

export type SubmitStatementToStationPayload = {
  stationId: string;
  statementId?: string;
  signatureDataUrl?: string;
};

export const statementService = {
  async create(payload: VictimStatementPayload) {
    const { data } = await api.post("/victim/statements", payload);
    return data;
  },

  async getLatest() {
    const { data } = await api.get("/victim/statements/latest");
    return data;
  },

  async submitToStation(payload: SubmitStatementToStationPayload) {
    const { data } = await api.post(
      "/victim/statements/submit-to-station",
      payload,
    );
    return data as {
      alreadySubmitted: boolean;
      recommendation?: string;
      fir: {
        id: string;
        firNumber: string | null;
        acknowledgmentNo: string | null;
        station?: {
          id: string;
          name: string;
        } | null;
      };
    };
  },
};
