import api from "./api";
import type { OfficerRegisterData } from "./authService";

export type AdminStationPayload = {
  name: string;
  stationCode: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  jurisdictionArea?: string;
};

export type AdminDashboardResponse = {
  stats: {
    pendingOfficerActions: number;
    policeStations: number;
    firsFiled24h: number;
    bnsSectionsLive: number;
  };
  recentOfficers: Array<{
    id: string;
    badgeNumber: string;
    verificationStatus: string;
    submittedAt: string;
    name: string;
    stationName: string;
  }>;
  systemStatus: {
    lastSync: string;
    apiGateway: string;
    auditLogStream: string;
  };
};

export type AdminBnssSection = {
  sectionNumber: string;
  sectionTitle: string;
  description: string;
  category: string;
  crpcEquivalent?: string | null;
  crpcTitle?: string | null;
  crpcDescription?: string | null;
  isBailable?: boolean;
  isCognizable?: boolean;
  isCompoundable?: boolean;
  mappingReasoning?: string | null;
};

export const adminService = {
  async getDashboard(): Promise<AdminDashboardResponse> {
    const { data } = await api.get<AdminDashboardResponse>("/admin/dashboard");
    return data;
  },

  async listOfficers(status?: string) {
    const { data } = await api.get("/admin/officers", {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async reviewOfficer(officerId: string, action: "approve" | "reject") {
    const { data } = await api.post("/admin/officers/review", {
      officerId,
      action,
    });
    return data;
  },

  async createOfficer(payload: OfficerRegisterData) {
    const { data } = await api.post("/admin/officers/create", payload);
    return data;
  },

  async listStations() {
    const { data } = await api.get("/admin/stations");
    return data;
  },

  async createStation(payload: AdminStationPayload) {
    const { data } = await api.post("/admin/stations", payload);
    return data;
  },

  async renameStation(stationId: string, name: string) {
    const { data } = await api.patch(`/admin/stations/${stationId}`, { name });
    return data;
  },

  async updateStationAddress(stationId: string, address: string) {
    const { data } = await api.patch(`/admin/stations/${stationId}/address`, {
      address,
    });
    return data;
  },

  async removeStation(stationId: string) {
    const { data } = await api.delete(`/admin/stations/${stationId}`);
    return data;
  },

  async listBns(query?: string) {
    const { data } = await api.get("/admin/bns", {
      params: query ? { query } : undefined,
    });
    return data;
  },

  async listBnss(query?: string): Promise<AdminBnssSection[]> {
    const { data } = await api.get<AdminBnssSection[]>("/admin/bnss", {
      params: query ? { query } : undefined,
    });
    return data;
  },
};
