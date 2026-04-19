import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { DocumentGenerator } from "../../components/officer/DocumentGenerator";
import { FIRDetailView } from "../../components/officer/FIRDetailView";
import { officerService } from "../../services/officerService";
import type { MockFIR, VoiceRec } from "../../data/officerMock";

const badge = (u: string) => {
  if (u === "CRITICAL")
    return "bg-[#DC2626]/15 text-[#FCA5A5] border border-[#DC2626]/40";
  if (u === "HIGH")
    return "bg-[#F97316]/15 text-[#FDBA74] border border-[#F97316]/35";
  if (u === "MEDIUM")
    return "bg-[#D97706]/15 text-[#FCD34D] border border-[#D97706]/35";
  return "bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/35";
};

export const FIRDetail = () => {
  const { firId } = useParams();
  const navigate = useNavigate();
  type ConfirmAction =
    | "clear-statements"
    | "delete-fir"
    | "register-online-fir";

  const [fir, setFir] = useState<MockFIR | null>(null);
  const [voices, setVoices] = useState<VoiceRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

  const loadData = async (id: string) => {
    const [firData, voiceData] = await Promise.all([
      officerService.getFir(id),
      officerService.listVoiceRecordings(id),
    ]);
    return { firData, voiceData };
  };

  useEffect(() => {
    if (!firId) {
      setError("Missing FIR id.");
      setLoading(false);
      return;
    }

    let active = true;

    void loadData(firId)
      .then(({ firData, voiceData }) => {
        if (!active) return;
        setFir(firData);
        setVoices(voiceData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load FIR details.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [firId]);

  const executeClearSavedStatements = async () => {
    if (!firId) return;

    setClearing(true);
    setError(null);
    try {
      await officerService.clearSavedStatements(firId);
      const { firData, voiceData } = await loadData(firId);
      setFir(firData);
      setVoices(voiceData);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to clear saved FIR statements.",
      );
    } finally {
      setClearing(false);
    }
  };

  const executeDeleteFIR = async () => {
    if (!firId) return;

    setDeleting(true);
    setError(null);
    try {
      await officerService.deleteFir(firId);
      navigate("/officer/fir", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete FIR.");
      setDeleting(false);
    }
  };

  const executeRegisterOnlineFir = async () => {
    if (!firId || !fir) return;

    setRegistering(true);
    setError(null);
    try {
      await officerService.submitFIR(fir.id);
      const { firData, voiceData } = await loadData(firId);
      setFir(firData);
      setVoices(voiceData);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to register online FIR for victim notification.",
      );
    } finally {
      setRegistering(false);
    }
  };

  const requestClearSavedStatements = () => {
    if (fir?.isOnlineFIR) {
      setError("Online FIR statements are read-only and cannot be deleted.");
      return;
    }
    setConfirmAction("clear-statements");
  };

  const requestDeleteFIR = () => {
    setConfirmAction("delete-fir");
  };

  const requestRegisterOnlineFir = () => {
    setConfirmAction("register-online-fir");
  };

  const handleConfirmAction = async () => {
    if (confirmAction === "clear-statements") {
      await executeClearSavedStatements();
      setConfirmAction(null);
      return;
    }

    if (confirmAction === "delete-fir") {
      await executeDeleteFIR();
      return;
    }

    if (confirmAction === "register-online-fir") {
      await executeRegisterOnlineFir();
      setConfirmAction(null);
    }
  };

  const confirmMeta =
    confirmAction === "clear-statements"
      ? {
          title: "Delete Saved Statements?",
          message:
            "This will remove previously saved FIR statements linked to this FIR. This action cannot be undone.",
          actionLabel: clearing ? "Deleting..." : "Delete Statements",
          actionClass:
            "border-[#DC2626]/40 bg-[#DC2626]/15 text-[#FCA5A5] hover:bg-[#DC2626]/25",
          busy: clearing,
        }
      : confirmAction === "delete-fir"
        ? {
            title: "Delete FIR Record?",
            message:
              "This will permanently delete this FIR and associated draft context. This action cannot be undone.",
            actionLabel: deleting ? "Deleting FIR..." : "Delete FIR",
            actionClass:
              "border-[#ef4444]/45 bg-[#ef4444]/15 text-[#fecaca] hover:bg-[#ef4444]/25",
            busy: deleting,
          }
        : confirmAction === "register-online-fir"
          ? {
              title: "Register Online FIR?",
              message:
                "This will register the FIR and dispatch acknowledgment notification to the victim.",
              actionLabel: registering
                ? "Registering..."
                : "Confirm Registration",
              actionClass:
                "border-[#22c55e]/45 bg-[#22c55e]/15 text-[#86efac] hover:bg-[#22c55e]/25",
              busy: registering,
            }
          : null;

  return (
    <div>
      <Link to="/officer/fir" className="officer-btn-back">
        ← FIR Inbox
      </Link>

      {loading ? (
        <p className="mt-8 text-sm text-[#6B7280]">Loading FIR details...</p>
      ) : null}
      {error ? <p className="mt-8 text-sm text-[#FCA5A5]">{error}</p> : null}

      {fir ? (
        <>
          <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="font-mono text-3xl md:text-4xl font-extrabold text-[#F97316]">
                {fir.firNo}
              </h1>
              <p className="text-[#9CA3AF] mt-2 font-semibold">
                {fir.bnsCode} — {fir.bnsTitle} · BNS 2024
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 max-w-[560px]">
              <span
                className={`inline-block rounded-sm px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${badge(fir.urgency)}`}
              >
                {fir.urgency}
              </span>
              <p className="text-xs font-mono text-[#6B7280] px-1">
                Received {fir.received}
              </p>
              {fir.status === "AI Ready" && (
                <motion.button
                  whileHover={{ y: -1.5, scale: 1.02 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  type="button"
                  onClick={requestRegisterOnlineFir}
                  disabled={registering}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#86efac] hover:bg-[#22c55e]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {registering
                    ? "Registering..."
                    : "Register Online FIR & Notify Victim"}
                </motion.button>
              )}
              <motion.button
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ y: 0, scale: 0.98 }}
                type="button"
                onClick={requestClearSavedStatements}
                disabled={clearing || fir.isOnlineFIR}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#FCA5A5] hover:bg-[#DC2626]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                title={
                  fir.isOnlineFIR
                    ? "Online FIR statements are read-only"
                    : undefined
                }
              >
                <Trash2 size={12} />
                {fir.isOnlineFIR
                  ? "Statements Read-only"
                  : clearing
                    ? "Clearing..."
                    : "Delete Saved Statements"}
              </motion.button>
              <motion.button
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ y: 0, scale: 0.98 }}
                type="button"
                onClick={requestDeleteFIR}
                disabled={deleting}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#ef4444]/50 bg-[#ef4444]/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#fecaca] hover:bg-[#ef4444]/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} />
                {deleting ? "Deleting FIR..." : "Delete FIR"}
              </motion.button>
            </div>
          </div>

          <hr className="border-0 h-px bg-white/[0.08] my-10" />
          <FIRDetailView fir={fir} voices={voices} />
          <hr className="border-0 h-px bg-white/[0.08] my-12" />
          <p className="text-xs text-[#6B7280] mb-4">
            — LEGAL DOCUMENT EXPORT · Download the full FIR in printable legal
            format
          </p>
          <DocumentGenerator fir={fir} />

          {confirmMeta && (
            <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4">
              <div className="w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0b0f18]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#FDBA74]">
                  Officer Confirmation
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">
                  {confirmMeta.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                  {confirmMeta.message}
                </p>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    disabled={confirmMeta.busy}
                    className="rounded-lg border border-white/[0.14] bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#9CA3AF] hover:text-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmAction()}
                    disabled={confirmMeta.busy}
                    className={`rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] disabled:opacity-60 ${confirmMeta.actionClass}`}
                  >
                    {confirmMeta.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default FIRDetail;
