import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { UrgencyQueue } from "../../components/officer/UrgencyQueue";
import { officerService } from "../../services/officerService";
import type { MockFIR } from "../../data/officerMock";
import { RefreshCw } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";

const OPERATIONS_ROOM_IMAGE =
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80";
const POLL_INTERVAL_MS = 60_000;
const COUNTDOWN_STEP_SEC = 5;

type DashboardStat = { value: string; label: string; labelHi: string };

const AnimatedNumber = ({ value }: { value: string }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      return;
    }

    let start = display;
    const end = numValue;
    const duration = 1200;
    let startTime: number | null = null;
    let animationFrameId: number;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);

      // Use easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const nextValue = Math.round(start + (end - start) * easeProgress);

      setDisplay(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return <>{value}</>;
  return <>{display}</>;
};

const urgencyOrder: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const fadeUpContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

const AnimatedStatCard = ({
  stat,
  index,
}: {
  stat: DashboardStat;
  index: number;
}) => {
  const urgencyColor = (u: string) => {
    if (u === "0" || u === "CRITICAL") return "text-[#DC2626]";
    if (u === "HIGH") return "text-[#F97316]";
    return "text-white";
  };

  const isAlertCard = index === 0 && parseInt(stat.value) > 0;

  return (
    <motion.div
      variants={fadeUpItem}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`text-center lg:px-8 relative group rounded-[2xl] p-6 cursor-default transition-colors duration-300 border border-white/[0.05] bg-black/40 hover:bg-white/[0.08] hover:border-white/[0.2] shadow-[0_8px_24px_rgba(0,0,0,0.42)] hover:shadow-[0_16px_40px_rgba(249,115,22,0.15)] z-10 ${index > 0 ? "lg:border-l-transparent" : ""}`}
    >
      <div className="relative z-20 pointer-events-none flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: index * 0.1 + 0.3,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className={`font-black leading-none tabular-nums tracking-tighter ${index === 0 ? "text-[64px]" : "text-[52px]"} ${isAlertCard ? urgencyColor(stat.value) : "text-white"}`}
          style={{
            textShadow: isAlertCard ? "0 0 30px rgba(220,38,38,0.6)" : "none",
          }}
        >
          <AnimatedNumber value={stat.value} />
        </motion.div>

        <p className="mt-3 text-[11px] font-bold tracking-[0.15em] text-[#9CA3AF] uppercase transition-colors group-hover:text-[#F97316]">
          {stat.label}
        </p>
        <p className="mt-1 text-[10px] font-medium text-[#6B7280]">
          {stat.labelHi}
        </p>
      </div>
    </motion.div>
  );
};

export const OfficerDashboard = () => {
  const [showHeroImage, setShowHeroImage] = useState(true);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [queueFirs, setQueueFirs] = useState<MockFIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Custom countdown timer for refresh UI
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000);
  const intervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await officerService.getDashboard();
      setStats(data.stats);
      const sorted = [...data.queue].sort(
        (a, b) =>
          (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9),
      );
      setQueueFirs(sorted);
      setLastUpdated(new Date());
      setError(null);
      setCountdown(POLL_INTERVAL_MS / 1000); // Reset UI countdown
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    intervalRef.current = window.setInterval(
      () => void load(true),
      POLL_INTERVAL_MS,
    );

    // Countdown logic
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) return POLL_INTERVAL_MS / 1000;
        return Math.max(0, prev - COUNTDOWN_STEP_SEC);
      });
    }, COUNTDOWN_STEP_SEC * 1000);

    return () => {
      if (intervalRef.current != null)
        window.clearInterval(intervalRef.current);
      if (countdownIntervalRef.current != null)
        window.clearInterval(countdownIntervalRef.current);
    };
  }, [load]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-black/35 shadow-[0_20px_48px_rgba(0,0,0,0.55)]">
      <motion.section
        className="relative z-10"
        initial="hidden"
        animate="show"
        variants={fadeUpContainer}
      >
        {showHeroImage ? (
          <div className="absolute inset-0 z-0">
            <img
              src={OPERATIONS_ROOM_IMAGE}
              alt=""
              className="hidden sm:block h-full w-full object-cover opacity-[0.08]"
              onError={() => setShowHeroImage(false)}
            />
            {/* Vignette to blend into black background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505] z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] z-10" />
          </div>
        ) : null}

        <div className="relative z-[1] px-4 py-8 sm:px-6 lg:px-8 lg:py-9">
          {/* Header row */}
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4"
            variants={fadeUpItem}
          >
            <div>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="text-[10px] font-bold tracking-[0.3em] text-[#6B7280] uppercase mb-2"
                style={{
                  background:
                    "linear-gradient(90deg, #F97316 0%, #FFB366 50%, #6B7280 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                — Operation Center · लाइव
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200,
                }}
                className="text-3xl font-black text-white tracking-tight drop-shadow-lg"
              >
                Saffron<span className="text-[#F97316]">Dash</span>
              </motion.h1>
              {lastUpdated && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[10px] text-[#6B7280] mt-2 font-mono flex items-center gap-2"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                  Live Sync: {lastUpdated.toLocaleTimeString("en-IN")}
                </motion.p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              disabled={refreshing || loading}
              onClick={() => {
                setCountdown(POLL_INTERVAL_MS / 1000);
                void load(true);
              }}
              className="relative flex items-center gap-3 rounded-full border border-white/[0.1] bg-black/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-white/[0.08] hover:border-[#F97316]/40 disabled:opacity-50 transition-all overflow-hidden group shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            >
              {/* Countdown Progress Background Ring */}
              <div
                className="absolute left-0 bottom-0 top-0 bg-[#F97316]/10 z-0 transition-all duration-[5000ms] ease-linear"
                style={{
                  width: `${(countdown / (POLL_INTERVAL_MS / 1000)) * 100}%`,
                }}
              />

              <div className="relative z-10 flex items-center gap-2">
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin text-[#F97316]" : "text-[#9CA3AF] group-hover:text-white"}`}
                  strokeWidth={2.5}
                />
                {refreshing ? "Syncing..." : `Sync (${countdown}s)`}
              </div>
            </motion.button>
          </motion.div>

          {/* Immersive Stat grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 perspective-[1200px]"
            variants={fadeUpContainer}
          >
            {loading ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col justify-center items-center py-20">
                <Spinner color="#F97316" size={60} />
                <p className="mt-4 text-[#6B7280] font-mono text-xs uppercase tracking-widest animate-pulse">
                  Establishing Secure Uplink...
                </p>
              </div>
            ) : (
              stats.map((s, i) => (
                <AnimatedStatCard key={s.label} stat={s} index={i} />
              ))
            )}
          </motion.div>
        </div>
      </motion.section>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mx-4 sm:mx-6 lg:mx-8 mb-6 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 px-6 py-4 text-sm text-[#FCA5A5] z-10 relative flex items-center gap-3 shadow-[0_0_16px_rgba(220,38,38,0.12)]"
          >
            <div className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Urgency queue */}
      <motion.div
        className="z-10 relative border-t border-white/[0.06] px-4 pb-16 pt-8 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
      >
        {!loading && queueFirs.length === 0 && !error ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.05]">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse" />
            </div>
            <p className="text-white font-bold text-lg">
              Clear Operations Board
            </p>
            <p className="text-[#6B7280] text-sm mt-2">
              No emergency FIRs in the active queue.
            </p>
          </div>
        ) : loading ? (
          <div className="min-h-[300px] rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-[#F97316]/35 border-t-[#F97316] animate-spin" />
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#6B7280]">
              Loading priority queue...
            </p>
          </div>
        ) : !loading ? (
          <div className="pt-1">
            <UrgencyQueue items={queueFirs} />
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default OfficerDashboard;
