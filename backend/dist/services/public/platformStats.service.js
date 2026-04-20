"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicPlatformStats = void 0;
const database_1 = require("../../config/database");
const enums_1 = require("../../generated/prisma/enums");
const mlClient_1 = require("../ml/mlClient");
const getPublicPlatformStats = async () => {
    const [totalFirs, bnsSections, activeOfficers, bnssCatalog] = await Promise.all([
        database_1.prisma.fIR.count(),
        database_1.prisma.bNSSection.count(),
        database_1.prisma.officer.count({
            where: {
                verificationStatus: enums_1.OfficerVerificationStatus.VERIFIED,
                verifiedByAdminId: {
                    not: null,
                },
            },
        }),
        (0, mlClient_1.remoteBnssCatalog)(),
    ]);
    return {
        totalFirs,
        bnsSections,
        bnssSections: bnssCatalog?.length ?? 0,
        activeOfficers,
    };
};
exports.getPublicPlatformStats = getPublicPlatformStats;
