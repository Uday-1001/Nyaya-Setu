"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminStationAddressUpdateController = exports.adminStationRemoveController = exports.adminStationRenameController = exports.adminStationCreateController = exports.adminStationListController = void 0;
const enums_1 = require("../../generated/prisma/enums");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const server_shared_1 = require("../../server.shared");
const station_service_1 = require("../../services/admin/station.service");
const adminStationListController = async (req, res) => {
    await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.ADMIN]);
    const stations = await (0, station_service_1.listAdminStations)();
    (0, server_shared_1.sendJson)(res, 200, stations);
};
exports.adminStationListController = adminStationListController;
const adminStationCreateController = async (req, res, body) => {
    await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.ADMIN]);
    const station = await (0, station_service_1.createAdminStation)({
        name: String(body.name ?? ""),
        stationCode: String(body.stationCode ?? ""),
        address: String(body.address ?? ""),
        district: String(body.district ?? ""),
        state: String(body.state ?? ""),
        pincode: String(body.pincode ?? ""),
        latitude: Number(body.latitude ?? 0),
        longitude: Number(body.longitude ?? 0),
        phone: String(body.phone ?? ""),
        email: body.email ? String(body.email) : undefined,
        jurisdictionArea: body.jurisdictionArea
            ? String(body.jurisdictionArea)
            : undefined,
    });
    (0, server_shared_1.sendJson)(res, 201, station);
};
exports.adminStationCreateController = adminStationCreateController;
const adminStationRenameController = async (req, res, body) => {
    await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.ADMIN]);
    const station = await (0, station_service_1.renameAdminStation)({
        stationId: String(body.stationId ?? ""),
        name: String(body.name ?? ""),
    });
    (0, server_shared_1.sendJson)(res, 200, station);
};
exports.adminStationRenameController = adminStationRenameController;
const adminStationRemoveController = async (req, res, body) => {
    await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.ADMIN]);
    const result = await (0, station_service_1.removeAdminStation)(String(body.stationId ?? ""));
    (0, server_shared_1.sendJson)(res, 200, result);
};
exports.adminStationRemoveController = adminStationRemoveController;
const adminStationAddressUpdateController = async (req, res, body) => {
    await (0, auth_middleware_1.getAuthenticatedUser)(req, [enums_1.Role.ADMIN]);
    const station = await (0, station_service_1.updateAdminStationAddress)({
        stationId: String(body.stationId ?? ""),
        address: String(body.address ?? ""),
    });
    (0, server_shared_1.sendJson)(res, 200, station);
};
exports.adminStationAddressUpdateController = adminStationAddressUpdateController;
