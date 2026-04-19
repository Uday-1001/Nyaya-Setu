import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Mic,
  Square,
  RotateCcw,
  Upload,
  Loader2,
  Download,
  FileText,
  ChevronDown,
  Link2,
  Languages,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { WaveformDisplay } from "./WaveformDisplay";
import { officerService } from "../../services/officerService";
import type { MockFIR, VoiceRec } from "../../data/officerMock";
import { useNavigate } from "react-router-dom";

type Props = {
  onUploaded?: (recording: VoiceRec) => void;
  open?: boolean;
  onToggleOpen?: () => void;
  showToggleButton?: boolean;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

const LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "hinglish", label: "Hinglish" },
];

const toSpeechLocale = (lang: string) => (lang === "en" ? "en-IN" : "hi-IN");

const toUploadLanguage = (lang: string) => (lang === "hinglish" ? "hi" : lang);

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  const maybe = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return maybe.SpeechRecognition ?? maybe.webkitSpeechRecognition ?? null;
};

const pickMime = () => {
  const preferred = "audio/webm;codecs=opus";
  if (
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported(preferred)
  )
    return preferred;
  if (
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported("audio/webm")
  )
    return "audio/webm";
  return "";
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `00:${minutes}:${seconds}`;
};

/* ── Print-window PDF generator ───────────────────────────────────────
   Opens a styled HTML page in a new window and triggers window.print().
   The browser converts it to PDF natively — supports all Unicode/Hindi.  */
const openTranscriptPrintWindow = (
  recording: VoiceRec,
  linkedFir: MockFIR | undefined,
): void => {
  const now = new Date().toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // ── Build BNS section HTML ─────────────────────────────────────────
  let sectionsHtml = "";
  if (
    linkedFir &&
    linkedFir.sectionMappings &&
    linkedFir.sectionMappings.length > 0
  ) {
    for (const sec of linkedFir.sectionMappings) {
      sectionsHtml += `
        <div class="section-card">
          <div class="section-header">BNS &sect; ${sec.sectionNumber} &mdash; ${sec.sectionTitle}</div>
          ${sec.ipcEquivalent ? `<div class="section-row"><span class="label">IPC Equivalent:</span> &sect; ${sec.ipcEquivalent}${sec.ipcTitle ? ` (${sec.ipcTitle})` : ""}</div>` : ""}
          <div class="section-row">
            <span class="badge ${sec.cognizable ? "badge-red" : "badge-gray"}">${sec.cognizable ? "Cognizable" : "Non-Cognizable"}</span>
            <span class="badge ${sec.bailable ? "badge-green" : "badge-red"}">${sec.bailable ? "Bailable" : "Non-Bailable"}</span>
          </div>
          ${sec.description ? `<div class="section-desc">${sec.description}</div>` : ""}
          ${sec.reasoning ? `<div class="section-reasoning"><span class="label">AI Reasoning:</span> ${sec.reasoning}</div>` : ""}
        </div>`;
    }
  } else if (linkedFir) {
    sectionsHtml = `
      <div class="section-card">
        <div class="section-header">${linkedFir.bnsCode} &mdash; ${linkedFir.bnsTitle}</div>
        <div class="section-row"><span class="label">IPC Equivalent:</span> ${linkedFir.ipcEquiv}</div>
        <div class="section-row"><span class="label">Punishment:</span> ${linkedFir.punishmentLine}</div>
        <div class="section-row">
          <span class="badge badge-red">${linkedFir.cognizable}</span>
          <span class="badge badge-red">${linkedFir.bailable}</span>
        </div>
      </div>`;
  } else {
    sectionsHtml =
      '<p class="muted">BNS/IPC sections will be mapped after FIR generation. Use &ldquo;Generate FIR Draft&rdquo; to trigger AI section mapping.</p>';
  }

  const rawTranscript = recording.transcript || "No transcript available.";
  const transcriptLines = rawTranscript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const readMeta = (prefix: string) => {
    const target = `${prefix.toLowerCase()}:`;
    const hit = transcriptLines.find((line) =>
      line.toLowerCase().startsWith(target),
    );
    return hit ? hit.slice(target.length).trim() : "Not provided";
  };

  const accusedPersonName = readMeta("Accused person name");
  const accusedAddress = readMeta("Accused person address");
  const assetsDescription = readMeta("Assets description");

  const transcriptWithoutMeta = rawTranscript
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = line.trim().toLowerCase();
      return !(
        normalized.startsWith("accused person name:") ||
        normalized.startsWith("accused person address:") ||
        normalized.startsWith("assets description:")
      );
    })
    .join("\n")
    .trim();

  const transcriptText = (transcriptWithoutMeta || rawTranscript)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NyayaSetu &mdash; Voice Statement Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; color: #1a1a1a; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #555; margin-bottom: 20px; }
    .header-bar { border-top: 4px solid #FF9933; border-bottom: 4px solid #138808; padding: 12px 0; margin-bottom: 24px; }
    .triline { width: 100%; height: 4px; background: linear-gradient(to right, #FF9933 33%, #fff 33% 66%, #138808 66%); margin-bottom: 16px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; margin-bottom: 24px; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 2px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #111; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #555; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin: 24px 0 12px; }
    .section-card { border: 1px solid #e0e0e0; border-left: 4px solid #1a56db; border-radius: 4px; padding: 12px 14px; margin-bottom: 12px; background: #f9fafb; }
    .section-header { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .section-row { font-size: 12px; margin-bottom: 6px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .section-desc { font-size: 12px; color: #444; margin-top: 8px; line-height: 1.7; border-top: 1px solid #e5e5e5; padding-top: 8px; }
    .section-reasoning { font-size: 12px; color: #555; margin-top: 8px; font-style: italic; line-height: 1.7; }
    .label { font-weight: 600; color: #333; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; }
    .meta-card .section-row { margin-bottom: 7px; }
    .transcript-box { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; font-size: 13px; line-height: 1.9; white-space: pre-wrap; word-break: break-word; margin-top: 8px; font-family: 'Noto Sans', 'Segoe UI', Arial, sans-serif; }
    .muted { color: #888; font-style: italic; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 12px; font-size: 11px; color: #888; text-align: center; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      .section-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="triline"></div>
  <div class="header-bar">
    <h1>NyayaSetu &mdash; Voice Statement &amp; FIR Draft Report</h1>
    <p class="subtitle">Bharatiya Nyaya Sanhita (BNS) 2024 | Ministry of Home Affairs, Government of India</p>
  </div>

  <h2>Recording Details</h2>
  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Generated</span><span class="meta-value">${now}</span></div>
    <div class="meta-item"><span class="meta-label">Recording ID</span><span class="meta-value">${recording.label}</span></div>
    <div class="meta-item"><span class="meta-label">Duration</span><span class="meta-value">${recording.duration}</span></div>
    <div class="meta-item"><span class="meta-label">Language</span><span class="meta-value">${recording.language.toUpperCase()}</span></div>
    <div class="meta-item"><span class="meta-label">Recorded At</span><span class="meta-value">${recording.recordedAt}</span></div>
    <div class="meta-item"><span class="meta-label">Officer Verified</span><span class="meta-value">${recording.verified ? "&#10003; Yes" : "Pending"}</span></div>
    ${
      linkedFir
        ? `
    <div class="meta-item"><span class="meta-label">FIR Number</span><span class="meta-value">${linkedFir.firNo}</span></div>
    <div class="meta-item"><span class="meta-label">FIR Status</span><span class="meta-value">${linkedFir.status}</span></div>`
        : ""
    }
  </div>

  <h2>BNS / IPC Section Mapping</h2>
  ${sectionsHtml}

  <h2>Accused &amp; Assets Details</h2>
  <div class="meta-card">
    <div class="section-row"><span class="label">Accused Person Name:</span> ${accusedPersonName}</div>
    <div class="section-row"><span class="label">Accused Person Address:</span> ${accusedAddress}</div>
    <div class="section-row"><span class="label">Assets Description (If Any):</span> ${assetsDescription}</div>
  </div>

  <h2>Victim / Witness Transcript</h2>
  <div class="transcript-box">${transcriptText}</div>

  <div class="footer">
    NyayaSetu Digital Justice System &nbsp;&bull;&nbsp; Bharatiya Nyaya Sanhita 2024 &nbsp;&bull;&nbsp; Ministry of Home Affairs, GoI
  </div>

  <script>
    // Auto-trigger print dialog after fonts load
    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
  <\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // Fallback if popups are blocked: download as an HTML file
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NyayaSetu-Report-${recording.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
};

export const VoiceRecorder = ({
  onUploaded,
  open: controlledOpen,
  onToggleOpen,
  showToggleButton = true,
}: Props) => {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingFir, setGeneratingFir] = useState(false);
  const [generatedFirId, setGeneratedFirId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [language, setLanguage] = useState("hi");
  const [activeDropdown, setActiveDropdown] = useState<
    "fir" | "language" | null
  >(null);
  const [firId, setFirId] = useState("");
  const [firs, setFirs] = useState<MockFIR[]>([]);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedRecording, setUploadedRecording] = useState<VoiceRec | null>(
    null,
  );

  const recorderRef = useRef<MediaRecorder | null>(null);
  const firDropdownRef = useRef<HTMLDivElement | null>(null);
  const languageDropdownRef = useRef<HTMLDivElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const finalPartsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    if (!open) return;
    void officerService
      .listFirs()
      .then((items) => {
        if (active) setFirs(items);
      })
      .catch(() => {
        if (active) setFirs([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedFir = firDropdownRef.current?.contains(target);
      const clickedLanguage = languageDropdownRef.current?.contains(target);
      if (!clickedFir && !clickedLanguage) setActiveDropdown(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveDropdown(null);
    };

    window.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectedFir = useMemo(
    () => firs.find((item) => item.id === firId),
    [firId, firs],
  );

  const selectedLanguageLabel = useMemo(
    () => LANGUAGES.find((item) => item.code === language)?.label ?? "Hindi",
    [language],
  );

  const selectedFirLabel = selectedFir
    ? `${selectedFir.firNo} - ${selectedFir.bnsTitle}`
    : "Unlinked recording";

  const hasAudio = Boolean(audioBlob);
  const hasTranscript = Boolean((finalTranscript || transcript).trim());
  const hasUpload = Boolean(uploadedRecording);
  const canRetry =
    recording ||
    elapsed > 0 ||
    hasAudio ||
    hasTranscript ||
    hasUpload ||
    Boolean(generatedFirId) ||
    Boolean(error) ||
    Boolean(success);

  const workflowSteps = [
    {
      key: "record",
      title: "Record incident audio",
      subtitle: hasAudio
        ? `Captured ${formatTime(Math.max(1, elapsed))}`
        : "Tap the mic and start speaking",
      done: hasAudio,
      active: recording,
    },
    {
      key: "transcript",
      title: "Review transcript",
      subtitle: hasTranscript
        ? "Transcript captured and ready"
        : "Stop recording to review text",
      done: hasTranscript,
      active: !recording && hasAudio && !hasTranscript,
    },
    {
      key: "upload",
      title: selectedFir ? "Upload and link to FIR" : "Upload statement",
      subtitle: hasUpload
        ? selectedFir
          ? `Linked to ${selectedFir.firNo}`
          : "Uploaded as unlinked statement"
        : "Upload audio and transcript",
      done: hasUpload,
      active: hasTranscript && !hasUpload,
    },
    {
      key: "final",
      title: selectedFir ? "Ready for officer review" : "Generate FIR draft",
      subtitle: selectedFir
        ? hasUpload
          ? "Statement linked and ready"
          : "Completes after upload"
        : generatedFirId
          ? "FIR draft generated"
          : "Optional after upload",
      done: selectedFir ? hasUpload : Boolean(generatedFirId),
      active:
        generatingFir || Boolean(!selectedFir && hasUpload && !generatedFirId),
    },
  ];

  const completedSteps = workflowSteps.filter((item) => item.done).length;
  const workflowProgress = Math.round(
    (completedSteps / workflowSteps.length) * 100,
  );

  const nextActionText = recording
    ? "Stop recording to continue."
    : !hasAudio
      ? "Start recording to begin workflow."
      : !hasTranscript
        ? "Wait for transcript capture, then review."
        : !hasUpload
          ? "Upload now to save this statement."
          : !selectedFir && !generatedFirId
            ? "Generate FIR draft or download transcript PDF."
            : "Workflow complete. Proceed to FIR details.";

  const stopSpeechRecognition = () => {
    speechRef.current?.stop();
    speechRef.current = null;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const resetDraft = () => {
    setRecording(false);
    setElapsed(0);
    setTranscript("");
    setFinalTranscript("");
    setAudioBlob(null);
    setUploadedRecording(null);
    setGeneratedFirId(null);
    setError(null);
    setSuccess(null);
    finalPartsRef.current = [];
    clearTimer();
    stopSpeechRecognition();
    stopStream();
    recorderRef.current = null;
    chunksRef.current = [];
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resolveFileDuration = async (file: File): Promise<number> => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio();
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
          const secs = Number.isFinite(audio.duration)
            ? Math.max(1, Math.round(audio.duration))
            : 0;
          URL.revokeObjectURL(objectUrl);
          resolve(secs);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(0);
        };
        audio.src = objectUrl;
      });
      if (duration > 0) return duration;
    } catch {
      // fall through to size-based estimate
    }

    return Math.max(1, Math.round(file.size / 24000));
  };

  const onPickAudioFile = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleAudioFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (recording) {
      await stopRecording();
    } else {
      stopSpeechRecognition();
      stopStream();
      clearTimer();
    }

    setTranscript("");
    setFinalTranscript("");
    finalPartsRef.current = [];
    setUploadedRecording(null);
    setGeneratedFirId(null);
    setSuccess(
      "Audio file selected. You can now upload it directly as victim voice evidence.",
    );

    const blob = file.slice(0, file.size, file.type || "audio/webm");
    setAudioBlob(blob);
    setElapsed(await resolveFileDuration(file));

    event.target.value = "";
  };

  const startSpeechRecognition = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const speech = new Ctor();
    speech.continuous = true;
    speech.interimResults = true;
    speech.lang = toSpeechLocale(language);
    speech.onresult = (event) => {
      const interim: string[] = [];
      const finals = [...finalPartsRef.current];
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const value = result[0]?.transcript?.trim();
        if (!value) continue;
        if (result.isFinal) finals.push(value);
        else interim.push(value);
      }
      finalPartsRef.current = finals;
      setFinalTranscript(finals.join(" ").trim());
      setTranscript([...finals, ...interim].join(" ").trim());
    };
    speech.onerror = () => {
      // Keep recording/upload flow usable even if browser live transcription fails.
    };
    speech.start();
    speechRef.current = speech;
  };

  const startRecording = async () => {
    resetDraft();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(250);
      startedAtRef.current = Date.now();
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setElapsed(
          Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)),
        );
      }, 500);
      startSpeechRecognition();
    } catch {
      setError(
        "Microphone access failed. Please allow mic permissions and try again.",
      );
    }
  };

  const stopRecording = async () => {
    clearTimer();
    stopSpeechRecognition();
    const recorder = recorderRef.current;

    if (!recorder) {
      setRecording(false);
      stopStream();
      return;
    }

    if (recorder.state === "inactive") {
      setRecording(false);
      stopStream();
      return;
    }

    return new Promise<void>((resolve) => {
      const onStop = () => {
        recorder.removeEventListener("stop", onStop);
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob.size > 0 ? blob : null);
        setRecording(false);
        stopStream();
        resolve();
      };

      recorder.addEventListener("stop", onStop);
      try {
        recorder.stop();
      } catch (err) {
        console.error("Error stopping recorder:", err);
        setRecording(false);
        stopStream();
        resolve();
      }
    });
  };

  const uploadRecording = async () => {
    if (!audioBlob) {
      setError("Record a statement first.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = new FormData();
      payload.append(
        "audio",
        audioBlob,
        `voice-statement.${audioBlob.type.includes("ogg") ? "ogg" : "webm"}`,
      );
      payload.append("language", toUploadLanguage(language));
      if (firId) payload.append("firId", firId);
      if (finalTranscript || transcript)
        payload.append("rawText", (finalTranscript || transcript).trim());
      payload.append("durationSecs", String(Math.max(1, elapsed)));

      const uploaded = await officerService.uploadVoiceRecording(payload);
      const merged = {
        ...uploaded,
        transcript: uploaded.transcript || transcript || finalTranscript,
      };
      setUploadedRecording(merged);
      setTranscript(merged.transcript || "");
      setFinalTranscript(merged.transcript || "");
      setSuccess(
        selectedFir
          ? `Recording linked to ${selectedFir.firNo} and transcript saved.`
          : "Recording uploaded and transcript saved. You can now generate a FIR draft or download the transcript PDF.",
      );
      onUploaded?.(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateFir = async () => {
    if (!uploadedRecording) {
      setError("Upload the voice recording first.");
      return;
    }
    try {
      setGeneratingFir(true);
      setError(null);
      const fir = await officerService.generateFIRFromRecording(
        uploadedRecording.id,
      );
      setGeneratedFirId(fir.id);
      setSuccess(`Draft FIR ${fir.firNo} generated with BNS and IPC mapping.`);
      // Short delay so the success message is visible before navigation
      setTimeout(() => navigate(`/officer/fir/${fir.id}`), 1200);
    } catch (err: unknown) {
      // Surface the real server error message so the officer can see what failed
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })
          ?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (err instanceof Error ? err.message : "Failed to generate FIR.");
      console.error("[GenerateFIR] Error:", err);
      setError(msg);
    } finally {
      setGeneratingFir(false);
    }
  };

  const handleDownloadTranscriptPdf = () => {
    if (!uploadedRecording) {
      setError("Upload recording first.");
      return;
    }
    try {
      openTranscriptPrintWindow(uploadedRecording, selectedFir);
      setSuccess('Print dialog opened — use "Save as PDF" to download.');
    } catch (err) {
      console.error("[PDF] Error opening print window:", err);
      setError(
        "Could not open print window. Please allow pop-ups for this site.",
      );
    }
  };

  return (
    <div>
      <style>{`
        .voice-dropdown-list::-webkit-scrollbar {
          width: 8px;
        }

        .voice-dropdown-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
        }

        .voice-dropdown-list::-webkit-scrollbar-thumb {
          background: #F97316;
          border-radius: 4px;
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes buttonSweep {
          0% {
            transform: translateX(-130%) skewX(-18deg);
          }
          100% {
            transform: translateX(220%) skewX(-18deg);
          }
        }

        @keyframes subtlePulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.15);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.05);
          }
        }

        .voice-recorder-container {
          animation: slideInUp 0.6s ease-out;
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 0 30px rgba(249, 115, 22, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .voice-recorder-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .voice-recorder-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          width: 36%;
          background: linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.28) 50%, transparent 100%);
          pointer-events: none;
          opacity: 0;
          transform: translateX(-130%) skewX(-18deg);
        }

        .voice-recorder-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
        }

        .voice-recorder-btn:not(:disabled):hover::before {
          opacity: 1;
          animation: buttonSweep 0.8s ease-out;
        }

        .voice-recorder-btn:not(:disabled):active {
          transform: translateY(0) scale(0.98);
        }

        .voice-select {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          transition: all 0.3s ease-out;
          border-color: rgba(249, 115, 22, 0.3);
          padding-left: 2.3rem;
          padding-right: 2.5rem;
          cursor: pointer;
          text-align: left;
          min-height: 44px;
        }

        .voice-select-wrap {
          position: relative;
          border-radius: 0.9rem;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(249, 115, 22, 0.16);
          transition: all 0.3s ease-out;
        }

        .voice-select-wrap:hover {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 0 1px rgba(249, 115, 22, 0.36), 0 0 20px rgba(249, 115, 22, 0.14);
          transform: translateY(-1px);
        }

        .voice-select-wrap:focus-within {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 0 1px rgba(249, 115, 22, 0.8), 0 0 24px rgba(249, 115, 22, 0.25);
        }

        .voice-select-wrap.open {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 0 1px rgba(249, 115, 22, 0.9), 0 0 28px rgba(249, 115, 22, 0.25);
        }

        .voice-select-icon {
          position: absolute;
          left: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          color: #fb923c;
          pointer-events: none;
        }

        .voice-select-caret {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #fdba74;
          pointer-events: none;
          transition: transform 0.24s ease;
        }

        .voice-select-caret.open {
          transform: translateY(-50%) rotate(180deg);
        }

        .voice-dropdown-list {
          position: absolute;
          top: calc(100% + 0.4rem);
          left: 0;
          right: 0;
          z-index: 40;
          max-height: 15.5rem;
          overflow: auto;
          border-radius: 0.85rem;
          border: 1px solid rgba(249, 115, 22, 0.45);
          background: rgba(9, 9, 11, 0.98);
          box-shadow: 0 20px 35px rgba(0, 0, 0, 0.45), 0 0 25px rgba(249, 115, 22, 0.15);
          padding: 0.35rem;
          animation: slideInDown 0.2s ease-out;
        }

        .voice-dropdown-option {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          color: #e5e7eb;
          border-radius: 0.55rem;
          padding: 0.58rem 0.65rem;
          font-size: 0.83rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .voice-dropdown-option:hover {
          background: rgba(249, 115, 22, 0.18);
          color: white;
        }

        .voice-dropdown-option.active {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(234, 88, 12, 0.95));
          color: white;
        }

        .voice-dropdown-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .voice-select:hover {
          border-color: rgba(249, 115, 22, 0.6);
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .voice-select:focus {
          outline: none;
          border-color: #F97316;
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .voice-textarea {
          transition: all 0.3s ease-out;
          border-color: rgba(249, 115, 22, 0.2);
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .voice-textarea:focus {
          outline: none;
          border-color: #F97316;
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .voice-section {
          animation: slideInUp 0.5s ease-out;
          border-color: rgba(255, 255, 255, 0.12);
          background: #0a0a0a;
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease-out;
        }

        .voice-section:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .voice-section:nth-of-type(1) {
          animation-delay: 0.1s;
        }

        .voice-section:nth-of-type(2) {
          animation-delay: 0.15s;
        }

        .voice-status-item {
          animation: fadeIn 0.6s ease-out;
          transition: all 0.3s ease-out;
        }

        .voice-status-item:nth-child(1) {
          animation-delay: 0.1s;
        }

        .voice-status-item:nth-child(2) {
          animation-delay: 0.2s;
        }

        .voice-status-item:nth-child(3) {
          animation-delay: 0.3s;
        }

        .voice-error-message {
          animation: slideInUp 0.4s ease-out;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 8px;
          padding: 12px;
        }

        .voice-success-message {
          animation: slideInUp 0.4s ease-out;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          padding: 12px;
        }

        .voice-workflow-shell {
          border: 1px solid rgba(249, 115, 22, 0.22);
          background: linear-gradient(180deg, rgba(249, 115, 22, 0.08), rgba(10, 10, 10, 0.4));
          border-radius: 12px;
          padding: 12px;
        }

        .voice-progress-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
        }

        .voice-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #f97316, #fb923c);
          transition: width 0.35s ease;
        }

        .voice-step-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .voice-step-row.active {
          border-color: rgba(251, 146, 60, 0.6);
          background: rgba(249, 115, 22, 0.1);
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.15);
        }

        .voice-step-row.done {
          border-color: rgba(16, 185, 129, 0.45);
          background: rgba(16, 185, 129, 0.08);
        }

        .voice-step-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .voice-step-title {
          color: #f3f4f6;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1.2;
        }

        .voice-step-subtitle {
          color: #9ca3af;
          font-size: 0.73rem;
          line-height: 1.3;
          word-break: break-word;
        }

        .voice-upload-btn {
          background: linear-gradient(to right, #F97316, #ea580c);
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.2);
          animation: subtlePulse 2.6s ease-in-out infinite;
        }

        .voice-upload-btn:not(:disabled):hover {
          box-shadow: 0 8px 25px rgba(249, 115, 22, 0.4);
        }

        .voice-download-btn {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
          animation: slideInUp 0.5s ease-out 0.2s both;
        }

        .voice-download-btn:not(:disabled):hover {
          border-color: rgba(59, 130, 246, 0.8);
          background: rgba(59, 130, 246, 0.2);
        }

        .voice-generate-btn {
          border-color: rgba(249, 115, 22, 0.5);
          background: rgba(249, 115, 22, 0.1);
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.2);
          animation: slideInUp 0.5s ease-out 0.25s both;
        }

        .voice-generate-btn:not(:disabled):hover {
          border-color: rgba(249, 115, 22, 0.8);
          background: rgba(249, 115, 22, 0.2);
        }
      `}</style>

      {showToggleButton ? (
        <div className="mb-4 flex w-full justify-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              if (open) resetDraft();
              if (onToggleOpen) onToggleOpen();
              else setInternalOpen((prev) => !prev);
            }}
            className="voice-recorder-btn inline-flex min-w-[190px] items-center justify-center rounded-xl bg-[#F97316] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-[#ea580c]"
          >
            {open ? "Close Recorder" : "New Recording"}
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="voice-recorder-container rounded-xl p-6 space-y-5 backdrop-blur-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div
              className={`voice-select-wrap ${activeDropdown === "fir" ? "open" : ""}`}
              ref={firDropdownRef}
            >
              <Link2 className="voice-select-icon h-4 w-4" strokeWidth={2.2} />
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "fir" ? null : "fir"))
                }
                className="voice-select rounded-xl border bg-[#0a0a0a] py-2.5 text-sm text-white font-semibold"
                title="Select FIR to link this recording to"
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "fir"}
              >
                <span className="voice-dropdown-value">{selectedFirLabel}</span>
              </button>
              <ChevronDown
                className={`voice-select-caret h-4 w-4 ${activeDropdown === "fir" ? "open" : ""}`}
                strokeWidth={2.4}
              />

              {activeDropdown === "fir" ? (
                <div className="voice-dropdown-list" role="listbox">
                  <button
                    type="button"
                    className={`voice-dropdown-option ${!firId ? "active" : ""}`}
                    onClick={() => {
                      setFirId("");
                      setActiveDropdown(null);
                    }}
                  >
                    Unlinked recording
                  </button>
                  {firs.map((fir) => (
                    <button
                      key={fir.id}
                      type="button"
                      className={`voice-dropdown-option ${firId === fir.id ? "active" : ""}`}
                      onClick={() => {
                        setFirId(fir.id);
                        setActiveDropdown(null);
                      }}
                    >
                      {fir.firNo} - {fir.bnsTitle}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className={`voice-select-wrap ${activeDropdown === "language" ? "open" : ""}`}
              ref={languageDropdownRef}
            >
              <Languages
                className="voice-select-icon h-4 w-4"
                strokeWidth={2.1}
              />
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown((prev) =>
                    prev === "language" ? null : "language",
                  )
                }
                className="voice-select rounded-xl border bg-[#0a0a0a] py-2.5 text-sm text-white font-semibold"
                title="Select recording language"
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "language"}
              >
                <span className="voice-dropdown-value">
                  {selectedLanguageLabel}
                </span>
              </button>
              <ChevronDown
                className={`voice-select-caret h-4 w-4 ${activeDropdown === "language" ? "open" : ""}`}
                strokeWidth={2.4}
              />

              {activeDropdown === "language" ? (
                <div className="voice-dropdown-list" role="listbox">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={`voice-dropdown-option ${language === item.code ? "active" : ""}`}
                      onClick={() => {
                        setLanguage(item.code);
                        setActiveDropdown(null);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              title="Upload victim voice file"
              aria-label="Upload victim voice file"
              onChange={(event) => void handleAudioFileSelected(event)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() =>
                void (recording ? stopRecording() : startRecording())
              }
              disabled={uploading}
              className={`flex h-20 w-20 items-center justify-center rounded-full border-4 transition-colors ${
                recording
                  ? "border-[#DC2626] bg-[#DC2626] text-white"
                  : "border-white/[0.12] bg-white/[0.06] text-[#F97316]"
              }`}
            >
              {recording ? (
                <Square className="h-8 w-8" strokeWidth={2.5} />
              ) : (
                <Mic className="h-9 w-9" strokeWidth={2} />
              )}
            </button>
            <WaveformDisplay active={recording} />
            <p className="font-mono text-lg text-white tabular-nums">
              {formatTime(elapsed)}
            </p>
            <p className="text-xs text-[#9CA3AF]">
              {recording
                ? "Live transcription uses browser speech recognition when available."
                : "Stop recording to review and upload the transcript."}
            </p>
            <button
              type="button"
              onClick={resetDraft}
              disabled={uploading || generatingFir || !canRetry}
              className="voice-recorder-btn inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D1D5DB] transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry Recording
            </button>
            <button
              type="button"
              onClick={onPickAudioFile}
              disabled={uploading || generatingFir || recording}
              className="voice-recorder-btn inline-flex items-center gap-2 rounded-lg border border-[#3b82f6]/40 bg-[#3b82f6]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#bfdbfe] transition-colors hover:bg-[#3b82f6]/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Victim Voice File
            </button>
          </div>

          {error ? (
            <p className="text-sm text-[#FCA5A5] voice-error-message">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-[#86EFAC] voice-success-message">
              {success}
            </p>
          ) : null}

          <div className="voice-section rounded-xl p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">
              🔄 Workflow Status
            </p>
            <div className="voice-workflow-shell mb-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#FDBA74]">
                <span>Progress</span>
                <span>{workflowProgress}%</span>
              </div>
              <div className="voice-progress-track">
                <div
                  className="voice-progress-fill"
                  style={{ width: `${workflowProgress}%` }}
                />
              </div>

              <div className="space-y-2">
                {workflowSteps.map((step) => (
                  <div
                    key={step.key}
                    className={`voice-step-row ${step.done ? "done" : ""} ${step.active ? "active" : ""}`}
                  >
                    {step.done ? (
                      <CheckCircle2
                        className="mt-[1px] h-4 w-4 text-emerald-300"
                        strokeWidth={2.3}
                      />
                    ) : step.active ? (
                      <Loader2
                        className="mt-[1px] h-4 w-4 animate-spin text-[#FDBA74]"
                        strokeWidth={2.3}
                      />
                    ) : (
                      <Circle
                        className="mt-[1px] h-4 w-4 text-[#9CA3AF]"
                        strokeWidth={2}
                      />
                    )}

                    <div className="voice-step-meta">
                      <p className="voice-step-title">{step.title}</p>
                      <p className="voice-step-subtitle">{step.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#D1D5DB]">
                <span className="font-bold text-[#FDBA74]">Next:</span>{" "}
                {nextActionText}
              </p>
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={() => void uploadRecording()}
              disabled={recording || uploading || !audioBlob}
              className="voice-recorder-btn voice-upload-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Processing Recording" : "Upload, Transcribe, Link"}
            </button>

            {/* Download Transcript PDF — available right after upload */}
            {uploadedRecording ? (
              <button
                type="button"
                onClick={handleDownloadTranscriptPdf}
                disabled={recording || uploading}
                className="voice-recorder-btn voice-download-btn mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#93C5FD] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Transcript PDF
              </button>
            ) : null}

            {/* Generate FIR Draft — only for unlinked recordings */}
            {!selectedFir && uploadedRecording ? (
              <button
                type="button"
                onClick={() => void handleGenerateFir()}
                disabled={recording || uploading || generatingFir}
                className="voice-recorder-btn voice-generate-btn mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#FDBA74] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingFir ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {generatingFir ? "Generating FIR Draft…" : "Generate FIR Draft"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
