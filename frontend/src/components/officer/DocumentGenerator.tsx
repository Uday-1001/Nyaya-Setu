import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import type { MockFIR } from "../../data/officerMock";
import { officerService } from "../../services/officerService";
import { jsPDF } from "jspdf";

type Phase = "idle" | "loading" | "done";

const PDF_MARGIN = 50;
const LINE_H = 14;
const PAGE_BOTTOM_SAFE = 72;

const normalizeInlineText = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();

const isPendingMapping = (value: string | undefined | null) => {
  const normalized = normalizeInlineText(String(value ?? "")).toLowerCase();
  return (
    !normalized ||
    normalized.includes("pending") ||
    normalized.includes("manual legal review") ||
    normalized.includes("not determined")
  );
};

const getClauseDisplay = (sectionNumber: string, sectionTitle: string) => {
  const pending =
    isPendingMapping(sectionNumber) ||
    isPendingMapping(sectionTitle) ||
    normalizeInlineText(sectionNumber) === "0";

  if (pending) {
    return {
      clauseLabel: "BNSS Clause",
      clauseValue: "Not Determined (Manual Legal Review Required)",
    };
  }

  return {
    clauseLabel: "BNSS Clause",
    clauseValue: `Section ${normalizeInlineText(sectionNumber)}`,
  };
};

const normalizeFirNumber = (value: string) =>
  /^\d{7}$/.test(value) ? value : (value.match(/\d{7}/)?.[0] ?? value);

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
    accusedPersonName: readValue("Accused person name") || "Not provided",
    accusedAddress: readValue("Accused person address") || "Not provided",
    assetsDescription: readValue("Assets description") || "Not provided",
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

/* ── PDF helpers ────────── */
const drawTopTricolor = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(255, 153, 51);
  doc.rect(0, 0, pw, 6, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 6, pw, 6, "F");
  doc.setFillColor(19, 136, 8);
  doc.rect(0, 12, pw, 6, "F");
};

const drawPageHeader = (doc: jsPDF, generatedOn: string) => {
  const pw = doc.internal.pageSize.getWidth();
  drawTopTricolor(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(15, 23, 42);
  doc.text("NYAYA SETU", PDF_MARGIN, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("First Information Report Document", PDF_MARGIN, 58);

  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Generated: ${generatedOn}`, pw - PDF_MARGIN - 170, 44);

  doc.setFontSize(9);
  doc.text(
    "Digital Draft - For official review and authentication",
    pw - PDF_MARGIN - 220,
    58,
  );
};

const addPage = (
  doc: jsPDF,
  y: number,
  generatedOn: string,
  needed = LINE_H + 4,
): number => {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - PAGE_BOTTOM_SAFE) {
    doc.addPage();
    drawPageHeader(doc, generatedOn);
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
  doc.text(title.toUpperCase(), PDF_MARGIN, y);
  return y + 18;
};

const keyValue = (
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  generatedOn: string,
): number => {
  const pw = doc.internal.pageSize.getWidth();
  y = addPage(doc, y, generatedOn, LINE_H + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${label}:`, PDF_MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const normalizedValue = value?.trim() ? value : "Not provided";
  const wrapped = doc.splitTextToSize(
    normalizedValue,
    pw - PDF_MARGIN - 200,
  ) as string[];
  doc.text(wrapped, PDF_MARGIN + 180, y);

  return y + Math.max(LINE_H, wrapped.length * LINE_H) + 2;
};

const paragraphBlock = (
  doc: jsPDF,
  text: string,
  y: number,
  generatedOn: string,
): number => {
  const pw = doc.internal.pageSize.getWidth();
  const source = text.trim() || "Statement pending.";
  const paragraphs = source
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(
      paragraph,
      pw - PDF_MARGIN * 2 - 10,
    ) as string[];
    y = addPage(doc, y, generatedOn, lines.length * LINE_H + 6);
    doc.text(lines, PDF_MARGIN + 10, y);
    y += lines.length * LINE_H + 6;
  }

  return y + 2;
};

/* ── PDF generation ────────────────────────────────────────────────── */
const buildFirPdf = (fir: MockFIR) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const normalizedFirNumber = normalizeFirNumber(fir.firNo);
  const generatedOn = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const statementSource =
    fir.statementHistory?.[0]?.text?.trim() ||
    fir.statement ||
    fir.aiSummaryDefault ||
    "Statement pending.";
  const extractedMeta = extractPrefilledMeta(statementSource);
  const statementSourceClean =
    stripPrefilledMeta(statementSource) || statementSource;
  const ph = doc.internal.pageSize.getHeight();

  drawPageHeader(doc, generatedOn);

  let y = 98;

  y = sectionTitle(doc, y, "Document Metadata", generatedOn);
  y = keyValue(doc, y, "Document Type", "FIR Legal Draft", generatedOn);
  y = keyValue(doc, y, "Document Number", normalizedFirNumber, generatedOn);
  y = keyValue(doc, y, "Prepared On", generatedOn, generatedOn);
  y += 14;

  y = sectionTitle(doc, y, "Incident Registration Details", generatedOn);
  y = keyValue(
    doc,
    y,
    "FIR Reference Number",
    normalizedFirNumber,
    generatedOn,
  );
  y = keyValue(doc, y, "Current Status", fir.status, generatedOn);
  y = keyValue(doc, y, "Priority Level", fir.urgency, generatedOn);
  y = keyValue(doc, y, "Date / Time Received", fir.received, generatedOn);
  y = keyValue(doc, y, "Date of Incident", fir.incidentDate, generatedOn);
  y = keyValue(doc, y, "Location of Incident", fir.location, generatedOn);
  y += 14;

  y = sectionTitle(doc, y, "Complainant Information", generatedOn);
  y = keyValue(doc, y, "Full Name", fir.victimName, generatedOn);
  y = keyValue(doc, y, "Contact Number", fir.victimPhone, generatedOn);
  y += 14;

  y = sectionTitle(doc, y, "Accused Person Details", generatedOn);
  y = keyValue(doc, y, "Name", extractedMeta.accusedPersonName, generatedOn);
  y = keyValue(doc, y, "Address", extractedMeta.accusedAddress, generatedOn);
  y = keyValue(
    doc,
    y,
    "Assets Description",
    extractedMeta.assetsDescription,
    generatedOn,
  );
  y += 14;

  y = sectionTitle(doc, y, "Recorded Statement", generatedOn);
  y = paragraphBlock(doc, statementSourceClean, y, generatedOn);
  y += 10;

  if (fir.aiSummaryDefault) {
    y = sectionTitle(doc, y, "Executive Summary", generatedOn);
    y = paragraphBlock(doc, fir.aiSummaryDefault, y, generatedOn);
    y += 10;
  }

  y = sectionTitle(doc, y, "Preliminary Legal Classification", generatedOn);
  if (fir.sectionMappings && fir.sectionMappings.length > 0) {
    for (let i = 0; i < fir.sectionMappings.length; i += 1) {
      const sec = fir.sectionMappings[i];
      const clause = getClauseDisplay(sec.sectionNumber, sec.sectionTitle);
      const clauseTitle =
        normalizeInlineText(sec.sectionTitle) || "Manual legal review required";
      const ipcValue = sec.ipcEquivalent
        ? `Section ${normalizeInlineText(sec.ipcEquivalent)}${sec.ipcTitle ? ` - ${normalizeInlineText(sec.ipcTitle)}` : ""}`
        : "Not available";
      const nature = sec.cognizable ? "Cognizable" : "Non-Cognizable";
      const bail = sec.bailable ? "Bailable" : "Non-Bailable";
      const reasoning = normalizeInlineText(
        sec.reasoning ||
          "Automated pipeline requires manual legal validation for final determination.",
      );

      y = addPage(doc, y, generatedOn, 78);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Clause ${i + 1}`, PDF_MARGIN, y);
      y += 14;

      y = keyValue(doc, y, clause.clauseLabel, clause.clauseValue, generatedOn);
      y = keyValue(doc, y, "Title", clauseTitle, generatedOn);
      y = keyValue(doc, y, "Nature", `${nature}; ${bail}`, generatedOn);
      y = keyValue(doc, y, "IPC Equivalent", ipcValue, generatedOn);
      y = keyValue(doc, y, "Reasoning", reasoning, generatedOn);
      y += 8;
    }
  } else {
    y = addPage(doc, y, generatedOn, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(
      "No legal section could be mapped automatically. Manual legal review required.",
      PDF_MARGIN,
      y,
    );
    y += 20;
  }

  y = addPage(doc, y, generatedOn, 160);
  y = sectionTitle(doc, y, "Signature Area", generatedOn);
  const signBoxY = y;
  const signBoxW = pw - PDF_MARGIN * 2;
  const signBoxH = 112;
  const halfW = signBoxW / 2;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.rect(PDF_MARGIN, signBoxY, signBoxW, signBoxH);
  doc.line(
    PDF_MARGIN + halfW,
    signBoxY,
    PDF_MARGIN + halfW,
    signBoxY + signBoxH,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Victim Signature", PDF_MARGIN + 14, signBoxY + 24);
  doc.text("Officer Signature", PDF_MARGIN + halfW + 14, signBoxY + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Name:", PDF_MARGIN + 14, signBoxY + 48);
  doc.text("Date:", PDF_MARGIN + 14, signBoxY + 72);
  doc.text("Name:", PDF_MARGIN + halfW + 14, signBoxY + 48);
  doc.text("Date:", PDF_MARGIN + halfW + 14, signBoxY + 72);

  // Footer and Watermarks on all pages
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    drawTopTricolor(doc);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Nyaya Setu Legal Drafting Pipeline", PDF_MARGIN, ph - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Draft support document. Final legal determination remains with authorized police and judicial authorities.",
      PDF_MARGIN,
      ph - 18,
    );
    doc.text(`Page ${p} of ${totalPages}`, pw - PDF_MARGIN - 45, ph - 30);
  }

  const filename = `FIR_${normalizedFirNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
  doc.save(filename);
};

/* ── Component ─────────────────────────────────────────────────────── */
export const DocumentGenerator = ({ fir }: { fir: MockFIR }) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalizedFirNumber = normalizeFirNumber(fir.firNo);

  const items = [
    { ok: true, label: "Victim statement logged" },
    { ok: true, label: "BNS taxonomy approved" },
    { ok: !!fir.aiSummaryDefault, label: "AI legal summary verified" },
    {
      ok: fir.checklistVoiceOk,
      label: "Voice transcript anchored",
      warn: !fir.checklistVoiceOk,
    },
    {
      ok: fir.sectionMappings.length > 0,
      label: `${fir.sectionMappings.length} BNS mapping${fir.sectionMappings.length !== 1 ? "s" : ""} populated`,
      warn: fir.sectionMappings.length === 0,
    },
  ];

  const generate = async () => {
    setPhase("loading");
    setError(null);
    setMessage(null);
    try {
      await officerService.generateSummary(fir.id);
      buildFirPdf(fir);
      setPhase("done");
      setMessage("Official FIR document downloaded.");
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Document render failed.");
    }
  };

  return (
    <div>
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">
        Finalize & Download
      </p>
      <div className="mb-8 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            {item.ok ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A]/20 text-[#16A34A] ring-1 ring-inset ring-[#16A34A]/30">
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D97706]/20 text-[#D97706] ring-1 ring-inset ring-[#D97706]/30">
                <span className="text-[10px] font-bold">!</span>
              </div>
            )}
            <span className={item.warn ? "text-[#D97706]" : "text-[#E5E7EB]"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-6 space-y-2 rounded-xl bg-gradient-to-br from-[#1e293b]/80 to-[#0f172a] border border-[#334155] p-5 shadow-lg relative overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 border-t-[30px] border-l-[30px] border-t-[#ea580c] border-l-transparent" />

        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9CA3AF]">
          Active Document Context
        </p>
        <p className="text-white text-[15px] font-light mt-1">
          FIR: <span className="font-semibold">{normalizedFirNumber}</span>
        </p>
        <p className="text-[#cbd5e1] text-[13px] mt-1 font-mono">
          Top Section: {fir.bnsCode}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-3 py-1 text-[11px] font-mono text-[#94a3b8] ring-1 ring-inset ring-[#1e293b]">
          <span>TIMESTAMP AUTO-FILL</span>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm font-medium text-[#ef4444]">{error}</p>
      ) : null}
      {message ? (
        <p className="mb-4 text-sm font-medium text-[#22c55e]">{message}</p>
      ) : null}

      {phase === "loading" ? (
        <div className="flex items-center justify-center gap-3 py-5 text-[#9CA3AF] bg-[#0f172a]/50 rounded-xl border border-[#1e293b]">
          <Loader2 className="h-5 w-5 animate-spin text-[#ea580c]" />
          <span className="font-mono text-sm tracking-wide text-white">
            Rendering Premium PDF Document...
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void generate()}
          className="group relative inline-flex w-full overflow-hidden items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] py-4 text-sm font-extrabold uppercase tracking-widest text-white shadow-xl hover:from-[#f97316] hover:to-[#ea580c] transition-all duration-300"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-0 group-hover:opacity-100 transition-opacity" />
          <Download className="relative z-10 h-4 w-4" />
          <span className="relative z-10">
            {phase === "done" ? "Re-Download Document" : "Generate Secure PDF"}
          </span>
        </button>
      )}
    </div>
  );
};
