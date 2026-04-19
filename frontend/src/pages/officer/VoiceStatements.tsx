import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { VoiceRecorder } from "../../components/officer/VoiceRecorder";
import { officerService } from "../../services/officerService";
import type { VoiceRec } from "../../data/officerMock";

export const VoiceStatements = () => {
  // Render CSS keyframes once
  const keyframesStyle = `
    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes tableRowPulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    @keyframes shimmerLoading {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }

    @keyframes inputGlow {
      0%, 100% {
        box-shadow: 0 0 5px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      50% {
        box-shadow: 0 0 15px rgba(249, 115, 22, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }
    }

    @keyframes buttonGlow {
      0%, 100% {
        text-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
      }
      50% {
        text-shadow: 0 0 20px rgba(249, 115, 22, 0.6);
      }
    }

    @keyframes statusPulse {
      0%, 100% {
        opacity: 1;
        text-shadow: 0 0 0px currentColor;
      }
      50% {
        opacity: 0.8;
        text-shadow: 0 0 8px currentColor;
      }
    }

    @keyframes confirmPanelSlide {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        max-height: 500px;
        transform: translateY(0);
      }
    }

    /* Voice Statements Styling Classes */
    .voice-header {
      animation: slideInDown 0.6s ease-out;
      will-change: transform;
    }

    .voice-recorder-section {
      animation: slideInUp 0.6s ease-out 0.1s both;
      will-change: transform;
    }

    .voice-filter-section {
      animation: slideInUp 0.6s ease-out 0.15s both;
      will-change: transform;
    }

    .voice-filter-input {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: 0 0 15px rgba(249, 115, 22, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease-out;
    }

    .voice-filter-input:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
    }

    .voice-filter-input:focus {
      outline: none;
      border-color: #F97316;
      background: rgba(255, 255, 255, 0.08);
    }

    .voice-filter-select {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: 0 0 15px rgba(249, 115, 22, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease-out;
    }

    .voice-filter-select:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
    }

    .voice-filter-select:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.3);
    }

    .voice-loading-skeleton {
      animation: shimmerLoading 2s infinite;
      background-size: 200% 100%;
    }

    .voice-loading-text {
      animation: tableRowPulse 2s ease-in-out infinite;
    }

    .voice-error-box {
      animation: slideInUp 0.5s ease-out;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.3);
      border-radius: 12px;
      margin-bottom: 16px;
      padding: 16px;
    }

    .voice-table-container {
      animation: slideInUp 0.6s ease-out 0.2s both;
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(8px);
      box-shadow: 0 0 30px rgba(249, 115, 22, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      transition: all 0.3s ease-out;
    }

    .voice-table-container:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
    }

    .voice-table-header {
      border-color: rgba(255, 255, 255, 0.12);
    }

    .voice-table-header-cell {
      animation: slideInDown 0.5s ease-out;
      will-change: transform;
    }

    .voice-table-row {
      animation: slideInUp 0.5s ease-out;
      border-color: rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 0.3s ease-out;
      will-change: transform;
    }

    .voice-table-row:hover {
      background: rgba(249, 115, 22, 0.08);
    }

    .voice-fir-number {
      text-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
    }

    .voice-status-badge {
      animation: statusPulse 3s ease-in-out infinite;
      transition: all 0.3s ease-out;
    }

    .voice-action-button {
      animation: buttonGlow 2s ease-in-out infinite;
      transition: all 0.2s ease-out;
    }

    .voice-action-button:hover {
      transform: scale(1.05);
      color: #FB923C;
      background: rgba(249, 115, 22, 0.2);
    }

    .voice-audio-control {
      filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.2));
    }

    .voice-confirm-panel {
      animation: confirmPanelSlide 0.3s ease-out;
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(249, 115, 22, 0.05);
    }

    .voice-transcript-box {
      animation: slideInUp 0.4s ease-out;
      border-color: rgba(249, 115, 22, 0.3);
      background: rgba(249, 115, 22, 0.05);
      backdrop-filter: blur(8px);
      box-shadow: 0 0 20px rgba(249, 115, 22, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .voice-confirm-button {
      border-color: rgba(255, 255, 255, 0.2);
      background: transparent;
      transition: all 0.2s ease-out;
    }

    .voice-confirm-button:hover {
      border-color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.05);
    }

    .voice-verify-button {
      background: linear-gradient(to right, #16A34A, #15803D);
      box-shadow: 0 0 15px rgba(22, 163, 74, 0.3);
      transition: all 0.3s ease-out;
    }

    .voice-verify-button:hover {
      box-shadow: 0 8px 25px rgba(22, 163, 74, 0.5);
      transform: scale(1.05);
    }

    .voice-no-results {
      animation: fadeIn 0.6s ease-out;
    }
  `;
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
    <div className="relative">
      <style>{keyframesStyle}</style>

      {/* Header Section with Animations */}
      <div className="voice-header">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
          Voice Statements
        </h1>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#6B7280] uppercase mt-2 mb-8">
          — आवाज़ बयान · Record and verify victim statements
        </p>
      </div>

      {/* Filter Section with Enhanced Styling */}
      <div className="voice-filter-section flex flex-wrap gap-4 mb-6 mt-10">
        <input
          value={firFilter}
          onChange={(e) => setFirFilter(e.target.value)}
          placeholder="FIR number"
          className="voice-filter-input rounded-xl border px-4 py-2.5 text-sm font-mono text-[#F97316] placeholder:text-[#4B5563] min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="officer-select voice-filter-select rounded-xl border px-4 py-2.5 text-sm text-white"
          title="Filter by verification status"
        >
          <option value="ALL">All statuses</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <button
          type="button"
          onClick={() => setRecorderOpen((prev) => !prev)}
          className="officer-btn officer-btn-primary min-w-[185px]"
        >
          {recorderOpen ? "Close Recorder" : "New Recording"}
        </button>
      </div>

      {/* Voice Recorder Section */}
      <div className="voice-recorder-section">
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
      </div>

      {/* Loading State with Skeleton Animations */}
      {loading && (
        <div>
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="voice-loading-skeleton h-12 rounded-lg bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02]"
              />
            ))}
          </div>
          <p className="voice-loading-text py-8 text-sm text-[#6B7280] text-center">
            Loading voice statements...
          </p>
        </div>
      )}

      {/* Error State with Slide In Animation */}
      {error && (
        <div className="voice-error-box text-sm text-[#FCA5A5]">{error}</div>
      )}

      {/* Table Section with Staggered Animations */}
      {!loading && !error && (
        <div className="voice-table-container overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="voice-table-header border-b">
                {[
                  "FIR NO",
                  "LANGUAGE",
                  "DURATION",
                  "RECORDED",
                  "STATUS",
                  "ACTIONS",
                ].map((h, idx) => (
                  <th
                    key={h}
                    className="voice-table-header-cell text-left px-4 py-4 text-[10px] font-bold tracking-[0.14em] text-[#F97316] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="voice-no-results text-[#6B7280] text-sm">
                      No voice statements found
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <Fragment key={r.id}>
                    <tr className="voice-table-row border-b">
                      <td className="voice-fir-number px-4 py-4 font-mono text-sm font-bold text-[#F97316]">
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
                        className={`voice-status-badge px-4 py-4 text-[11px] font-bold uppercase ${
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
                            className="voice-audio-control h-8 align-middle rounded transition-all"
                          >
                            <source src={audioUrls[r.id]} />
                          </audio>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void loadAudio(r.id)}
                            className="voice-action-button text-xs font-bold text-[#F97316]"
                          >
                            ▶ Load Audio
                          </button>
                        )}
                        {!r.verified && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmId(confirmId === r.id ? null : r.id)
                            }
                            className="voice-action-button text-xs font-bold text-[#F97316] px-3 py-1 rounded"
                          >
                            ✓ Verify
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteRecording(r.id)}
                          disabled={deletingId === r.id}
                          className={`voice-action-button text-xs font-bold px-3 py-1 rounded disabled:opacity-60 ${
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
                        </button>
                      </td>
                    </tr>
                    {confirmId === r.id && (
                      <tr className="voice-confirm-panel border-b">
                        <td colSpan={6} className="px-4 py-4 overflow-hidden">
                          <div className="relative">
                            {r.transcript && (
                              <div className="voice-transcript-box mb-4 rounded-xl border p-4">
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
                              <button
                                type="button"
                                onClick={() => setConfirmId(null)}
                                className="voice-confirm-button rounded-lg border px-4 py-2.5 text-xs font-bold text-[#9CA3AF] uppercase"
                              >
                                ✕ Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void markVerified(r.id)}
                                className="voice-verify-button rounded-lg px-4 py-2.5 text-xs font-extrabold text-white uppercase tracking-wide"
                              >
                                ✓ Mark Verified
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VoiceStatements;
