import type { ReactNode } from "react";

const AshokaMark = () => (
  <svg
    className="absolute bottom-6 right-6 w-[min(30vw,300px)] h-[min(30vw,300px)] pointer-events-none select-none text-white opacity-[0.03] z-0 animate-[spin_180s_linear_infinite]"
    viewBox="0 0 100 100"
    fill="none"
    aria-hidden
  >
    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" />
    {Array.from({ length: 24 }, (_, i) => {
      const a = ((i * 360) / 24 - 90) * (Math.PI / 180);
      return (
        <line
          key={i}
          x1={50 + 12 * Math.cos(a)}
          y1={50 + 12 * Math.sin(a)}
          x2={50 + 42 * Math.cos(a)}
          y2={50 + 42 * Math.sin(a)}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    })}
    <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const OfficerPageShell = ({ children }: { children: ReactNode }) => (
  <div className="h-screen bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col">
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(249,115,22,0.18),transparent_38%),radial-gradient(circle_at_82%_78%,rgba(19,136,8,0.12),transparent_40%),radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.55),rgba(2,6,23,0.9))]" />
      <div className="absolute -top-20 left-[8%] h-44 w-44 rounded-full bg-[#F97316]/8 blur-[44px]" />
      <div className="absolute bottom-[-40px] right-[10%] h-52 w-52 rounded-full bg-[#138808]/8 blur-[48px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
    <div className="fixed inset-x-0 top-0 z-[60] flex h-[3px]">
      <div className="flex-1 bg-[#FF9933]" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-[#138808]" />
    </div>
    <AshokaMark />
    <div className="relative z-[1] flex flex-col flex-1 min-h-0 pt-[3px] overflow-hidden">
      {children}
    </div>
    <footer className="relative z-[1] border-t border-white/[0.08] px-6 py-4 mt-auto shrink-0">
      <p className="text-center text-[11px] font-bold tracking-[0.2em] text-[#F97316]">
        सत्यमेव जयते
      </p>
      <p className="text-center text-[10px] text-[#6B7280] mt-1 font-mono">
        NyayaSetu — Digital Justice System · Officer Portal
      </p>
    </footer>
  </div>
);
