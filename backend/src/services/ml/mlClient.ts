import { env } from "../../config/env";
import type {
  MlClassificationPayload,
  NormalizedFullPipeline,
} from "../../types/ml.types";
import {
  normalizeClassifyOnlyResponse,
  normalizeFullPipelineResponse,
} from "./normalize";

const joinUrl = (base: string, p: string) =>
  `${base.replace(/\/$/, "")}${p.startsWith("/") ? p : `/${p}`}`;

const readJson = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `ML service returned non-JSON (HTTP ${res.status}): ${text.slice(0, 240)}`,
    );
  }
};

const withTimeout = (ms: number) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
};

export type RemoteCatalogSection = {
  sectionNumber: string;
  sectionTitle: string;
  description: string;
  category: string;
  ipcEquivalent?: string | null;
  ipcTitle?: string | null;
  ipcDescription?: string | null;
  isBailable?: boolean;
  isCognizable?: boolean;
  isCompoundable?: boolean;
  mappingReasoning?: string | null;
};

export type RemoteBnssCatalogSection = {
  sectionNumber: string;
  sectionTitle: string;
  description: string;
  category: string;
  crpcEquivalent?: string | null;
  crpcTitle?: string | null;
  crpcDescription?: string | null;
  isBailable?: boolean;
  isCognizable?: boolean;
  isCompoundable?: boolean;
  mappingReasoning?: string | null;
};

/** Full stack: Whisper → NER → classifier → rights (Python `/v1/pipeline`). */
export const remotePipelineText = async (
  rawText: string,
  language: string,
): Promise<NormalizedFullPipeline> => {
  const base = env.mlServiceUrl;
  if (!base) {
    throw new Error("ML_SERVICE_URL is not configured.");
  }
  const { signal, cancel } = withTimeout(env.mlServiceTimeoutMs);
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
    return normalizeFullPipelineResponse(await readJson(res));
  } catch (e) {
    cancel();
    throw e;
  }
};

export const remotePipelineAudio = async (
  buffer: Buffer,
  filename: string,
  mimeType: string,
  fields: Record<string, string>,
): Promise<NormalizedFullPipeline> => {
  const base = env.mlServiceUrl;
  if (!base) {
    throw new Error("ML_SERVICE_URL is not configured.");
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v != null) form.set(k, v);
  }
  const blob = new Blob([new Uint8Array(buffer)], {
    type: mimeType || "application/octet-stream",
  });
  form.set("audio", blob, filename || "recording.webm");

  const { signal, cancel } = withTimeout(env.mlServiceTimeoutMs);
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
    return normalizeFullPipelineResponse(await readJson(res));
  } catch (e) {
    cancel();
    throw e;
  }
};

/** Classify text only (Python `/v1/classify`) — used after a text statement is saved. */
export const remoteClassifyText = async (
  rawText: string,
  language: string,
): Promise<MlClassificationPayload | null> => {
  const base = env.mlServiceUrl;
  if (!base) {
    return null;
  }
  const { signal, cancel } = withTimeout(env.mlServiceTimeoutMs);
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
    return normalizeClassifyOnlyResponse(await readJson(res));
  } catch {
    cancel();
    return null;
  }
};

/** Download BNS catalog rows generated from trained ML artifacts (`GET /v1/catalog`). */
export const remoteCatalog = async (): Promise<
  RemoteCatalogSection[] | null
> => {
  const base = env.mlServiceUrl;
  if (!base) {
    return null;
  }

  const { signal, cancel } = withTimeout(env.mlServiceTimeoutMs);
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

    const body = (await readJson(res)) as { rows?: unknown };
    if (!body || !Array.isArray(body.rows)) {
      return null;
    }

    const out: RemoteCatalogSection[] = [];
    for (const item of body.rows) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const sectionNumber =
        typeof row.sectionNumber === "string" ? row.sectionNumber.trim() : "";
      const sectionTitle =
        typeof row.sectionTitle === "string" ? row.sectionTitle.trim() : "";
      const description =
        typeof row.description === "string" ? row.description.trim() : "";
      const category =
        typeof row.category === "string" ? row.category.trim() : "OTHER";
      if (!sectionNumber || !sectionTitle || !description) continue;

      out.push({
        sectionNumber,
        sectionTitle,
        description,
        category,
        ipcEquivalent:
          typeof row.ipcEquivalent === "string" ? row.ipcEquivalent : null,
        ipcTitle: typeof row.ipcTitle === "string" ? row.ipcTitle : null,
        ipcDescription:
          typeof row.ipcDescription === "string" ? row.ipcDescription : null,
        isBailable:
          typeof row.isBailable === "boolean" ? row.isBailable : false,
        isCognizable:
          typeof row.isCognizable === "boolean" ? row.isCognizable : true,
        isCompoundable:
          typeof row.isCompoundable === "boolean" ? row.isCompoundable : false,
        mappingReasoning:
          typeof row.mappingReasoning === "string"
            ? row.mappingReasoning
            : null,
      });
    }

    return out;
  } catch {
    cancel();
    return null;
  }
};

/** Download BNSS catalog rows generated from trained ML artifacts (`GET /v1/bnss-catalog`). */
export const remoteBnssCatalog = async (): Promise<
  RemoteBnssCatalogSection[] | null
> => {
  const base = env.mlServiceUrl;
  if (!base) {
    return null;
  }

  const { signal, cancel } = withTimeout(env.mlServiceTimeoutMs);
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

    const body = (await readJson(res)) as { rows?: unknown };
    if (!body || !Array.isArray(body.rows)) {
      return null;
    }

    const out: RemoteBnssCatalogSection[] = [];
    for (const item of body.rows) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const sectionNumber =
        typeof row.sectionNumber === "string" ? row.sectionNumber.trim() : "";
      const sectionTitle =
        typeof row.sectionTitle === "string" ? row.sectionTitle.trim() : "";
      const description =
        typeof row.description === "string" ? row.description.trim() : "";
      const category =
        typeof row.category === "string" ? row.category.trim() : "OTHER";
      if (!sectionNumber || !sectionTitle || !description) continue;

      out.push({
        sectionNumber,
        sectionTitle,
        description,
        category,
        crpcEquivalent:
          typeof row.crpcEquivalent === "string" ? row.crpcEquivalent : null,
        crpcTitle: typeof row.crpcTitle === "string" ? row.crpcTitle : null,
        crpcDescription:
          typeof row.crpcDescription === "string" ? row.crpcDescription : null,
        isBailable:
          typeof row.isBailable === "boolean" ? row.isBailable : false,
        isCognizable:
          typeof row.isCognizable === "boolean" ? row.isCognizable : true,
        isCompoundable:
          typeof row.isCompoundable === "boolean" ? row.isCompoundable : false,
        mappingReasoning:
          typeof row.mappingReasoning === "string"
            ? row.mappingReasoning
            : null,
      });
    }

    return out;
  } catch {
    cancel();
    return null;
  }
};
