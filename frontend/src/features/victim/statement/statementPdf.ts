import { jsPDF } from "jspdf";
import type { User } from "../../../types/user.types";

type AnyRecord = Record<string, unknown>;

export type StatementPdfInput = {
  user: User | null;
  statement: AnyRecord | null;
  classification: AnyRecord | null;
  resolution: AnyRecord | null;
  rights: AnyRecord | null;
};

const PAGE_MARGIN = 40;
const LINE_HEIGHT = 13;

const toText = (value: unknown, fallback = "Not provided") => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
};

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
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const addWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = LINE_HEIGHT,
) => {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  lines.forEach((line, i) => {
    doc.text(line, x, y + i * lineHeight);
  });
  return y + Math.max(lines.length, 1) * lineHeight;
};

const ensurePageSpace = (doc: jsPDF, y: number, requiredHeight: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN + 10;
  }
  return y;
};

const sectionTitle = (doc: jsPDF, y: number, title: string) => {
  y = ensurePageSpace(doc, y, 30);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(
    PAGE_MARGIN,
    y - 12,
    pageWidth - PAGE_MARGIN * 2,
    20,
    3,
    3,
    "F",
  );
  doc.setFillColor(234, 88, 12);
  doc.roundedRect(PAGE_MARGIN, y - 12, 4, 20, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), PAGE_MARGIN + 10, y + 1);
  return y + 20;
};

const keyValue = (doc: jsPDF, y: number, key: string, value: string) => {
  y = ensurePageSpace(doc, y, 26);
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(PAGE_MARGIN, y - 11, contentWidth, 20, 2, 2, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(key, PAGE_MARGIN + 8, y + 1);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const valueX = PAGE_MARGIN + 170;
  const maxWidth = contentWidth - 180;
  const nextY = addWrappedText(doc, value, valueX, y + 1, maxWidth, 11);
  return Math.max(nextY + 3, y + 14);
};

export const downloadStatementReportPdf = ({
  user,
  statement,
  classification,
  resolution,
  rights,
}: StatementPdfInput) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

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
  const ipcTitle = toText(bnsSection?.ipcTitle);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 76, "F");
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 76, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Victim Statement Report", PAGE_MARGIN, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(
    "Generated from verified user statement and BNS-IPC mapping",
    PAGE_MARGIN,
    58,
  );

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let y = 112;
  y = sectionTitle(doc, y, "Complainant Details");
  y = keyValue(doc, y, "Full Name", toText(user?.name));
  y = keyValue(doc, y, "Email", toText(user?.email));
  y = keyValue(doc, y, "Phone", toText(user?.phone));
  y = keyValue(doc, y, "Gender", toText(user?.gender));
  y = keyValue(doc, y, "Preferred Language", toText(user?.language));

  y += 8;
  y = sectionTitle(doc, y, "Incident Details");
  y = keyValue(doc, y, "Statement ID", toText(statementRecord?.id));
  y = keyValue(doc, y, "Recorded At", fmtDate(statementRecord?.createdAt));
  y = keyValue(doc, y, "Incident Date", fmtDate(statementRecord?.incidentDate));
  y = keyValue(doc, y, "Incident Time", toText(statementRecord?.incidentTime));
  y = keyValue(doc, y, "Location", toText(statementRecord?.incidentLocation));
  y = keyValue(
    doc,
    y,
    "Accused Person Name",
    toText(extractedMeta.accusedPersonName),
  );
  y = keyValue(
    doc,
    y,
    "Accused Person Address",
    toText(extractedMeta.accusedAddress),
  );
  y = keyValue(
    doc,
    y,
    "Assets Description (If Any)",
    toText(extractedMeta.assetsDescription),
  );
  y = keyValue(
    doc,
    y,
    "Witness Details",
    toText(statementRecord?.witnessDetails),
  );

  y += 8;
  y = sectionTitle(doc, y, "Statement Narrative");
  y = ensurePageSpace(doc, y, 80);
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(
    PAGE_MARGIN,
    y - 10,
    pageWidth - PAGE_MARGIN * 2,
    110,
    3,
    3,
    "FD",
  );
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  y =
    addWrappedText(
      doc,
      statementText,
      PAGE_MARGIN + 10,
      y + 6,
      pageWidth - PAGE_MARGIN * 2 - 20,
      14,
    ) + 12;

  y += 4;
  y = sectionTitle(doc, y, "AI Legal Mapping");
  y = keyValue(doc, y, "Primary BNS Section", `BNS ${bnsNumber} - ${bnsTitle}`);
  y = keyValue(
    doc,
    y,
    "IPC Equivalent",
    `IPC ${ipcEquivalent}${ipcTitle !== "Not provided" ? ` - ${ipcTitle}` : ""}`,
  );
  y = keyValue(
    doc,
    y,
    "Confidence & Urgency",
    `${toText(classification?.confidenceScore, "N/A")} | ${toText(classification?.urgencyLevel, "N/A")}`,
  );
  y = keyValue(doc, y, "Urgency Reason", toText(classification?.urgencyReason));

  y += 8;
  y = sectionTitle(doc, y, "Expected Resolution");
  y = keyValue(doc, y, "Punishment Range", toText(resolution?.punishmentRange));
  y = keyValue(doc, y, "Fine Range", toText(resolution?.fineRange));
  y = keyValue(
    doc,
    y,
    "Compensation Note",
    toText(resolution?.compensationNote),
  );

  const nextSteps = Array.isArray(resolution?.expectedNextSteps)
    ? (resolution?.expectedNextSteps as unknown[])
        .filter(Boolean)
        .map((x) => String(x))
    : [];

  if (nextSteps.length > 0) {
    y = ensurePageSpace(doc, y, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Immediate Next Steps", PAGE_MARGIN + 4, y + 4);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    nextSteps.forEach((step) => {
      y = ensurePageSpace(doc, y, 18);
      y =
        addWrappedText(
          doc,
          `• ${step}`,
          PAGE_MARGIN + 8,
          y,
          pageWidth - PAGE_MARGIN * 2 - 16,
          12,
        ) + 2;
    });
  }

  const rightsList = Array.isArray(rights?.rights)
    ? (rights?.rights as AnyRecord[]).map((item) => ({
        title: toText(item?.title),
        detail: toText(item?.detail),
      }))
    : [];

  if (rightsList.length > 0) {
    y += 8;
    y = sectionTitle(doc, y, "Victim Rights Snapshot");
    rightsList.slice(0, 5).forEach((right) => {
      y = ensurePageSpace(doc, y, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      y = addWrappedText(
        doc,
        `• ${right.title}`,
        PAGE_MARGIN + 5,
        y,
        pageWidth - PAGE_MARGIN * 2 - 10,
        12,
      );
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      y =
        addWrappedText(
          doc,
          right.detail,
          PAGE_MARGIN + 18,
          y + 1,
          pageWidth - PAGE_MARGIN * 2 - 22,
          11,
        ) + 3;
    });
  }

  const totalPages =
    (
      doc.internal as { getNumberOfPages?: () => number }
    ).getNumberOfPages?.() ?? 1;
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}  |  Page ${page} of ${totalPages}`,
      PAGE_MARGIN,
      pageHeight - 18,
    );
    doc.text(
      "Nyaya Setu - Victim Statement Intelligence",
      pageWidth - PAGE_MARGIN - 180,
      pageHeight - 18,
    );
  }

  const suffix =
    typeof statementRecord?.id === "string"
      ? statementRecord.id.slice(-8)
      : Date.now().toString();
  doc.save(`victim-statement-report-${suffix}.pdf`);
};
