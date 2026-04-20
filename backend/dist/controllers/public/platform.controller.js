"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicPlatformStatsController = void 0;
const server_shared_1 = require("../../server.shared");
const platformStats_service_1 = require("../../services/public/platformStats.service");
const publicPlatformStatsController = async (req, res) => {
    const stats = await (0, platformStats_service_1.getPublicPlatformStats)();
    (0, server_shared_1.sendJson)(res, 200, stats);
};
exports.publicPlatformStatsController = publicPlatformStatsController;
