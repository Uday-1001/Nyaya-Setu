"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAdminStation = exports.updateAdminStationAddress = exports.renameAdminStation = exports.createAdminStation = exports.listAdminStations = void 0;
const database_1 = require("../../config/database");
const client_1 = require("../../generated/prisma/client");
const ApiError_1 = require("../../utils/ApiError");
const listAdminStations = async () => database_1.prisma.policeStation.findMany({
    orderBy: [{ state: "asc" }, { district: "asc" }, { name: "asc" }],
});
exports.listAdminStations = listAdminStations;
const createAdminStation = async (payload) => {
    if (!payload.name.trim()) {
        throw new ApiError_1.ApiError(400, "Station name is required.");
    }
    if (!payload.stationCode.trim()) {
        throw new ApiError_1.ApiError(400, "Station code is required.");
    }
    return database_1.prisma.policeStation.create({
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
exports.createAdminStation = createAdminStation;
const renameAdminStation = async (payload) => {
    const stationId = payload.stationId.trim();
    const name = payload.name.trim();
    if (!stationId) {
        throw new ApiError_1.ApiError(400, "Station id is required.");
    }
    if (!name) {
        throw new ApiError_1.ApiError(400, "Station name is required.");
    }
    try {
        return await database_1.prisma.policeStation.update({
            where: { id: stationId },
            data: { name },
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            throw new ApiError_1.ApiError(404, "Station not found.");
        }
        throw new ApiError_1.ApiError(500, "Unable to rename station at the moment.");
    }
};
exports.renameAdminStation = renameAdminStation;
const updateAdminStationAddress = async (payload) => {
    const stationId = payload.stationId.trim();
    const address = payload.address.trim();
    if (!stationId) {
        throw new ApiError_1.ApiError(400, "Station id is required.");
    }
    if (!address) {
        throw new ApiError_1.ApiError(400, "Station address is required.");
    }
    try {
        return await database_1.prisma.policeStation.update({
            where: { id: stationId },
            data: { address },
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            throw new ApiError_1.ApiError(404, "Station not found.");
        }
        throw new ApiError_1.ApiError(500, "Unable to update station address at the moment.");
    }
};
exports.updateAdminStationAddress = updateAdminStationAddress;
const removeAdminStation = async (stationId) => {
    const id = stationId.trim();
    if (!id) {
        throw new ApiError_1.ApiError(400, "Station id is required.");
    }
    const station = await database_1.prisma.policeStation.findUnique({
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
        throw new ApiError_1.ApiError(404, "Station not found.");
    }
    const linkedOfficerCount = station._count.officers;
    const linkedFirCount = station._count.firs;
    if (linkedOfficerCount > 0 || linkedFirCount > 0) {
        throw new ApiError_1.ApiError(409, `Cannot remove station because it is linked to ${linkedOfficerCount} officer(s) and ${linkedFirCount} FIR(s). Reassign or remove those records first.`);
    }
    try {
        await database_1.prisma.policeStation.delete({ where: { id } });
        return { id };
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            throw new ApiError_1.ApiError(404, "Station not found.");
        }
        throw new ApiError_1.ApiError(500, "Unable to remove station at the moment.");
    }
};
exports.removeAdminStation = removeAdminStation;
