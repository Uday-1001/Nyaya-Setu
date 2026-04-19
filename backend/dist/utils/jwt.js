"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.createRefreshToken = exports.createAccessToken = void 0;
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
const ApiError_1 = require("./ApiError");
const base64UrlEncode = (value) => Buffer.from(value).toString("base64url");
const base64UrlDecode = (value) => Buffer.from(value, "base64url").toString("utf8");
const sign = (value, secret) => (0, node_crypto_1.createHmac)("sha256", secret).update(value).digest("base64url");
const issueToken = (payload, kind, secret, ttlSeconds) => {
    const body = {
        ...payload,
        kind,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const encoded = base64UrlEncode(JSON.stringify(body));
    const signature = sign(encoded, secret);
    return `${encoded}.${signature}`;
};
const verifyToken = (token, secret, expectedKind) => {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) {
        throw new ApiError_1.ApiError(401, "Invalid token.");
    }
    const expectedSignature = sign(encoded, secret);
    if (signature !== expectedSignature) {
        throw new ApiError_1.ApiError(401, "Invalid token.");
    }
    let payload;
    try {
        payload = JSON.parse(base64UrlDecode(encoded));
    }
    catch {
        throw new ApiError_1.ApiError(401, "Invalid token.");
    }
    if (payload.kind !== expectedKind) {
        throw new ApiError_1.ApiError(401, "Invalid token.");
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
        throw new ApiError_1.ApiError(401, "Token expired");
    }
    return payload;
};
const createAccessToken = (payload) => issueToken(payload, "access", env_1.env.jwtAccessSecret, env_1.env.accessTokenTtlSeconds);
exports.createAccessToken = createAccessToken;
const createRefreshToken = (payload) => issueToken(payload, "refresh", env_1.env.jwtRefreshSecret, env_1.env.refreshTokenTtlSeconds);
exports.createRefreshToken = createRefreshToken;
const verifyAccessToken = (token) => verifyToken(token, env_1.env.jwtAccessSecret, "access");
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => verifyToken(token, env_1.env.jwtRefreshSecret, "refresh");
exports.verifyRefreshToken = verifyRefreshToken;
