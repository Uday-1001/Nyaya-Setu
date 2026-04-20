import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { officerService } from "../../services/officerService";
import type { FIRStatus, MockFIR, Urgency } from "../../data/officerMock";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const URGENCIES: (Urgency | "ALL")[] = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];
const STATUSES: (FIRStatus | "ALL")[] = [
  "ALL",
  "AI Ready",
  "Under Review",
  "Document Generated",
  "Signed",
];
const PAGE_SIZE = 10;
const POLL_MS = 30_000;

const urgencyDot: Record<string, string> = {
  CRITICAL: "bg-[#DC2626]",
  HIGH: "bg-[#F97316]",
  MEDIUM: "bg-[#D97706]",
  LOW: "bg-[#16A34A]",
};

const urgencyLabel: Record<string, string> = {
  CRITICAL: "text-[#FCA5A5]",
  HIGH: "text-[#FDBA74]",
  MEDIUM: "text-[#FDE68A]",
  LOW: "text-[#86EFAC]",
};

const statusClass: Record<string, string> = {
  "AI Ready": "text-[#60A5FA]",
  "Under Review": "text-[#FDE68A]",
  "Document Generated": "text-[#86EFAC]",
  Signed: "text-[#9CA3AF]",
};

export const FIRInbox = () => {
  const [urgency, setUrgency] = useState<Urgency | "ALL">("ALL");
  const [status, setStatus] = useState<FIRStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<MockFIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await officerService.listFirs();
      setRows(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load FIR inbox.",
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
    intervalRef.current = window.setInterval(() => void load(true), POLL_MS);
    return () => {
      if (intervalRef.current != null)
        window.clearInterval(intervalRef.current);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((f) => {
      if (urgency !== "ALL" && f.urgency !== urgency) return false;
      if (status !== "ALL" && f.status !== status) return false;
      if (
        q &&
        !f.firNo.toLowerCase().includes(q) &&
        !f.bnsTitle.toLowerCase().includes(q) &&
        !f.victimName.toLowerCase().includes(q) &&
        !f.location.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [urgency, status, search, rows]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [urgency, status, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setUrgency("ALL");
    setStatus("ALL");
    setSearch("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-start justify-between mb-2"
      >
        <div>
          <motion.h1
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-3xl font-extrabold tracking-tight text-white"
          >
            Online FIR Inbox
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[11px] font-bold tracking-[0.18em] text-[#6B7280] uppercase mt-2"
          >
            — ऑनलाइन एफआईआर इनबॉक्स · Receive, review, and register
            complainant-submitted FIRs
          </motion.p>
        </div>
        <div className="flex flex-col items-end gap-1 mt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            disabled={refreshing || loading}
            onClick={() => void load(true)}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] hover:bg-white/[0.08] disabled:opacity-50 transition-all"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#F97316]" : ""}`}
              strokeWidth={2.5}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </motion.button>
          {lastUpdated && (
            <p className="text-[9px] text-[#4B5563] font-mono">
              Updated {lastUpdated.toLocaleTimeString("en-IN")}
            </p>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="flex flex-wrap items-end gap-3 mb-6 mt-7 text-sm"
      >
        {/* Search */}
        <label className="flex flex-col gap-1 text-[10px] font-bold tracking-widest text-[#6B7280] uppercase flex-1 min-w-[200px]">
          Search
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="FIR no., BNS section, complainant name…"
              className="w-full rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#4B5563]"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">
          Urgency
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as Urgency | "ALL")}
            className="officer-select rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-white text-sm font-semibold min-w-[140px]"
          >
            {URGENCIES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FIRStatus | "ALL")}
            className="officer-select rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-white text-sm font-semibold min-w-[180px]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {(urgency !== "ALL" || status !== "ALL" || search) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={clearFilters}
            className="officer-btn officer-btn-subtle mb-0.5"
          >
            Clear
          </motion.button>
        )}
      </motion.div>

      {/* Summary bar */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4 mb-4 text-[10px] font-bold tracking-widest uppercase text-[#4B5563]"
        >
          <span>
            {filtered.length} FIR{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[#DC2626]">
            {rows.filter((r) => r.urgency === "CRITICAL").length} Critical
          </span>
          <span className="text-[#F97316]">
            {rows.filter((r) => r.urgency === "HIGH").length} High
          </span>
          <span className="text-[#FDE68A]">
            {rows.filter((r) => r.status === "AI Ready").length} AI Ready
          </span>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-white/[0.03] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 px-4 py-3 text-sm text-[#FCA5A5]"
        >
          {error}
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center"
        >
          <p className="text-[#6B7280] text-sm">
            No FIRs match the current filters.
          </p>
          {(urgency !== "ALL" || status !== "ALL" || search) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={clearFilters}
              className="officer-btn officer-btn-subtle mt-3"
            >
              Clear filters
            </motion.button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={page + search + urgency + status}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.04)]"
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {[
                    "FIR NO",
                    "BNS SECTION",
                    "COMPLAINANT",
                    "URGENCY",
                    "STATUS",
                    "RECEIVED",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.14em] text-[#6B7280] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paged.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 10, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.99 }}
                      transition={{
                        delay: idx * 0.04,
                        type: "spring",
                        stiffness: 250,
                        damping: 20,
                      }}
                      whileHover={{
                        backgroundColor: "rgba(255,255,255,0.06)",
                        scale: 1.01,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        transition: { duration: 0.2 },
                      }}
                      className="border-b border-white/[0.06] transition-colors relative z-10"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/officer/fir/${r.id}`}
                          className="font-mono text-sm font-bold text-[#F97316] hover:underline"
                        >
                          {r.firNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold max-w-[220px]">
                        <span className="text-[#9CA3AF]">{r.bnsCode}</span>
                        <span className="ml-1 text-white text-xs">
                          {r.bnsTitle}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#D1D5DB] text-xs">
                        {r.victimName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${urgencyLabel[r.urgency] ?? "text-[#9CA3AF]"}`}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${urgencyDot[r.urgency] ?? "bg-[#6B7280]"}`}
                          />
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${statusClass[r.status] ?? "text-[#9CA3AF]"}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                        {r.received}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/officer/fir/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#F97316] hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 text-xs text-[#6B7280] font-mono border-t border-white/[0.06]">
              <span>
                {filtered.length > 0
                  ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`
                  : "0 results"}
              </span>
              <span className="flex gap-2">
                <motion.button
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="officer-btn officer-btn-subtle px-2.5 py-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </motion.button>
                <span className="px-2 py-1 text-white">
                  {page}/{totalPages}
                </span>
                <motion.button
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="officer-btn officer-btn-subtle px-2.5 py-1.5"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </motion.button>
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default FIRInbox;
