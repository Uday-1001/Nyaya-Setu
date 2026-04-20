import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceRecorder } from "../../components/officer/VoiceRecorder";
import { officerService } from "../../services/officerService";
import type { VoiceRec } from "../../data/officerMock";

export const VoiceStatements = () => {
  const [rows, setRows] = useState<VoiceRec[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const audioUrlsRef = useRef<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [firFilter, setFirFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "verified" | "unverified"
  >("ALL");
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void officerService
      .listVoiceRecordings()
      .then((data) => {
        if (!active) return;
        setRows(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load voice statements.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    audioUrlsRef.current = audioUrls;
  }, [audioUrls]);

  useEffect(
    () => () => {
      Object.values(audioUrlsRef.current).forEach((url) =>
        window.URL.revokeObjectURL(url),
      );
    },
    [],
  );

  useEffect(() => {
    if (!armedDeleteId) return;
    const timeoutId = window.setTimeout(() => {
      setArmedDeleteId((prev) => (prev === armedDeleteId ? null : prev));
    }, 1800);
    return () => window.clearTimeout(timeoutId);
  }, [armedDeleteId]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (
          firFilter &&
          !r.firNo.toLowerCase().includes(firFilter.toLowerCase())
        )
          return false;
        if (statusFilter === "verified" && !r.verified) return false;
        if (statusFilter === "unverified" && r.verified) return false;
        return true;
      }),
    [firFilter, rows, statusFilter],
  );

  const markVerified = async (id: string) => {
    await officerService.verifyVoiceRecording(id);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, verified: true } : r)),
    );
    setConfirmId(null);
  };

  const loadAudio = async (id: string) => {
    if (audioUrls[id]) return;
    const blob = await officerService.getVoiceRecordingAudio(id);
    const url = window.URL.createObjectURL(blob);
    setAudioUrls((prev) => ({ ...prev, [id]: url }));
  };

  const deleteRecording = async (id: string) => {
    if (deletingId === id) return;

    if (armedDeleteId !== id) {
      setArmedDeleteId(id);
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await officerService.deleteVoiceRecording(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setConfirmId((prev) => (prev === id ? null : prev));
      setAudioUrls((prev) => {
        const copy = { ...prev };
        if (copy[id]) {
          window.URL.revokeObjectURL(copy[id]);
          delete copy[id];
        }
        return copy;
      });
      setArmedDeleteId(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete voice recording.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Header Section with Animations */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
          Voice Statements
        </h1>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#6B7280] uppercase mt-2 mb-8">
          — आवाज़ बयान · Record and verify victim statements
        </p>
      </motion.div>

      {/* Filter Section with Enhanced Styling */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap gap-4 mb-6 mt-10"
      >
        <input
          value={firFilter}
          onChange={(e) => setFirFilter(e.target.value)}
          placeholder="FIR number"
          className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-mono text-[#F97316] placeholder:text-[#4B5563] min-w-[220px] transition-all duration-300 focus:outline-none focus:border-[#F97316] focus:bg-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.06] shadow-[0_0_15px_rgba(249,115,22,0.1)_inset_inset_0_1px_0_rgba(255,255,255,0.05)] focus:shadow-[0_0_15px_rgba(249,115,22,0.3)_inset_inset_0_1px_0_rgba(255,255,255,0.05)]"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="officer-select rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm text-white transition-all duration-300 focus:outline-none focus:border-white/[0.3] hover:border-white/[0.2] hover:bg-white/[0.06] shadow-[0_0_15px_rgba(249,115,22,0.05)_inset_inset_0_1px_0_rgba(255,255,255,0.05)]"
          title="Filter by verification status"
        >
          <option value="ALL">All statuses</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setRecorderOpen((prev) => !prev)}
          className="officer-btn officer-btn-primary min-w-[185px] shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-shadow"
        >
          {recorderOpen ? "Close Recorder" : "New Recording"}
        </motion.button>
      </motion.div>

      {/* Voice Recorder Section */}
      <AnimatePresence>
        {recorderOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <VoiceRecorder
              open={recorderOpen}
              onToggleOpen={() => setRecorderOpen((prev) => !prev)}
              showToggleButton={false}
              onUploaded={(recording) => {
                setRows((prev) => [
                  recording,
                  ...prev.filter((item) => item.id !== recording.id),
                ]);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State with Skeleton Animations */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-10"
          >
            <div className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 rounded-lg bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02] animate-pulse"
                />
              ))}
            </div>
            <p className="py-8 text-sm text-[#6B7280] text-center animate-pulse">
              Loading voice statements...
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-xl mb-4 p-4 text-sm text-[#FCA5A5]"
          >
            {error}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="overflow-x-auto rounded-xl border border-white/[0.12] bg-white/[0.03] shadow-[0_0_30px_rgba(249,115,22,0.1)_inset_inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-colors hover:border-white/[0.2] hover:bg-white/[0.05]"
          >
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.12]">
                  {[
                    "FIR NO",
                    "LANGUAGE",
                    "DURATION",
                    "RECORDED",
                    "STATUS",
                    "ACTIONS",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-4 text-[10px] font-bold tracking-[0.14em] text-[#F97316] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <motion.tr
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-[#6B7280] text-sm"
                      >
                        No voice statements found
                      </td>
                    </motion.tr>
                  ) : (
                    filtered.map((r, idx) => (
                      <Fragment key={r.id}>
                        <motion.tr
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          whileHover={{
                            scale: 0.995,
                            backgroundColor: "rgba(255,255,255,0.02)",
                          }}
                          className="border-b border-white/[0.12]"
                        >
                          <td className="px-4 py-4 font-mono text-sm font-bold text-[#F97316]">
                            {r.firNo}
                          </td>
                          <td className="px-4 py-4 text-white font-semibold">
                            {r.language}
                          </td>
                          <td className="px-4 py-4 font-mono text-[#9CA3AF]">
                            {r.duration}
                          </td>
                          <td className="px-4 py-4 font-mono text-xs text-[#6B7280]">
                            {r.recordedAt}
                          </td>
                          <td
                            className={`px-4 py-4 text-[11px] font-bold uppercase ${
                              r.verified ? "text-[#16A34A]" : "text-[#D97706]"
                            }`}
                          >
                            {r.verified ? "✓ Verified" : "◯ Unverified"}
                          </td>
                          <td className="px-4 py-4 space-x-3">
                            {audioUrls[r.id] ? (
                              <audio
                                controls
                                preload="none"
                                className="h-8 align-middle rounded transition-all"
                              >
                                <source src={audioUrls[r.id]} />
                              </audio>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => void loadAudio(r.id)}
                                className="text-xs font-bold text-[#F97316]"
                              >
                                ▶ Load Audio
                              </motion.button>
                            )}
                            {!r.verified && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() =>
                                  setConfirmId(confirmId === r.id ? null : r.id)
                                }
                                className="text-xs font-bold text-[#F97316] px-3 py-1 rounded"
                              >
                                ✓ Verify
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => void deleteRecording(r.id)}
                              disabled={deletingId === r.id}
                              className={`text-xs font-bold px-3 py-1 rounded disabled:opacity-60 ${
                                armedDeleteId === r.id
                                  ? "text-[#F87171] bg-[#7f1d1d]/30"
                                  : "text-[#FCA5A5]"
                              }`}
                            >
                              {deletingId === r.id
                                ? "Deleting..."
                                : armedDeleteId === r.id
                                  ? "Tap again to delete"
                                  : "✕ Delete"}
                            </motion.button>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {confirmId === r.id && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-b border-white/[0.12]"
                            >
                              <td
                                colSpan={6}
                                className="px-4 py-4 overflow-hidden"
                              >
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: 0.1 }}
                                  className="relative"
                                >
                                  {r.transcript && (
                                    <div className="mb-4 rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 text-[#E5E7EB] text-sm shadow-[0_0_15px_rgba(255,255,255,0.02)_inset]">
                                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F97316]">
                                        📝 Transcript
                                      </p>
                                      <p className="text-sm leading-6 text-[#D1D5DB]">
                                        {r.transcript}
                                      </p>
                                    </div>
                                  )}

                                  <p className="text-sm text-[#D1D5DB] mb-4 font-semibold">
                                    Mark this recording as verified?
                                  </p>

                                  <div className="flex gap-3">
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      type="button"
                                      onClick={() => setConfirmId(null)}
                                      className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-[#9CA3AF] uppercase hover:bg-white/[0.08]"
                                    >
                                      ✕ Cancel
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      type="button"
                                      onClick={() => void markVerified(r.id)}
                                      className="rounded-lg bg-[#F97316] px-4 py-2.5 text-xs font-extrabold text-white uppercase tracking-wide hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] hover:bg-[#ea580c] transition-all"
                                    >
                                      ✓ Mark Verified
                                    </motion.button>
                                  </div>
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VoiceStatements;
