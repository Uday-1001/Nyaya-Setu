import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { MockFIR, Urgency } from "../../data/officerMock";

const border = (u: Urgency) => {
  if (u === "CRITICAL") return "border-l-[#DC2626]";
  if (u === "HIGH") return "border-l-[#F97316]";
  if (u === "MEDIUM") return "border-l-[#D97706]";
  return "border-l-[#16A34A]";
};

const badge = (u: Urgency) => {
  if (u === "CRITICAL")
    return "bg-[#DC2626]/15 text-[#FCA5A5] border border-[#DC2626]/40";
  if (u === "HIGH")
    return "bg-[#F97316]/15 text-[#FDBA74] border border-[#F97316]/35";
  if (u === "MEDIUM")
    return "bg-[#D97706]/15 text-[#FCD34D] border border-[#D97706]/35";
  return "bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/35";
};

export const FIRCard = ({ fir }: { fir: MockFIR }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/officer/fir/${fir.id}`)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`w-full text-left rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] border-l-[4px] ${border(fir.urgency)} p-5 group cursor-pointer relative z-10 transition-colors shadow-lg hover:bg-white/[0.06]`}
    >
      <div className="relative z-20 pointer-events-none">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <span
            className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${badge(fir.urgency)}`}
          >
            {fir.urgency}
          </span>
          <div className="flex flex-wrap items-center gap-3 text-right ml-auto">
            <span className="font-mono text-sm font-bold text-[#F97316] group-hover:text-[#FFB366] transition-colors drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">
              {fir.firNo}
            </span>
            <span className="font-mono text-xs text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors">
              {fir.received.split(",")[1]?.trim() ?? fir.received}
            </span>
          </div>
        </div>

        <p className="text-white font-bold text-sm mb-1 group-hover:text-[#FFE4CC] transition-colors">
          BNS {fir.bnsCode} — {fir.bnsTitle}{" "}
          <span className="text-[#6B7280] font-semibold group-hover:text-[#9CA3AF] transition-colors ml-1">
            (IPC {fir.ipcEquiv})
          </span>
        </p>

        <p className="text-sm text-[#9CA3AF] mb-4 group-hover:text-white transition-colors">
          {fir.location}
        </p>

        <p className="text-xs text-[#6B7280] mb-4 group-hover:text-[#9CA3AF] transition-colors bg-black/20 p-2 rounded-md border border-white/5">
          <span className="text-white/60 font-semibold mr-1">AI Scan:</span>
          {fir.aiSummaryLine}
        </p>

        <div className="flex justify-end mt-2">
          <span className="inline-flex items-center text-sm font-bold text-[#F97316] group-hover:text-[#FFB366] transition-all duration-300 gap-1 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
            Review Case Document
            <span className="group-hover:translate-x-2 transition-transform duration-300">
              →
            </span>
          </span>
        </div>
      </div>
    </motion.button>
  );
};
