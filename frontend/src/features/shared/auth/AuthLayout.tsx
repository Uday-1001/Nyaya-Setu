import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileText, BadgeCheck, Users } from "lucide-react";
import { platformStatsService } from "../../../services/platformStatsService";

/* ══════════════════════════════════════════════════════════════════
   ASHOKA CHAKRA — 24-spoke wheel (from Indian national flag)
══════════════════════════════════════════════════════════════════ */
const AshokaChakra = () => {
  const CX = 200,
    CY = 200;
  const R_OUTER = 185;
  const R_SPOKE_OUTER = 168;
  const R_SPOKE_INNER = 28;
  const R_HUB = 22;
  const SPOKES = 24;

  const spokes = Array.from({ length: SPOKES }, (_, i) => {
    const angleDeg = (i * 360) / SPOKES - 90; // start from top
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x1: CX + R_SPOKE_INNER * Math.cos(rad),
      y1: CY + R_SPOKE_INNER * Math.sin(rad),
      x2: CX + R_SPOKE_OUTER * Math.cos(rad),
      y2: CY + R_SPOKE_OUTER * Math.sin(rad),
    };
  });

  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-full h-full"
    >
      {/* Outer ring — double stroke for depth */}
      <circle cx={CX} cy={CY} r={R_OUTER} stroke="white" strokeWidth="10" />
      <circle
        cx={CX}
        cy={CY}
        r={R_OUTER - 14}
        stroke="white"
        strokeWidth="2"
        strokeDasharray="2 6"
      />

      {/* 24 Spokes */}
      {spokes.map(({ x1, y1, x2, y2 }, i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ))}

      {/* Central hub */}
      <circle
        cx={CX}
        cy={CY}
        r={R_HUB}
        stroke="white"
        strokeWidth="5"
        fill="white"
        fillOpacity="0.1"
      />
      <circle
        cx={CX}
        cy={CY}
        r={10}
        stroke="white"
        strokeWidth="2"
        fill="white"
        fillOpacity="0.2"
      />
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SCALES OF JUSTICE — Taraju overlay
══════════════════════════════════════════════════════════════════ */
const ScalesOfJustice = () => (
  <svg
    viewBox="0 0 420 480"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="w-full h-full"
  >
    {/* Top finial */}
    <circle cx="210" cy="36" r="10" stroke="white" strokeWidth="2" />
    <line
      x1="210"
      y1="46"
      x2="210"
      y2="64"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />

    {/* Shaft */}
    <rect
      x="205"
      y="64"
      width="10"
      height="310"
      rx="3"
      stroke="white"
      strokeWidth="1.5"
    />

    {/* Shaft rings */}
    <rect
      x="198"
      y="190"
      width="24"
      height="7"
      rx="2"
      stroke="white"
      strokeWidth="1.2"
    />
    <rect
      x="198"
      y="260"
      width="24"
      height="7"
      rx="2"
      stroke="white"
      strokeWidth="1.2"
    />

    {/* Central pivot sphere */}
    <circle
      cx="210"
      cy="106"
      r="18"
      stroke="white"
      strokeWidth="2.5"
      fill="white"
      fillOpacity="0.05"
    />
    <circle cx="210" cy="106" r="7" stroke="white" strokeWidth="1.5" />

    {/* Balance arm — slightly tilted (right is heavier) */}
    <path
      d="M 30 100 Q 120 96 210 100 Q 300 104 390 108"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
    />

    {/* Arm end balls */}
    <circle
      cx="30"
      cy="100"
      r="7"
      stroke="white"
      strokeWidth="2"
      fill="white"
      fillOpacity="0.08"
    />
    <circle
      cx="390"
      cy="108"
      r="7"
      stroke="white"
      strokeWidth="2"
      fill="white"
      fillOpacity="0.08"
    />

    {/* Left chain */}
    <line
      x1="30"
      y1="107"
      x2="30"
      y2="278"
      stroke="white"
      strokeWidth="1.8"
      strokeDasharray="6 5"
      strokeLinecap="round"
    />

    {/* Right chain */}
    <line
      x1="390"
      y1="115"
      x2="390"
      y2="296"
      stroke="white"
      strokeWidth="1.8"
      strokeDasharray="6 5"
      strokeLinecap="round"
    />

    {/* Left pan */}
    <path
      d="M -10 278 Q 30 300 70 278"
      stroke="white"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <line x1="-10" y1="272" x2="-10" y2="278" stroke="white" strokeWidth="2" />
    <line x1="70" y1="272" x2="70" y2="278" stroke="white" strokeWidth="2" />

    {/* Right pan (lower — heavier side) */}
    <path
      d="M 348 296 Q 390 318 432 296"
      stroke="white"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <line x1="348" y1="290" x2="348" y2="296" stroke="white" strokeWidth="2" />
    <line x1="432" y1="290" x2="432" y2="296" stroke="white" strokeWidth="2" />

    {/* Base steps */}
    <rect
      x="184"
      y="374"
      width="52"
      height="11"
      rx="3"
      stroke="white"
      strokeWidth="1.8"
    />
    <rect
      x="164"
      y="385"
      width="92"
      height="11"
      rx="3"
      stroke="white"
      strokeWidth="1.5"
    />
    <rect
      x="138"
      y="396"
      width="144"
      height="13"
      rx="4"
      stroke="white"
      strokeWidth="1.2"
    />
    <ellipse cx="210" cy="414" rx="114" ry="9" stroke="white" strokeWidth="1" />
  </svg>
);

/* ── Stat widget ─────────────────────────────────────────────────── */
const Stat = ({
  value,
  label,
  icon: Icon,
  index = 0,
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  index?: number;
}) => {
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

  return (
    <div
      className="flex flex-col gap-1 transition-all duration-500 group"
      style={{
        animation: `slideInUp 0.6s ease-out ${index * 0.15}s both`,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#ea580c]/10">
          <Icon className="w-3.5 h-3.5 text-[#ea580c]" />
        </div>
        <div className="text-white font-extrabold text-2xl tracking-tight leading-none group-hover:text-[#ff9933] transition-colors">
          {display.toLocaleString("en-IN")}
        </div>
      </div>
      <div
        className="text-[12px] font-medium tracking-wide pl-8"
        style={{ color: "#64748b" }}
      >
        {label}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   AuthLayout — Indian Government / Judiciary Split Layout
══════════════════════════════════════════════════════════════════ */
interface AuthLayoutProps {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  formMaxWidth?: string;
  variant?: "default" | "minimal";
}

export const AuthLayout = ({
  children,
  backTo = "/",
  backLabel = "← Home",
  formMaxWidth = "max-w-md",
  variant = "default",
}: AuthLayoutProps) => {
  const isMinimal = variant === "minimal";
  const [liveStats, setLiveStats] = useState({
    totalFirs: 1247,
    bnsSections: 358,
    bnssSections: 0,
    activeOfficers: 0,
  });

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
        // Keep fallbacks when stats endpoint is not reachable.
      }
    };

    void loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <style>{`
      @keyframes slideInDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spinSlow {
        to { transform: rotate(360deg); }
      }
      @keyframes spinReverse {
        to { transform: rotate(-360deg); }
      }
      @keyframes rotateSlow {
        to { transform: rotate(360deg); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-12px); }
      }
      @keyframes shimmer {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
      @keyframes glow {
        0%, 100% { color: rgba(255,153,51,0.4); text-shadow: none; }
        50% { color: rgba(255,153,51,0.8); text-shadow: 0 0 10px rgba(255,153,51,0.5); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 4px 20px rgba(255,153,51,0.4); }
        50% { box-shadow: 0 4px 40px rgba(255,153,51,0.6); }
      }
      .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
    `}</style>
      <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-hidden font-sans relative z-10">
        {/* ════════════════════════════════════════════════════════════
        LEFT PANEL — Indian Judiciary Branding
    ════════════════════════════════════════════════════════════ */}
        <div
          className={`hidden lg:flex ${isMinimal ? "lg:w-[40%]" : "lg:w-[46%]"} relative flex-col flex-shrink-0 overflow-hidden`}
          style={{
            background: "rgba(10, 10, 12, 0.4)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* ── Ashoka Chakra — large watermark ── */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{
              opacity: isMinimal ? 0.1 : 0.15,
              animation: "spinSlow 120s linear infinite",
              mixBlendMode: "screen",
            }}
          >
            <div style={{ width: "88%", height: "88%" }}>
              <AshokaChakra />
            </div>
          </div>

          {/* ── Scales of Justice — smaller overlay ── */}
          {!isMinimal && (
            <div
              className="absolute pointer-events-none select-none"
              style={{
                bottom: "6%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "80%",
                height: "50%",
                opacity: 0.1,
                animation: "spinReverse 180s linear infinite",
                mixBlendMode: "screen",
              }}
            >
              <ScalesOfJustice />
            </div>
          )}

          {/* ── Saffron radial glow (top-left) ── */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "-10%",
              left: "-10%",
              width: "60%",
              height: "60%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,153,51,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "float 12s ease-in-out infinite",
            }}
          />

          {/* ── India Green glow (bottom-right) ── */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: "-10%",
              right: "-10%",
              width: "50%",
              height: "50%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(19,136,8,0.15) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "float 15s ease-in-out infinite reverse",
            }}
          />

          {/* ── Tricolor top stripe ── */}
          <div
            className="absolute top-0 left-0 right-0 flex"
            style={{ height: "4px" }}
          >
            <div className="flex-1" style={{ background: "#FF9933" }} />
            <div className="flex-1" style={{ background: "#e8dfc8" }} />
            <div className="flex-1" style={{ background: "#138808" }} />
          </div>

          {/* ── Left panel content ── */}
          <div className="relative z-10 flex flex-col h-full p-10 pt-8">
            {/* Government tag */}
            <div
              className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isMinimal ? "mb-3" : "mb-4"}`}
              style={{
                color: "rgba(255,153,51,0.8)",
                animation: "slideInDown 0.8s ease-out",
              }}
            >
              भारत सरकार &nbsp;·&nbsp; GOVERNMENT OF INDIA
            </div>

            {/* Logo + App Name */}
            <div
              className="flex items-center gap-3.5 group"
              style={{ animation: "slideInLeft 0.8s ease-out 0.1s both" }}
            >
              {/* Ashoka Chakra mini logo */}
              <div
                className={`${isMinimal ? "w-12 h-12" : "w-14 h-14"} rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden transition-all duration-300 hover:scale-110 shadow-2xl`}
                style={{
                  background:
                    "linear-gradient(135deg, #FF9933 0%, #dc2626 100%)",
                  boxShadow: "0 8px 30px rgba(255,153,51,0.5)",
                  border: "1px solid rgba(255,153,51,0.8)",
                }}
              >
                <svg
                  viewBox="0 0 40 40"
                  className="w-8 h-8 transition-transform duration-300 hover:rotate-12"
                  fill="none"
                  style={{ animation: "rotateSlow 20s linear infinite" }}
                >
                  {/* mini Ashoka Chakra */}
                  <circle
                    cx="20"
                    cy="20"
                    r="17"
                    stroke="white"
                    strokeWidth="2.5"
                  />
                  {Array.from({ length: 24 }, (_, i) => {
                    const rad = ((i * 15 - 90) * Math.PI) / 180;
                    return (
                      <line
                        key={i}
                        x1={20 + 5 * Math.cos(rad)}
                        y1={20 + 5 * Math.sin(rad)}
                        x2={20 + 15 * Math.cos(rad)}
                        y2={20 + 15 * Math.sin(rad)}
                        stroke="white"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    );
                  })}
                  <circle
                    cx="20"
                    cy="20"
                    r="4"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div>
                <div
                  className={`text-white font-extrabold ${isMinimal ? "text-[20px]" : "text-[22px]"} leading-none tracking-tight transition-all duration-300 drop-shadow-md`}
                >
                  FIR Platform
                </div>
                <div
                  className="text-xs mt-1 font-medium transition-colors duration-300"
                  style={{ color: "rgba(255,153,51,0.9)" }}
                >
                  Digital Justice System
                </div>
              </div>
            </div>

            {/* Main text block */}
            <div className="flex-1 flex flex-col justify-center">
              <h2
                className={`${isMinimal ? "text-[1.95rem]" : "text-[2.2rem]"} font-extrabold leading-tight text-white mt-2 drop-shadow-xl`}
                style={{ animation: "slideInLeft 0.8s ease-out 0.2s both" }}
              >
                न्याय आपकी
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #FF9933 0%, #FFD700 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "shimmer 3s ease-in-out infinite",
                  }}
                >
                  उंगलियों पर।
                </span>
              </h2>
              <p
                className={`text-sm ${isMinimal ? "mt-2" : "mt-3"} leading-relaxed max-w-[320px] transition-colors duration-300`}
                style={{
                  color: "#94a3b8",
                  animation: "slideInLeft 0.8s ease-out 0.3s both",
                }}
              >
                File FIRs, track case status, and access victim rights in one
                secure portal.
              </p>

              {/* Minimal Stats Layout */}
              {!isMinimal && (
                <div className="grid grid-cols-2 gap-y-10 gap-x-8 mt-12 max-w-[340px]">
                  <Stat
                    value={liveStats.totalFirs}
                    label="Total FIRs"
                    icon={FileText}
                    index={0}
                  />
                  <Stat
                    value={liveStats.activeOfficers}
                    label="Active Officers"
                    icon={BadgeCheck}
                    index={1}
                  />
                  <Stat
                    value={liveStats.bnsSections}
                    label="BNS Sections"
                    icon={FileText}
                    index={2}
                  />
                  <Stat
                    value={liveStats.bnssSections}
                    label="BNSS Sections"
                    icon={Users}
                    index={3}
                  />
                </div>
              )}
            </div>

            {/* Footer — Satyameva Jayate */}
            <div
              className="space-y-2 mt-8"
              style={{ animation: "slideInUp 0.8s ease-out 0.4s both" }}
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse block shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                End-to-end encrypted · MHA, Government of India
              </div>
              {!isMinimal && (
                <div
                  className="text-[13px] font-bold tracking-[0.2em]"
                  style={{
                    color: "rgba(255,153,51,0.6)",
                    animation: "glow 2s ease-in-out infinite",
                  }}
                >
                  सत्यमेव जयते
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
        RIGHT PANEL — Auth Form
    ════════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 flex flex-col overflow-y-auto relative shadow-2xl"
          style={{
            background: "rgba(10, 10, 10, 0.55)",
            backdropFilter: "blur(60px)",
            WebkitBackdropFilter: "blur(60px)",
          }}
        >
          {/* Tricolor top stripe (visible on mobile too) */}
          <div
            className="flex shrink-0"
            style={{ height: "4px", opacity: 0.8 }}
          >
            <div className="flex-1" style={{ background: "#FF9933" }} />
            <div className="flex-1" style={{ background: "#e8dfc8" }} />
            <div className="flex-1" style={{ background: "#138808" }} />
          </div>

          {/* Subtle saffron corner glow on right panel */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: "50%",
              height: "50%",
              background:
                "radial-gradient(circle at top right, rgba(255,153,51,0.08) 0%, transparent 60%)",
            }}
          />

          {/* Breadcrumb */}
          <div className="px-8 pt-6 pb-0 shrink-0 relative z-20">
            <Link
              to={backTo}
              className="text-sm font-semibold transition-colors py-2 px-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 inline-block"
              style={{ color: "#cbd5e1" }}
            >
              {backLabel}
            </Link>
          </div>

          {/* Centered form area */}
          <div
            className={`relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-14 py-10 w-full ${formMaxWidth} mx-auto`}
          >
            {children}
          </div>

          {/* Footer */}
          {!isMinimal && (
            <p
              className="text-center text-xs py-5 shrink-0 font-medium"
              style={{ color: "#475569" }}
            >
              © {new Date().getFullYear()} FIR Platform · Ministry of Home
              Affairs · NIC
            </p>
          )}
        </div>
      </div>
    </>
  );
};
