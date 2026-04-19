import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { mlPipelineService } from "../../../services/mlPipelineService";
import { motion } from "framer-motion";

type Props = {
  language: string;
  accusedPersonName: string;
  accusedAddress: string;
  assetsDescription: string;
  incidentDate: string;
  incidentTime: string;
  incidentLocation: string;
  witnessDetails: string;
  disabled?: boolean;
  onComplete: (statementId: string) => void | Promise<void>;
};

type WorkflowStage =
  | "idle"
  | "recording"
  | "transcribing"
  | "transcript_ready"
  | "submitting"
  | "analyzing"
  | "finalizing"
  | "done"
  | "error";

type StageState = "pending" | "active" | "done" | "error";

const pickMime = () => {
  const c = "audio/webm;codecs=opus";
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c))
    return c;
  if (
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported("audio/webm")
  )
    return "audio/webm";
  return "";
};

export const StatementVoiceTab = ({
  language,
  accusedPersonName,
  accusedAddress,
  assetsDescription,
  incidentDate,
  incidentTime,
  incidentLocation,
  witnessDetails,
  disabled,
  onComplete,
}: Props) => {
  const mlBaseUrl =
    (import.meta.env.VITE_ML_SERVICE_URL as string | undefined)?.trim() ||
    "http://localhost:8000";
  const languageLabel = language === "en" ? "English" : "Hindi or Hinglish";
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>("idle");
  const [workflowMessage, setWorkflowMessage] = useState(
    "Ready to start recording.",
  );
  const [pipelinePercent, setPipelinePercent] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const submitTickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const durationSecsRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clearTick = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const clearSubmitTick = () => {
    if (submitTickRef.current != null) {
      window.clearInterval(submitTickRef.current);
      submitTickRef.current = null;
    }
  };

  const startSubmitPulse = () => {
    clearSubmitTick();
    submitTickRef.current = window.setInterval(() => {
      setPipelinePercent((prev) => {
        if (prev >= 88) return prev;
        return Math.min(88, prev + 2);
      });
    }, 500);
  };

  useEffect(() => {
    return () => {
      clearTick();
      clearSubmitTick();
      stopStream();
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    setTranscript("");
    setWorkflowStage("recording");
    setWorkflowMessage("Recording has started. Speak naturally.");
    setPipelinePercent(10);
    if (!navigator.mediaDevices?.getUserMedia) {
      setWorkflowStage("error");
      setWorkflowMessage("Microphone is not available in this browser.");
      setError("Microphone is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.start(250);
      startedAtRef.current = Date.now();
      setSeconds(0);
      tickRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      setRecording(true);
    } catch {
      setWorkflowStage("error");
      setWorkflowMessage("Could not access microphone.");
      setError("Could not access the microphone. Check browser permissions.");
    }
  }, [language]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    clearTick();
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      setRecording(false);
      stopStream();
      return Promise.resolve(null);
    }
    return new Promise<Blob | null>((resolve) => {
      mr.onstop = () => {
        durationSecsRef.current = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        stopStream();
        mediaRecorderRef.current = null;
        setRecording(false);
        resolve(blob.size ? blob : null);
      };
      mr.stop();
    });
  }, []);

  const handleStopClick = async () => {
    const blob = await stopRecording();
    if (blob) {
      setAudioBlob(blob);
      await transcribeBlob(blob, "recording.webm");
    } else {
      setWorkflowStage("idle");
      setWorkflowMessage("No audio detected. Record again.");
      setPipelinePercent(0);
    }
  };

  const transcribeBlob = async (blob: Blob, filename: string) => {
    setTranscribing(true);
    setWorkflowStage("transcribing");
    setWorkflowMessage("Converting your speech into text...");
    setPipelinePercent((prev) => Math.max(prev, 28));
    try {
      const fd = new FormData();
      fd.append("audio", blob, filename);
      fd.append("language", language);
      // Call the ML service transcribe endpoint directly to bypass Node for pure AI processing
      const res = await fetch(`${mlBaseUrl.replace(/\/$/, "")}/v1/transcribe`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
        setError(null);
        setWorkflowStage("transcript_ready");
        setWorkflowMessage(
          "Transcription complete. Review and edit before submit.",
        );
        setPipelinePercent((prev) => Math.max(prev, 46));
      } else if (data.error) {
        setWorkflowStage("error");
        setWorkflowMessage("Transcription failed.");
        setError(`Transcription failed: ${data.error}`);
      }
    } catch (err) {
      setWorkflowStage("error");
      setWorkflowMessage("Could not connect to transcription service.");
      setError("AI transcription failed to connect.");
    } finally {
      setTranscribing(false);
    }
  };

  const onPickAudioClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setRecording(false);
    clearTick();
    clearSubmitTick();
    setTranscript("");
    setWorkflowStage("transcribing");
    setWorkflowMessage("Uploaded audio received. Starting transcription...");
    setPipelinePercent(24);

    const blob = file.slice(0, file.size, file.type || "audio/webm");
    setAudioBlob(blob);

    const estimateSecs = Math.max(1, Math.round(file.size / 24000));
    durationSecsRef.current = estimateSecs;
    setSeconds(estimateSecs);

    await transcribeBlob(blob, file.name || "uploaded-audio.webm");

    event.target.value = "";
  };

  const handleSubmitAudio = async () => {
    setError(null);
    let blob = audioBlob;
    if (recording) {
      const b = await stopRecording();
      if (b) {
        blob = b;
        setAudioBlob(b);
      }
    }
    if (!blob || blob.size < 32) {
      setWorkflowStage("error");
      setWorkflowMessage("Recording is too short. Please add more audio.");
      setError("Record a short clip first (a few seconds is enough).");
      return;
    }
    if (!accusedPersonName.trim()) {
      setWorkflowStage("error");
      setWorkflowMessage("Accused person details are required.");
      setError("Accused person name is required before submitting.");
      return;
    }
    if (!accusedAddress.trim()) {
      setWorkflowStage("error");
      setWorkflowMessage("Accused person details are required.");
      setError("Accused person address is required before submitting.");
      return;
    }
    setBusy(true);
    setWorkflowStage("submitting");
    setWorkflowMessage("Uploading complaint and transcript...");
    setPipelinePercent((prev) => Math.max(prev, 58));
    startSubmitPulse();
    try {
      const fd = new FormData();
      fd.append("audio", blob, "complaint.webm");
      fd.append("accusedPersonName", accusedPersonName.trim());
      fd.append("accusedAddress", accusedAddress.trim());
      if (assetsDescription.trim()) {
        fd.append("assetsDescription", assetsDescription.trim());
      }
      if (transcript.trim()) {
        fd.append("rawText", transcript.trim());
      }
      fd.append("language", language);
      if (incidentDate) fd.append("incidentDate", incidentDate);
      if (incidentTime) fd.append("incidentTime", incidentTime);
      if (incidentLocation) fd.append("incidentLocation", incidentLocation);
      if (witnessDetails) fd.append("witnessDetails", witnessDetails);
      fd.append(
        "durationSecs",
        String(durationSecsRef.current || Math.max(1, seconds)),
      );

      setWorkflowStage("analyzing");
      setWorkflowMessage(
        "Checking your details and matching legal sections...",
      );
      const result = await mlPipelineService.runAudio(fd);
      setWorkflowStage("finalizing");
      setWorkflowMessage("Preparing your result...");
      setPipelinePercent((prev) => Math.max(prev, 92));
      await Promise.resolve(onComplete(result.statement.id));
      setWorkflowStage("done");
      setWorkflowMessage("Your result is ready. You can review it now.");
      setPipelinePercent(100);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (e instanceof Error ? e.message : "Upload failed.");
      const lowerMsg = String(msg).toLowerCase();
      const isSessionExpired =
        lowerMsg.includes("session expired") ||
        lowerMsg.includes("token expired") ||
        lowerMsg.includes("authentication required");
      setWorkflowStage("error");
      if (isSessionExpired) {
        setWorkflowMessage("Session expired. Please log in again.");
        setError("Session expired. Please log in again.");
      } else {
        setWorkflowMessage(
          "Could not process this right now. Please try again.",
        );
        setError(String(msg));
      }
    } finally {
      clearSubmitTick();
      setBusy(false);
    }
  };

  const stageStatus: {
    transcription: StageState;
    ml: StageState;
    final: StageState;
  } = {
    transcription:
      workflowStage === "transcribing"
        ? "active"
        : [
              "transcript_ready",
              "submitting",
              "analyzing",
              "finalizing",
              "done",
            ].includes(workflowStage)
          ? "done"
          : workflowStage === "error"
            ? "error"
            : "pending",
    ml: ["submitting", "analyzing"].includes(workflowStage)
      ? "active"
      : ["finalizing", "done"].includes(workflowStage)
        ? "done"
        : workflowStage === "error"
          ? "error"
          : "pending",
    final:
      workflowStage === "finalizing"
        ? "active"
        : workflowStage === "done"
          ? "done"
          : workflowStage === "error"
            ? "error"
            : "pending",
  };

  const submitLabel = busy
    ? workflowStage === "analyzing"
      ? "Checking your details..."
      : workflowStage === "finalizing"
        ? "Preparing your result..."
        : "Submitting..."
    : "Submit Statement";

  const missingAccusedDetails =
    !accusedPersonName.trim() || !accusedAddress.trim();
  const submitDisabled =
    Boolean(disabled) ||
    busy ||
    transcribing ||
    (!audioBlob && !recording) ||
    missingAccusedDetails;

  const currentPhaseLabel =
    workflowStage === "idle"
      ? "Waiting for audio"
      : workflowStage === "recording"
        ? "Recording"
        : workflowStage === "transcribing"
          ? "Transcribing"
          : workflowStage === "transcript_ready"
            ? "Transcript ready"
            : workflowStage === "submitting"
              ? "Uploading statement"
              : workflowStage === "analyzing"
                ? "Checking details"
                : workflowStage === "finalizing"
                  ? "Preparing result"
                  : workflowStage === "done"
                    ? "Completed"
                    : "Attention required";

  const statusDot = (state: StageState) =>
    state === "done"
      ? "#22c55e"
      : state === "active"
        ? "#60a5fa"
        : state === "error"
          ? "#f87171"
          : "#64748b";

  const statusLabel = (state: StageState) =>
    state === "done"
      ? "Done"
      : state === "active"
        ? "In progress"
        : state === "error"
          ? "Needs attention"
          : "Waiting";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={heroNoteStyle}>
        <p style={{ color: "#cbd5e1", margin: 0, lineHeight: 1.55 }}>
          Speak in {languageLabel}. After you stop recording, your speech is
          converted into text. Review the text, make any edits if needed, and
          then submit.
        </p>
      </div>

      {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          title="Upload victim voice audio"
          aria-label="Upload victim voice audio"
          onChange={(event) => void handleFileSelected(event)}
          style={{ display: "none" }}
        />
        {!recording ? (
          <button
            type="button"
            disabled={disabled || busy || transcribing}
            onClick={startRecording}
            style={btnPrimary}
          >
            Start recording
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleStopClick}
            style={btnDanger}
          >
            Stop recording
          </button>
        )}
        <button
          type="button"
          disabled={disabled || busy || transcribing || recording}
          onClick={onPickAudioClick}
          style={btnSecondary}
        >
          Upload audio file
        </button>
        {recording && (
          <span style={{ color: "#f97316", fontWeight: 600 }}>
            Recording... {seconds}s
          </span>
        )}
        {transcribing && (
          <span style={{ color: "#60a5fa", fontWeight: 600 }}>
            Converting your recording into text... Please wait.
          </span>
        )}
        {audioBlob && !recording && !transcribing && (
          <span style={{ color: "#86efac", fontSize: 14 }}>
            Recording ready ({Math.round(audioBlob.size / 1024)} KB)
          </span>
        )}
      </div>

      <div style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <strong
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#94a3b8",
            }}
          >
            Review Your Transcript
          </strong>
          <span
            style={{
              fontSize: 12,
              color: transcribing
                ? "#60a5fa"
                : transcript
                  ? "#86efac"
                  : "#94a3b8",
            }}
          >
            {transcribing
              ? "Preparing text..."
              : transcript
                ? "You can edit this before submitting"
                : "Text will appear after recording stops"}
          </span>
        </div>
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={7}
          disabled={recording || transcribing}
          placeholder="Your statement text will appear here after recording. You can review and edit before submitting."
          style={transcriptStyle}
        />
      </div>

      <div style={panelStyle}>
        <strong
          style={{
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          Status
        </strong>
        <div
          style={{ display: "grid", gap: 8, color: "#e5e7eb", fontSize: 14 }}
        >
          <span style={{ color: "#cbd5e1" }}>
            Overall Progress:{" "}
            <strong style={{ color: "#f8fafc" }}>{pipelinePercent}%</strong>
          </span>
          <span style={{ color: "#cbd5e1" }}>
            Current Phase:{" "}
            <strong style={{ color: "#f8fafc" }}>{currentPhaseLabel}</strong>
          </span>

          {[
            { label: "Speech to text", state: stageStatus.transcription },
            { label: "Checking details", state: stageStatus.ml },
            { label: "Preparing result", state: stageStatus.final },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#cbd5e1",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: statusDot(row.state),
                  boxShadow:
                    row.state === "active"
                      ? "0 0 0 4px rgba(96,165,250,0.18)"
                      : "none",
                }}
              />
              <span>{row.label}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {statusLabel(row.state)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <motion.button
        type="button"
        disabled={submitDisabled}
        onClick={handleSubmitAudio}
        whileHover={submitDisabled ? {} : { scale: 1.01, y: -1 }}
        whileTap={submitDisabled ? {} : { scale: 0.99 }}
        animate={
          submitDisabled
            ? { opacity: 0.72 }
            : {
                opacity: [1, 0.95, 1],
                boxShadow: [
                  "0 0 0 rgba(249,115,22,0)",
                  "0 8px 28px rgba(249,115,22,0.35)",
                  "0 0 0 rgba(249,115,22,0)",
                ],
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          ...btnPrimary,
          cursor: submitDisabled ? "not-allowed" : "pointer",
          background:
            "linear-gradient(120deg, #f97316 0%, #fb923c 35%, #ea580c 65%, #f97316 100%)",
          backgroundSize: "200% 200%",
          letterSpacing: "0.02em",
        }}
      >
        {submitLabel}
      </motion.button>
      {missingAccusedDetails && (
        <p
          style={{
            margin: "4px 2px 0",
            color: "#fdba74",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          Please enter the accused person&apos;s name and address to continue.
        </p>
      )}
    </div>
  );
};

const heroNoteStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(30,41,59,0.5), rgba(15,23,42,0.75))",
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: 14,
  padding: "14px 16px",
};

const btnPrimary: CSSProperties = {
  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
  opacity: 1,
  transition: "opacity 0.2s",
};

const btnDanger: CSSProperties = {
  ...btnPrimary,
  background: "#b91c1c",
};

const btnSecondary: CSSProperties = {
  background: "#1d4ed8",
  color: "#fff",
  border: "1px solid rgba(147,197,253,0.35)",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 16,
};

const transcriptStyle: CSSProperties = {
  width: "100%",
  background: "#0b1120",
  color: "#fff",
  borderRadius: 12,
  padding: 14,
  border: "1px solid #1f2937",
  minHeight: 160,
  resize: "vertical",
  fontFamily: "Inter, system-ui, sans-serif",
  lineHeight: 1.5,
};
