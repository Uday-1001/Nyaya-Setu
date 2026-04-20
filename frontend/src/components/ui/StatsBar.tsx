import React, { useEffect, useState } from "react";
import { platformStatsService } from "../../services/platformStatsService";

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 900;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextValue = Math.round(start + (end - start) * progress);
      setDisplay(nextValue);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display.toLocaleString("en-IN")}</>;
};

export const StatsBar: React.FC = () => {
  const [liveStats, setLiveStats] = useState<{
    totalFirs: number;
    bnsSections: number;
    bnssSections: number;
    activeOfficers: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const stats = await platformStatsService.getPublicStats();
        if (!mounted) return;
        setLiveStats({
          totalFirs: stats.totalFirs,
          bnsSections: stats.bnsSections,
          bnssSections: stats.bnssSections,
          activeOfficers: stats.activeOfficers,
        });
      } catch {
        if (!mounted) return;
        setLiveStats(null);
      }
    };

    void loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="bg-transparent border-y border-white/[0.06] py-16 px-8 relative z-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase mb-10">
          — LIVE PLATFORM STATISTICS
        </h2>

        <div className="flex flex-col md:flex-row gap-10 md:gap-0 justify-between md:divide-x divide-white/[0.08]">
          {[
            {
              n: liveStats ? (
                <AnimatedNumber value={liveStats.totalFirs} />
              ) : null,
              enl: "Total FIRs",
              hil: "कुल FIR",
            },
            {
              n: liveStats ? (
                <AnimatedNumber value={liveStats.bnsSections} />
              ) : null,
              enl: "BNS Sections",
              hil: "BNS धाराएं",
            },
            {
              n: liveStats ? (
                <AnimatedNumber value={liveStats.bnssSections} />
              ) : null,
              enl: "BNSS Sections",
              hil: "BNSS धाराएं",
            },
            {
              n: liveStats ? (
                <AnimatedNumber value={liveStats.activeOfficers} />
              ) : null,
              enl: "Active Officers",
              hil: "सक्रिय अधिकारी",
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`flex flex-col flex-1 ${i !== 0 ? "md:pl-10" : ""}`}
            >
              <span className="text-white text-[52px] font-bold leading-[1.1] mb-2 min-h-[60px] flex items-center">
                {s.n ?? (
                  <span className="inline-block h-10 w-24 rounded-md bg-white/[0.08] animate-pulse" />
                )}
              </span>
              <span className="text-slate-400 text-xs tracking-widest uppercase mb-1">
                {s.enl}
              </span>
              <span className="text-slate-500 text-[11px] font-medium">
                {s.hil}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
