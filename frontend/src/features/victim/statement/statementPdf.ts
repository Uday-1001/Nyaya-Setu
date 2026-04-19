import { jsPDF } from "jspdf";
import type { User } from "../../../types/user.types";

type AnyRecord = Record<string, unknown>;

export type StatementPdfInput = {
  user: User | null;
  statement: AnyRecord | null;
  classification: AnyRecord | null;
  resolution: AnyRecord | null;
  rights: AnyRecord | null;
  signatureDataUrl?: string | null;
};

const PAGE_MARGIN = 46;
const LINE_HEIGHT = 13;
const PAGE_BOTTOM_SAFE = 72;

const toText = (value: unknown, fallback = "Not provided") => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
};

const normalizeInline = (value: unknown) =>
  String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractPrefilledMeta = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const readValue = (prefix: string) => {
    const target = `${prefix.toLowerCase()}:`;
    const hit = lines.find((line) => line.toLowerCase().startsWith(target));
    return hit ? hit.slice(target.length).trim() : "";
  };

  return {
    accusedPersonName: readValue("Accused person name"),
    accusedAddress: readValue("Accused person address"),
    assetsDescription: readValue("Assets description"),
  };
};

const stripPrefilledMeta = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = line.trim().toLowerCase();
      return !(
        normalized.startsWith("accused person name:") ||
        normalized.startsWith("accused person address:") ||
        normalized.startsWith("assets description:")
      );
    })
    .join("\n")
    .trim();

const fmtDate = (value: unknown) => {
  if (!value) return "Not provided";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const drawTopTricolor = (doc: jsPDF) => {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 153, 51);
  doc.rect(0, 0, width, 6, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 6, width, 6, "F");
  doc.setFillColor(19, 136, 8);
  doc.rect(0, 12, width, 6, "F");
};

const drawHeader = (doc: jsPDF, generatedOn: string) => {
  const width = doc.internal.pageSize.getWidth();
  drawTopTricolor(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(15, 23, 42);
  doc.text("NYAYA SETU", PAGE_MARGIN, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("First Information Report Document", PAGE_MARGIN, 58);

  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Generated: ${generatedOn}`, width - PAGE_MARGIN - 170, 44);
  doc.setFontSize(9);
  doc.text("Victim Copy", width - PAGE_MARGIN - 170, 58);
};

const addPage = (
  doc: jsPDF,
  y: number,
  generatedOn: string,
  requiredHeight = LINE_HEIGHT + 4,
) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight > pageHeight - PAGE_BOTTOM_SAFE) {
    doc.addPage();
    drawHeader(doc, generatedOn);
    return 98;
  }
  return y;
};

const sectionTitle = (
  doc: jsPDF,
  y: number,
  title: string,
  generatedOn: string,
) => {
  y = addPage(doc, y, generatedOn, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), PAGE_MARGIN, y);
  return y + 18;
};

const keyValue = (
  doc: jsPDF,
  y: number,
  key: string,
  value: string,
  generatedOn: string,
) => {
  const width = doc.internal.pageSize.getWidth();
  y = addPage(doc, y, generatedOn, LINE_HEIGHT + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${key}:`, PAGE_MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const wrapped = doc.splitTextToSize(
    normalizeInline(value) || "Not provided",
    width - PAGE_MARGIN - 200,
  ) as string[];
  doc.text(wrapped, PAGE_MARGIN + 180, y);

  return y + Math.max(LINE_HEIGHT, wrapped.length * LINE_HEIGHT) + 2;
};

const paragraphBlock = (
  doc: jsPDF,
  y: number,
  text: string,
  generatedOn: string,
) => {
  const width = doc.internal.pageSize.getWidth();
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    y = addPage(doc, y, generatedOn, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("No statement text available.", PAGE_MARGIN + 10, y);
    return y + 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(
      paragraph,
      width - PAGE_MARGIN * 2 - 10,
    ) as string[];
    y = addPage(doc, y, generatedOn, lines.length * LINE_HEIGHT + 6);
    doc.text(lines, PAGE_MARGIN + 10, y);
    y += lines.length * LINE_HEIGHT + 6;
  }

  return y + 2;
};

const drawVictimSignatureBox = (
  doc: jsPDF,
  y: number,
  generatedOn: string,
  signatureDataUrl?: string | null,
) => {
  const width = doc.internal.pageSize.getWidth();
  y = addPage(doc, y, generatedOn, 162);
  y = sectionTitle(doc, y, "Signature Area", generatedOn);

  const boxY = y;
  const boxW = width - PAGE_MARGIN * 2;
  const boxH = 116;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.rect(PAGE_MARGIN, boxY, boxW, boxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Victim Signature", PAGE_MARGIN + 14, boxY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Name:", PAGE_MARGIN + 14, boxY + 90);
  doc.text("Date:", PAGE_MARGIN + 14, boxY + 108);

  if (signatureDataUrl) {
    try {
      const format = signatureDataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(
        signatureDataUrl,
        format,
        PAGE_MARGIN + 14,
        boxY + 30,
        140,
        44,
      );
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Uploaded signature could not be rendered.",
        PAGE_MARGIN + 14,
        boxY + 52,
      );
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No digital signature uploaded.", PAGE_MARGIN + 14, boxY + 52);
  }

  return boxY + boxH + 10;
};

export const downloadStatementReportPdf = ({
  user,
  statement,
  classification,
  resolution,
  rights,
  signatureDataUrl,
}: StatementPdfInput) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const generatedOn = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const bnsSection =
    (classification?.bnsSection as AnyRecord | undefined) ?? {};
  const statementRecord =
    statement ??
    (classification?.victimStatement as AnyRecord | undefined) ??
    null;

  const rawNarrative =
    (typeof statementRecord?.rawText === "string"
      ? statementRecord.rawText
      : "") ||
    (typeof statementRecord?.translatedText === "string"
      ? statementRecord.translatedText
      : "") ||
    "";

  const extractedMeta = extractPrefilledMeta(rawNarrative);
  const narrativeWithoutMeta = stripPrefilledMeta(rawNarrative);
  const statementText =
    toText(narrativeWithoutMeta, "") ||
    toText(statementRecord?.rawText, "") ||
    toText(statementRecord?.translatedText, "") ||
    "No statement text available.";

  const bnsNumber = toText(
    bnsSection?.sectionNumber,
    toText(resolution?.sectionNumber),
  );
  const bnsTitle = toText(
    bnsSection?.sectionTitle,
    toText(resolution?.sectionTitle),
  );
  const ipcEquivalent = toText(bnsSection?.ipcEquivalent);
  const ipcTitle = toText(bnsSection?.ipcTitle, "");
  const urgencyReason = toText(classification?.urgencyReason);

  drawHeader(doc, generatedOn);

  let y = 98;

  y = sectionTitle(doc, y, "Document Metadata", generatedOn);
  y = keyValue(doc, y, "Document Type", "FIR Legal Draft", generatedOn);
  y = keyValue(
    doc,
    y,
    "Statement ID",
    toText(statementRecord?.id),
    generatedOn,
  );
  y = keyValue(doc, y, "Prepared On", generatedOn, generatedOn);
  y += 14;

  y = sectionTitle(doc, y, "Complainant Information", generatedOn);
  y = keyValue(doc, y, "Full Name", toText(user?.name), generatedOn);
  y = keyValue(doc, y, "Email", toText(user?.email), generatedOn);
  y = keyValue(doc, y, "Phone", toText(user?.phone), generatedOn);
  y = keyValue(
    doc,
    y,
    "Preferred Language",
    toText(user?.language),
    generatedOn,
  );
  y += 14;

  y = sectionTitle(doc, y, "Incident Registration Details", generatedOn);
  y = keyValue(
    doc,
    y,
    "Recorded At",
    fmtDate(statementRecord?.createdAt),
    generatedOn,
  );
  y = keyValue(
    doc,
    y,
    "Incident Date",
    fmtDate(statementRecord?.incidentDate),
    generatedOn,
  );
  y = keyValue(
    doc,
    y,
    "Incident Time",
    toText(statementRecord?.incidentTime),
    generatedOn,
  );
  y = keyValue(
    doc,
    y,
    "Location",
    toText(statementRecord?.incidentLocation),
    generatedOn,
  );
  y = keyValue(
    doc,
    y,
    "Witness Details",
    toText(statementRecord?.witnessDetails),
    generatedOn,
  );
  y += 14;

  y = sectionTitle(doc, y, "Accused Person Details", generatedOn);
  y = keyValue(
    doc,
    y,
    "Name",
    toText(extractedMeta.accusedPersonName),
    generatedOn,
  );
  y = keyValue(
    doc,
    y,
    "Address",
    toText(extractedMeta.accusedAddress),
    generatedOn,
  );
  y = keyValue(
    doc,
    y,
    "Assets Description",
    toText(extractedMeta.assetsDescription),
    generatedOn,
  );
  y += 14;

  y = sectionTitle(doc, y, "Recorded Statement", generatedOn);
  y = paragraphBlock(doc, y, statementText, generatedOn);
  y += 10;

  if (classification || resolution) {
    y = sectionTitle(doc, y, "Preliminary Legal Classification", generatedOn);
    y = keyValue(
      doc,
      y,
      "Primary BNS Section",
      `BNS ${bnsNumber} - ${bnsTitle}`,
      generatedOn,
    );
    y = keyValue(
      doc,
      y,
      "IPC Equivalent",
      ipcTitle ? `IPC ${ipcEquivalent} - ${ipcTitle}` : `IPC ${ipcEquivalent}`,
      generatedOn,
    );
    y = keyValue(
      doc,
      y,
      "Confidence & Urgency",
      `${toText(classification?.confidenceScore, "N/A")} | ${toText(classification?.urgencyLevel, "N/A")}`,
      generatedOn,
    );
    y = keyValue(doc, y, "Urgency Reason", urgencyReason, generatedOn);
    y = keyValue(
      doc,
      y,
      "Punishment Range",
      toText(resolution?.punishmentRange),
      generatedOn,
    );
    y = keyValue(
      doc,
      y,
      "Fine Range",
      toText(resolution?.fineRange),
      generatedOn,
    );
    y = keyValue(
      doc,
      y,
      "Compensation Note",
      toText(resolution?.compensationNote),
      generatedOn,
    );
    y += 10;
  }

  const rightsList = Array.isArray(rights?.rights)
    ? (rights?.rights as AnyRecord[]).filter(Boolean).map((item) => ({
        title: toText(item?.title),
        detail: toText(item?.detail),
      }))
    : [];

  if (rightsList.length > 0) {
    y = sectionTitle(doc, y, "Victim Rights Snapshot", generatedOn);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    rightsList.slice(0, 5).forEach((right) => {
      y = addPage(doc, y, generatedOn, 22);
      const titleLine = `- ${right.title}`;
      const titleLines = doc.splitTextToSize(
        titleLine,
        width - PAGE_MARGIN * 2,
      ) as string[];
      doc.text(titleLines, PAGE_MARGIN + 8, y);
      y += titleLines.length * LINE_HEIGHT;

      const detailLines = doc.splitTextToSize(
        right.detail,
        width - PAGE_MARGIN * 2 - 20,
      ) as string[];
      y = addPage(doc, y, generatedOn, detailLines.length * LINE_HEIGHT + 4);
      doc.text(detailLines, PAGE_MARGIN + 20, y);
      y += detailLines.length * LINE_HEIGHT + 4;
    });
  }

  y = drawVictimSignatureBox(doc, y, generatedOn, signatureDataUrl);

  const totalPages =
    (
      doc.internal as { getNumberOfPages?: () => number }
    ).getNumberOfPages?.() ?? 1;

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawTopTricolor(doc);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Nyaya Setu Legal Drafting Pipeline", PAGE_MARGIN, height - 30);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Victim copy. Draft support document subject to legal verification by competent authority.",
      PAGE_MARGIN,
      height - 18,
    );
    doc.text(
      `Page ${page} of ${totalPages}`,
      width - PAGE_MARGIN - 45,
      height - 30,
    );
  }

  const suffix =
    typeof statementRecord?.id === "string"
      ? statementRecord.id.slice(-8)
      : Date.now().toString();

  doc.save(`victim-statement-report-${suffix}.pdf`);
};
