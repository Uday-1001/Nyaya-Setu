"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteBnssCatalog = exports.remoteCatalog = exports.remoteClassifyText = exports.remotePipelineAudio = exports.remotePipelineText = void 0;
const env_1 = require("../../config/env");
const normalize_1 = require("./normalize");
const joinUrl = (base, p) => `${base.replace(/\/$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
const readJson = async (res) => {
    const text = await res.text();
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`ML service returned non-JSON (HTTP ${res.status}): ${text.slice(0, 240)}`);
    }
};
const withTimeout = (ms) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
};
/** Full stack: Whisper → NER → classifier → rights (Python `/v1/pipeline`). */
const remotePipelineText = async (rawText, language) => {
    const base = env_1.env.mlServiceUrl;
    if (!base) {
        throw new Error("ML_SERVICE_URL is not configured.");
    }
    const { signal, cancel } = withTimeout(env_1.env.mlServiceTimeoutMs);
    try {
        const res = await fetch(joinUrl(base, "/v1/pipeline/json"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                raw_text: rawText,
                rawComplaintText: rawText,
                language,
            }),
            signal,
        });
        cancel();
        if (!res.ok) {
            throw new Error(`ML pipeline failed (HTTP ${res.status}).`);
        }
        return (0, normalize_1.normalizeFullPipelineResponse)(await readJson(res));
    }
    catch (e) {
        cancel();
        throw e;
    }
};
exports.remotePipelineText = remotePipelineText;
const remotePipelineAudio = async (buffer, filename, mimeType, fields) => {
    const base = env_1.env.mlServiceUrl;
    if (!base) {
        throw new Error("ML_SERVICE_URL is not configured.");
    }
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
        if (v != null)
            form.set(k, v);
    }
    const blob = new Blob([new Uint8Array(buffer)], {
        type: mimeType || "application/octet-stream",
    });
    form.set("audio", blob, filename || "recording.webm");
    const { signal, cancel } = withTimeout(env_1.env.mlServiceTimeoutMs);
    try {
        const res = await fetch(joinUrl(base, "/v1/pipeline"), {
            method: "POST",
            body: form,
            signal,
        });
        cancel();
        if (!res.ok) {
            throw new Error(`ML pipeline (audio) failed (HTTP ${res.status}).`);
        }
        return (0, normalize_1.normalizeFullPipelineResponse)(await readJson(res));
    }
    catch (e) {
        cancel();
        throw e;
    }
};
exports.remotePipelineAudio = remotePipelineAudio;
/** Classify text only (Python `/v1/classify`) — used after a text statement is saved. */
const remoteClassifyText = async (rawText, language) => {
    const base = env_1.env.mlServiceUrl;
    if (!base) {
        return null;
    }
    const { signal, cancel } = withTimeout(env_1.env.mlServiceTimeoutMs);
    try {
        const res = await fetch(joinUrl(base, "/v1/classify"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                raw_text: rawText,
                rawComplaintText: rawText,
                language,
            }),
            signal,
        });
        cancel();
        if (!res.ok) {
            return null;
        }
        return (0, normalize_1.normalizeClassifyOnlyResponse)(await readJson(res));
    }
    catch {
        cancel();
        return null;
    }
};
exports.remoteClassifyText = remoteClassifyText;
/** Download BNS catalog rows generated from trained ML artifacts (`GET /v1/catalog`). */
const remoteCatalog = async () => {
    const base = env_1.env.mlServiceUrl;
    if (!base) {
        return null;
    }
    const { signal, cancel } = withTimeout(env_1.env.mlServiceTimeoutMs);
    try {
        const res = await fetch(joinUrl(base, "/v1/catalog"), {
            method: "GET",
            headers: { Accept: "application/json" },
            signal,
        });
        cancel();
        if (!res.ok) {
            return null;
        }
        const body = (await readJson(res));
        if (!body || !Array.isArray(body.rows)) {
            return null;
        }
        const out = [];
        for (const item of body.rows) {
            if (!item || typeof item !== "object")
                continue;
            const row = item;
            const sectionNumber = typeof row.sectionNumber === "string" ? row.sectionNumber.trim() : "";
            const sectionTitle = typeof row.sectionTitle === "string" ? row.sectionTitle.trim() : "";
            const description = typeof row.description === "string" ? row.description.trim() : "";
            const category = typeof row.category === "string" ? row.category.trim() : "OTHER";
            if (!sectionNumber || !sectionTitle || !description)
                continue;
            out.push({
                sectionNumber,
                sectionTitle,
                description,
                category,
                ipcEquivalent: typeof row.ipcEquivalent === "string" ? row.ipcEquivalent : null,
                ipcTitle: typeof row.ipcTitle === "string" ? row.ipcTitle : null,
                ipcDescription: typeof row.ipcDescription === "string" ? row.ipcDescription : null,
                isBailable: typeof row.isBailable === "boolean" ? row.isBailable : false,
                isCognizable: typeof row.isCognizable === "boolean" ? row.isCognizable : true,
                isCompoundable: typeof row.isCompoundable === "boolean" ? row.isCompoundable : false,
                mappingReasoning: typeof row.mappingReasoning === "string"
                    ? row.mappingReasoning
                    : null,
            });
        }
        return out;
    }
    catch {
        cancel();
        return null;
    }
};
exports.remoteCatalog = remoteCatalog;
/** Download BNSS catalog rows generated from trained ML artifacts (`GET /v1/bnss-catalog`). */
const remoteBnssCatalog = async () => {
    const base = env_1.env.mlServiceUrl;
    if (!base) {
        return null;
    }
    const { signal, cancel } = withTimeout(env_1.env.mlServiceTimeoutMs);
    try {
        const res = await fetch(joinUrl(base, "/v1/bnss-catalog"), {
            method: "GET",
            headers: { Accept: "application/json" },
            signal,
        });
        cancel();
        if (!res.ok) {
            return null;
        }
        const body = (await readJson(res));
        if (!body || !Array.isArray(body.rows)) {
            return null;
        }
        const out = [];
        for (const item of body.rows) {
            if (!item || typeof item !== "object")
                continue;
            const row = item;
            const sectionNumber = typeof row.sectionNumber === "string" ? row.sectionNumber.trim() : "";
            const sectionTitle = typeof row.sectionTitle === "string" ? row.sectionTitle.trim() : "";
            const description = typeof row.description === "string" ? row.description.trim() : "";
            const category = typeof row.category === "string" ? row.category.trim() : "OTHER";
            if (!sectionNumber || !sectionTitle || !description)
                continue;
            out.push({
                sectionNumber,
                sectionTitle,
                description,
                category,
                crpcEquivalent: typeof row.crpcEquivalent === "string" ? row.crpcEquivalent : null,
                crpcTitle: typeof row.crpcTitle === "string" ? row.crpcTitle : null,
                crpcDescription: typeof row.crpcDescription === "string" ? row.crpcDescription : null,
                isBailable: typeof row.isBailable === "boolean" ? row.isBailable : false,
                isCognizable: typeof row.isCognizable === "boolean" ? row.isCognizable : true,
                isCompoundable: typeof row.isCompoundable === "boolean" ? row.isCompoundable : false,
                mappingReasoning: typeof row.mappingReasoning === "string"
                    ? row.mappingReasoning
                    : null,
            });
        }
        return out;
    }
    catch {
        cancel();
        return null;
    }
};
exports.remoteBnssCatalog = remoteBnssCatalog;
