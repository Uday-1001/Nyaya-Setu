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
  const [fir, setFir] = useState<MockFIR | null>(null);
  const [voices, setVoices] = useState<VoiceRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [registering, setRegistering] = useState(false);

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

  const handleClearSavedStatements = async () => {
    if (!firId) return;
    if (fir?.isOnlineFIR) {
      setError("Online FIR statements are read-only and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      "This will remove previously saved FIR statements linked to this FIR. Continue?",
    );
    if (!confirmed) return;

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

  const handleDeleteFIR = async () => {
    if (!firId) return;
    const confirmed = window.confirm(
      "This will permanently delete the FIR record. Continue?",
    );
    if (!confirmed) return;

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

  const handleRegisterOnlineFir = async () => {
    if (!firId || !fir) return;
    const confirmed = window.confirm(
      "Register this online FIR and send acknowledgment notification to victim?",
    );
    if (!confirmed) return;

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
                  onClick={handleRegisterOnlineFir}
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
                onClick={handleClearSavedStatements}
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
                onClick={handleDeleteFIR}
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
        </>
      ) : null}
    </div>
  );
};

export default FIRDetail;
