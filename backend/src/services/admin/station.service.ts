import { prisma } from "../../config/database";
import { Prisma } from "../../generated/prisma/client";
import { ApiError } from "../../utils/ApiError";

export const listAdminStations = async () =>
  prisma.policeStation.findMany({
    orderBy: [{ state: "asc" }, { district: "asc" }, { name: "asc" }],
  });

export const createAdminStation = async (payload: {
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
}) => {
  if (!payload.name.trim()) {
    throw new ApiError(400, "Station name is required.");
  }

  if (!payload.stationCode.trim()) {
    throw new ApiError(400, "Station code is required.");
  }

  return prisma.policeStation.create({
    data: {
      name: payload.name.trim(),
      stationCode: payload.stationCode.trim().toUpperCase(),
      address: payload.address.trim(),
      district: payload.district.trim(),
      state: payload.state.trim(),
      pincode: payload.pincode.trim(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      phone: payload.phone.trim(),
      email: payload.email?.trim() || null,
      jurisdictionArea: payload.jurisdictionArea?.trim() || null,
    },
  });
};

export const renameAdminStation = async (payload: {
  stationId: string;
  name: string;
}) => {
  const stationId = payload.stationId.trim();
  const name = payload.name.trim();

  if (!stationId) {
    throw new ApiError(400, "Station id is required.");
  }
  if (!name) {
    throw new ApiError(400, "Station name is required.");
  }

  try {
    return await prisma.policeStation.update({
      where: { id: stationId },
      data: { name },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ApiError(404, "Station not found.");
    }

    throw new ApiError(500, "Unable to rename station at the moment.");
  }
};

export const updateAdminStationAddress = async (payload: {
  stationId: string;
  address: string;
}) => {
  const stationId = payload.stationId.trim();
  const address = payload.address.trim();

  if (!stationId) {
    throw new ApiError(400, "Station id is required.");
  }
  if (!address) {
    throw new ApiError(400, "Station address is required.");
  }

  try {
    return await prisma.policeStation.update({
      where: { id: stationId },
      data: { address },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ApiError(404, "Station not found.");
    }

    throw new ApiError(500, "Unable to update station address at the moment.");
  }
};

export const removeAdminStation = async (stationId: string) => {
  const id = stationId.trim();
  if (!id) {
    throw new ApiError(400, "Station id is required.");
  }

  const station = await prisma.policeStation.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          officers: true,
          firs: true,
        },
      },
    },
  });

  if (!station) {
    throw new ApiError(404, "Station not found.");
  }

  const linkedOfficerCount = station._count.officers;
  const linkedFirCount = station._count.firs;
  if (linkedOfficerCount > 0 || linkedFirCount > 0) {
    throw new ApiError(
      409,
      `Cannot remove station because it is linked to ${linkedOfficerCount} officer(s) and ${linkedFirCount} FIR(s). Reassign or remove those records first.`,
    );
  }

  try {
    await prisma.policeStation.delete({ where: { id } });
    return { id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ApiError(404, "Station not found.");
    }

    throw new ApiError(500, "Unable to remove station at the moment.");
  }
};
