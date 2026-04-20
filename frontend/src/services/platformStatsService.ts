import api from "./api";

export type PlatformStatsResponse = {
  totalFirs: number;
  bnsSections: number;
  bnssSections: number;
  activeOfficers: number;
};

export const platformStatsService = {
  async getPublicStats(): Promise<PlatformStatsResponse> {
    const { data } = await api.get<PlatformStatsResponse>("/platform/stats");
    return data;
  },
};
