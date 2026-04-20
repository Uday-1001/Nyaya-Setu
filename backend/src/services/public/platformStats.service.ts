import { prisma } from "../../config/database";
import { OfficerVerificationStatus } from "../../generated/prisma/enums";
import { remoteBnssCatalog } from "../ml/mlClient";

export const getPublicPlatformStats = async () => {
  const [totalFirs, bnsSections, activeOfficers, bnssCatalog] =
    await Promise.all([
      prisma.fIR.count(),
      prisma.bNSSection.count(),
      prisma.officer.count({
        where: {
          verificationStatus: OfficerVerificationStatus.VERIFIED,
          verifiedByAdminId: {
            not: null,
          },
        },
      }),
      remoteBnssCatalog(),
    ]);

  return {
    totalFirs,
    bnsSections,
    bnssSections: bnssCatalog?.length ?? 0,
    activeOfficers,
  };
};
