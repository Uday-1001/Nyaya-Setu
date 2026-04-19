import { Link } from "react-router-dom";
import type { MockFIR } from "../../data/officerMock";
import { FIRCard } from "./FIRCard";

export const UrgencyQueue = ({ items }: { items: MockFIR[] }) => (
  <section className="p-1">
    <div className="mb-8">
      <p
        className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase"
        style={{
          background: "linear-gradient(90deg, #F97316 0%, #6B7280 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        — प्राथमिकता · URGENCY QUEUE
      </p>
      <p className="text-xs text-[#6B7280] mt-1 transition-colors hover:text-[#F97316]">
        Active FIRs requiring attention, dynamically sorted by severity matrix.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {items.map((f) => (
        <div key={f.id}>
          <FIRCard fir={f} />
        </div>
      ))}
    </div>

    <div className="mt-8 flex justify-center">
      <Link
        to="/officer/fir"
        className="text-xs px-6 py-2 rounded-full border border-white/10 font-semibold text-[#9CA3AF] hover:text-[#F97316] hover:bg-[#F97316]/10 hover:border-[#F97316]/30 transition-all duration-300 inline-flex items-center gap-2 group shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
      >
        Access Complete FIR Database
        <span className="group-hover:translate-x-1 transition-transform duration-300">
          →
        </span>
      </Link>
    </div>
  </section>
);
