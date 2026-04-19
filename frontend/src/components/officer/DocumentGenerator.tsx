import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import type { MockFIR } from "../../data/officerMock";
import { officerService } from "../../services/officerService";
import { jsPDF } from "jspdf";

type Phase = "idle" | "loading" | "done";

const PDF_MARGIN = 50;
const LINE_H = 14;

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
const drawPageDecoration = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  drawPageBorder(doc);

  const docAny = doc as any;
  const canUseGState =
    typeof docAny.GState === "function" &&
    typeof docAny.setGState === "function";

  try {
    if (canUseGState) {
      docAny.setGState(new docAny.GState({ opacity: 0.05 }));
    }
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);
    doc.text("NYAYA SETU", pw / 2 - 145, ph / 2 - 20, { angle: 45 } as any);
    doc.setFontSize(24);
    doc.text("OFFICIAL", pw / 2 - 70, ph / 2 + 70, { angle: 45 } as any);
  } catch {
    doc.setTextColor(203, 213, 225);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("NYAYA SETU OFFICIAL", pw / 2 - 130, ph / 2);
  } finally {
    if (canUseGState) {
      docAny.setGState(new docAny.GState({ opacity: 1 }));
    }
  }
};

const addPage = (doc: jsPDF, y: number, needed = LINE_H + 4): number => {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - PDF_MARGIN) {
    doc.addPage();
    drawPageDecoration(doc);
    return PDF_MARGIN + 30;
  }
  return y;
};

const drawPageBorder = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 224, 232); // Slate 200
  doc.setLineWidth(1);
  doc.rect(20, 20, pw - 40, ph - 40);
  doc.setDrawColor(234, 88, 12); // Orange 600 accent
  doc.setLineWidth(2);
  doc.line(20, 20, 100, 20); // Top left accent
  doc.line(20, 20, 20, 100);
};

const sectionHeader = (doc: jsPDF, text: string, y: number): number => {
  const pw = doc.internal.pageSize.getWidth();
  y = addPage(doc, y, 35);
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(PDF_MARGIN, y, pw - PDF_MARGIN * 2, 22, "F");
  // Accent bar
  doc.setFillColor(234, 88, 12); // Orange 600
  doc.rect(PDF_MARGIN, y, 4, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(text.toUpperCase(), PDF_MARGIN + 12, y + 15);
  return y + 34;
};

const labelValue = (
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  lw = 140,
  isStripe = false,
): number => {
  const pw = doc.internal.pageSize.getWidth();
  y = addPage(doc, y, LINE_H + 6);

  if (isStripe) {
    doc.setFillColor(248, 250, 252);
    doc.rect(PDF_MARGIN, y - 10, pw - PDF_MARGIN * 2, LINE_H + 8, "F");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${label}`, PDF_MARGIN + 5, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  const wrapped = doc.splitTextToSize(
    value,
    pw - PDF_MARGIN * 2 - lw - 10,
  ) as string[];
  doc.text(wrapped, PDF_MARGIN + lw, y);
  return y + Math.max(LINE_H, wrapped.length * LINE_H) + 2;
};

const textBlock = (doc: jsPDF, text: string, y: number): number => {
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - PDF_MARGIN * 2;
  const innerW = contentW - 20;
  const lines = doc.splitTextToSize(text.trim(), innerW) as string[];
  const blockH = lines.length * LINE_H + 20;

  y = addPage(doc, y, blockH);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.rect(PDF_MARGIN, y, contentW, blockH, "FD");

  // Quote mark accent
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(226, 232, 240);
  doc.text('"', PDF_MARGIN + 8, y + 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  let ty = y + 16;
  for (const line of lines) {
    ty = addPage(doc, ty);
    doc.text(line, PDF_MARGIN + 12, ty);
    ty += LINE_H;
  }
  return Math.max(ty, y + blockH) + 14;
};

/* ── PDF generation ────────────────────────────────────────────────── */
const buildFirPdf = (fir: MockFIR) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const normalizedFirNumber = normalizeFirNumber(fir.firNo);
  const statementSource =
    fir.statementHistory?.[0]?.text?.trim() ||
    fir.statement ||
    fir.aiSummaryDefault ||
    "Statement pending.";
  const extractedMeta = extractPrefilledMeta(statementSource);
  const statementSourceClean =
    stripPrefilledMeta(statementSource) || statementSource;
  const ph = doc.internal.pageSize.getHeight();

  // Draw Header Letterhead
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pw, 80, "F");
  // Gradient/Accent bottom of header
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 80, pw, 4, "F");

  // Seal / Emblem Placeholder
  doc.setDrawColor(255, 255, 255);
  doc.circle(PDF_MARGIN + 15, 40, 18, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("A I", PDF_MARGIN + 5, 45);

  doc.setFontSize(22);
  doc.text("NYAYA SETU", PDF_MARGIN + 45, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Official First Information Report (Digital Gen)",
    PDF_MARGIN + 47,
    52,
  );
  doc.text("Government of India Initiative", PDF_MARGIN + 47, 64);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    pw - PDF_MARGIN - 130,
    48,
  );

  // Draw border + watermark before body content to prevent overlaying the text later.
  drawPageDecoration(doc);

  let y = 120;

  // FIR Details Table
  y = sectionHeader(doc, "Incident Registration Details", y);
  y = labelValue(
    doc,
    "FIR Reference Number",
    normalizedFirNumber,
    y,
    160,
    true,
  );
  y = labelValue(doc, "Current Status", fir.status, y, 160, false);
  y = labelValue(doc, "Priority Level", fir.urgency, y, 160, true);
  y = labelValue(doc, "Date / Time Received", fir.received, y, 160, false);
  y = labelValue(doc, "Date of Incident", fir.incidentDate, y, 160, true);
  y = labelValue(doc, "Location of Incident", fir.location, y, 160, false);
  y = labelValue(
    doc,
    "Accused Person Name",
    extractedMeta.accusedPersonName,
    y,
    160,
    true,
  );
  y = labelValue(
    doc,
    "Accused Person Address",
    extractedMeta.accusedAddress,
    y,
    160,
    false,
  );
  y = labelValue(
    doc,
    "Assets Description (If Any)",
    extractedMeta.assetsDescription,
    y,
    160,
    true,
  );
  y += 15;

  // Victim
  y = sectionHeader(doc, "Complainant Information", y);
  y = labelValue(doc, "Full Name", fir.victimName, y, 160, true);
  y = labelValue(doc, "Contact No", fir.victimPhone, y, 160, false);
  y += 15;

  // Statement
  y = sectionHeader(doc, "Recorded Statement", y);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Voice-to-text transcript generated by AI pipeline.", PDF_MARGIN, y);
  y += 18;
  y = textBlock(doc, statementSourceClean, y);

  // AI Summary
  if (fir.aiSummaryDefault) {
    y = sectionHeader(doc, "Executive Summary (AI)", y);
    y = textBlock(doc, fir.aiSummaryDefault, y);
  }

  // BNS / IPC Sections (from model)
  if (fir.sectionMappings && fir.sectionMappings.length > 0) {
    y = sectionHeader(
      doc,
      `Legal Mapping By AI [${fir.sectionMappings.length} Identified Clause${fir.sectionMappings.length > 1 ? "s" : ""}]`,
      y,
    );

    for (let i = 0; i < fir.sectionMappings.length; i++) {
      const sec = fir.sectionMappings[i];
      const pendingDesc = sec.description
        ? (doc.splitTextToSize(
            sec.description,
            pw - PDF_MARGIN * 2 - 24,
          ) as string[])
        : [];
      const pendingReason = sec.reasoning
        ? (doc.splitTextToSize(
            `Rationale: ${sec.reasoning}`,
            pw - PDF_MARGIN * 2 - 24,
          ) as string[])
        : [];

      let firstChunk = true;
      while (firstChunk || pendingDesc.length > 0 || pendingReason.length > 0) {
        const showIpc = firstChunk && Boolean(sec.ipcEquivalent);
        const needsReason = pendingReason.length > 0;

        const fixedHeight =
          84 +
          (showIpc ? LINE_H + 4 : 0) +
          (pendingDesc.length > 0 ? 4 : 0) +
          (needsReason ? 8 : 0);

        y = addPage(doc, y, fixedHeight + LINE_H * 2);

        const availableHeight = ph - PDF_MARGIN - y - 14;
        const lineBudget = Math.max(
          2,
          Math.floor((availableHeight - fixedHeight) / LINE_H),
        );

        const descTake = Math.min(pendingDesc.length, lineBudget);
        const descLines = pendingDesc.splice(0, descTake);
        const reasonTake = Math.min(
          pendingReason.length,
          Math.max(0, lineBudget - descLines.length),
        );
        const rLines = pendingReason.splice(0, reasonTake);

        const cardH =
          84 +
          (showIpc ? LINE_H + 4 : 0) +
          descLines.length * LINE_H +
          (descLines.length > 0 ? 4 : 0) +
          (rLines.length > 0 ? 8 + rLines.length * LINE_H : 0) +
          10;

        y = addPage(doc, y, cardH + 2);
        const cardY = y;

        const isNonBailable = !sec.bailable;

        // Shadow
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(
          PDF_MARGIN + 3,
          cardY + 3,
          pw - PDF_MARGIN * 2,
          cardH,
          4,
          4,
          "F",
        );

        // Card background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(
          isNonBailable ? 239 : 203,
          isNonBailable ? 68 : 213,
          isNonBailable ? 68 : 225,
        );
        doc.setLineWidth(1);
        doc.roundedRect(
          PDF_MARGIN,
          cardY,
          pw - PDF_MARGIN * 2,
          cardH,
          4,
          4,
          "FD",
        );

        // Top colored bar
        doc.setFillColor(
          isNonBailable ? 239 : 15,
          isNonBailable ? 68 : 23,
          isNonBailable ? 68 : 42,
        );
        try {
          doc.roundedRect(
            PDF_MARGIN,
            cardY,
            pw - PDF_MARGIN * 2,
            28,
            4,
            4,
            "F",
          );
          doc.rect(PDF_MARGIN, cardY + 14, pw - PDF_MARGIN * 2, 14, "F");
        } catch {
          doc.rect(PDF_MARGIN, cardY, pw - PDF_MARGIN * 2, 28, "F");
        }

        let ry = cardY + 18;

        // Title & BNS Number Inside Top Bar
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`BNS §${sec.sectionNumber}`, PDF_MARGIN + 12, ry);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const titleBase =
          sec.sectionTitle.length > 50
            ? `${sec.sectionTitle.substring(0, 47)}...`
            : sec.sectionTitle;
        const titleWithChunk = firstChunk ? titleBase : `${titleBase} (cont.)`;
        doc.text(`|  ${titleWithChunk}`, PDF_MARGIN + 75, ry);

        ry += 24;

        // Badges
        const cogColor: [number, number, number] = sec.cognizable
          ? [220, 38, 38]
          : [100, 116, 139];
        const bailColor: [number, number, number] = sec.bailable
          ? [22, 163, 74]
          : [220, 38, 38];

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(...cogColor);
        doc.roundedRect(PDF_MARGIN + 12, ry - 10, 85, 14, 2, 2, "F");
        doc.setTextColor(255);
        doc.text(
          sec.cognizable ? "COGNIZABLE" : "NON-COGNIZABLE",
          PDF_MARGIN + 16,
          ry,
        );

        doc.setFillColor(...bailColor);
        doc.roundedRect(PDF_MARGIN + 105, ry - 10, 85, 14, 2, 2, "F");
        doc.text(
          sec.bailable ? "BAILABLE" : "NON-BAILABLE",
          PDF_MARGIN + 109,
          ry,
        );

        ry += 18;

        if (showIpc) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105);
          doc.text(
            `IPC Equivalent: §${sec.ipcEquivalent}${sec.ipcTitle ? `  —  ${sec.ipcTitle}` : ""}`,
            PDF_MARGIN + 12,
            ry,
          );
          ry += LINE_H + 4;
        }

        if (descLines.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(30, 41, 59);
          for (const line of descLines) {
            doc.text(line, PDF_MARGIN + 12, ry);
            ry += LINE_H;
          }
          ry += 4;
        }

        if (rLines.length > 0) {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(1);
          doc.line(PDF_MARGIN + 12, ry - 6, pw - PDF_MARGIN - 12, ry - 6);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          for (const line of rLines) {
            doc.text(line, PDF_MARGIN + 12, ry + 4);
            ry += LINE_H;
          }
        }

        y = cardY + cardH + 18;
        firstChunk = false;
      }
    }
  } else {
    y = addPage(doc, y, 30);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No sections mapped.", PDF_MARGIN, y);
    y += 20;
  }

  // Primary section summary table
  y = sectionHeader(doc, "Primary Offence Validation", y);
  y = labelValue(
    doc,
    "Primary BNS Core",
    `${fir.bnsCode} — ${fir.bnsTitle}`,
    y,
    160,
    true,
  );
  y = labelValue(doc, "IPC Equivalent", fir.ipcEquiv, y, 160, false);
  y = labelValue(doc, "Projected Punishment", fir.punishmentLine, y, 160, true);
  y = labelValue(doc, "Nature", fir.cognizable, y, 160, false);
  y = labelValue(doc, "Bail Status", fir.bailable, y, 160, true);
  y += 15;

  // ── CITIZEN RIGHTS & LEGAL REMEDIES ────────────────────────────────
  const rights: Array<{ title: string; detail: string }> = [
    {
      title: "Free FIR Copy (Section 173 BNSS)",
      detail: "Immediate right to a free official copy of this registered FIR.",
    },
    {
      title: "Zero FIR (Section 173(1) BNSS)",
      detail:
        "Can be filed regardless of jurisdiction, to be transferred later.",
    },
    {
      title: "Free Legal Aid (Art. 39A)",
      detail:
        "Entitlement to free state legal representation via District Legal Services Authority.",
    },
    {
      title: "Medical Exam (Section 184 BNSS)",
      detail: "Right to free medical examination for violent offenses.",
    },
  ];

  y = sectionHeader(doc, "Statutory Rights", y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Select guaranteed rights under BNSS 2023:", PDF_MARGIN, y);
  y += 18;

  // 2-grid layout for rights
  const colW = (pw - PDF_MARGIN * 2) / 2 - 10;
  for (let i = 0; i < rights.length; i += 2) {
    y = addPage(doc, y, 40);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.roundedRect(PDF_MARGIN, y, colW, 45, 3, 3, "FD");
    // Number Box
    doc.setFillColor(15, 23, 42);
    doc.rect(PDF_MARGIN, y, 20, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), PDF_MARGIN + 6, y + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(rights[i].title, PDF_MARGIN + 26, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      doc.splitTextToSize(rights[i].detail, colW - 30) as string[],
      PDF_MARGIN + 26,
      y + 26,
    );

    if (rights[i + 1]) {
      const r2X = PDF_MARGIN + colW + 20;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.roundedRect(r2X, y, colW, 45, 3, 3, "FD");

      doc.setFillColor(15, 23, 42);
      doc.rect(r2X, y, 20, 20, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 2), r2X + 6, y + 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(rights[i + 1].title, r2X + 26, y + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        doc.splitTextToSize(rights[i + 1].detail, colW - 30) as string[],
        r2X + 26,
        y + 26,
      );
    }
    y += 55;
  }

  // Footer and Watermarks on all pages
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(PDF_MARGIN, ph - 45, pw - PDF_MARGIN, ph - 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("NyayaSetu AI Pipeline", PDF_MARGIN, ph - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Subject to manual inspection and verification by the Investigation Officer.",
      PDF_MARGIN,
      ph - 18,
    );
    doc.text(`PAGE ${p} / ${totalPages}`, pw - PDF_MARGIN - 35, ph - 30);
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
