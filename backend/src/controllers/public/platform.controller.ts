import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../server.shared";
import { getPublicPlatformStats } from "../../services/public/platformStats.service";

export const publicPlatformStatsController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const stats = await getPublicPlatformStats();
  sendJson(res, 200, stats);
};
