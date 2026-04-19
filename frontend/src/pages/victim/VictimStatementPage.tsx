import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Mic,
  Send,
  Type,
  UserX,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldAlert,
  CheckCircle2,
  Download,
  FileSearch,
  RefreshCw,
  Building2,
  Search,
  ChevronDown,
} from "lucide-react";
import { useStatement } from "../../features/victim/statement/useStatement";
import { StatementVoiceTab } from "../../features/victim/statement/StatementVoiceTab";
import { mlPipelineService } from "../../services/mlPipelineService";
import { bnsService } from "../../services/bnsService";
import { stationService } from "../../services/stationService";
import { statementService } from "../../services/statementService";
import { useAuthStore } from "../../store/authStore";
import { downloadStatementReportPdf } from "../../features/victim/statement/statementPdf";
import { readVictimTheme } from "../../features/victim/theme/victimTheme";

type Tab = "text" | "voice";

type AnalysisBundle = {
  statement: Record<string, unknown> | null;
  classification: Record<string, unknown> | null;
  resolution: Record<string, unknown> | null;
  rights: Record<string, unknown> | null;
};

type VictimStation = {
  id: string;
  name: string;
  district: string;
  state: string;
  stationCode?: string;
};

/* ── Animation Variants ── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 20 },
  },
};

export const VictimStatementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { latestStatement, isLoading, error, reload } = useStatement();
  const user = useAuthStore((s) => s.user);
  const [isDark] = useState(() => readVictimTheme());

  const [tab, setTab] = useState<Tab>("text");
  const [rawText, setRawText] = useState("");
  const [accusedPersonName, setAccusedPersonName] = useState("");
  const [accusedAddress, setAccusedAddress] = useState("");
  const [assetsDescription, setAssetsDescription] = useState("");
  const [language, setLanguage] = useState("hi");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("");
  const [witnessDetails, setWitnessDetails] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisBundle | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureFileName, setSignatureFileName] = useState<string | null>(
    null,
  );
  const [refreshingWorkspace, setRefreshingWorkspace] = useState(false);
  const [stations, setStations] = useState<VictimStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationQuery, setStationQuery] = useState("");
  const [stationPickerOpen, setStationPickerOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendingToStation, setSendingToStation] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const stationPickerRef = useRef<HTMLDivElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const textSubmitDisabled =
    saving ||
    isLoading ||
    !rawText.trim() ||
    !accusedPersonName.trim() ||
    !accusedAddress.trim();
  const activeStatementId = useMemo(
    () =>
      (analysis?.statement?.id as string | undefined) ??
      (latestStatement?.id as string | undefined) ??
      undefined,
    [analysis?.statement?.id, latestStatement?.id],
  );
  const filteredStations = useMemo(() => {
    const query = stationQuery.trim().toLowerCase();
    if (!query) return stations;

    return stations.filter((station) => {
      const searchIndex =
        `${station.name} ${station.district} ${station.state} ${station.stationCode ?? ""}`.toLowerCase();
      return searchIndex.includes(query);
    });
  }, [stationQuery, stations]);
  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) ?? null,
    [selectedStationId, stations],
  );
  const stationOptions = useMemo(() => {
    if (!selectedStation) return filteredStations;
    if (filteredStations.some((station) => station.id === selectedStation.id)) {
      return filteredStations;
    }
    return [selectedStation, ...filteredStations];
  }, [filteredStations, selectedStation]);
  const formatStationLine = (station: VictimStation) =>
    `${station.name} ${station.stationCode ? `- ${station.stationCode}` : ""}, ${station.district}, ${station.state}`;

  useEffect(() => {
    if (latestStatement?.rawText) {
      setRawText(latestStatement.rawText as string);
    }
  }, [latestStatement?.id, latestStatement?.rawText]);

  useEffect(() => {
    if (!analysis) return;
    workspaceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [analysis]);

  useEffect(() => {
    document.body.style.background = isDark ? "#0f0f0f" : "#f8fafc";
    return () => {
      document.body.style.background = "";
    };
  }, [isDark]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab");
    if (requestedTab === "voice") {
      setTab("voice");
    }
  }, [location.search]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!stationPickerRef.current) return;
      if (!stationPickerRef.current.contains(event.target as Node)) {
        setStationPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    const loadStations = async () => {
      setStationsLoading(true);
      try {
        const payload = await stationService.list();
        const rows = Array.isArray(payload)
          ? (payload.filter((row): row is VictimStation => {
              return (
                typeof row?.id === "string" &&
                typeof row?.name === "string" &&
                typeof row?.district === "string" &&
                typeof row?.state === "string"
              );
            }) as VictimStation[])
          : [];

        setStations(rows);
        if (!selectedStationId && rows[0]?.id) {
          setSelectedStationId(rows[0].id);
        }
      } catch (e: unknown) {
        const msg =
          (e as any)?.response?.data?.message ??
          (e instanceof Error
            ? e.message
            : "Unable to load registered police stations.");
        setPageError(String(msg));
      } finally {
        setStationsLoading(false);
      }
    };

    void loadStations();
  }, []);

  const goClassify = (statementId: string) => {
    void reload();
    navigate("/victim/classify", { state: { statementId } });
  };

  const hydrateAnalysisForStatement = async (statementId: string) => {
    setAnalysisLoading(true);
    try {
      const [classificationData, resolutionData, rightsData] =
        await Promise.all([
          bnsService.classify(statementId),
          bnsService.getResolution(statementId),
          bnsService.getRights(statementId),
        ]);

      const statementFromClassification =
        ((classificationData as Record<string, unknown>)?.victimStatement as
          | Record<string, unknown>
          | undefined) ?? null;

      setAnalysis({
        statement:
          statementFromClassification ??
          (latestStatement as Record<string, unknown> | null) ??
          null,
        classification: classificationData as Record<string, unknown>,
        resolution: resolutionData as Record<string, unknown>,
        rights: rightsData as Record<string, unknown>,
      });
      await reload();
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleVoiceComplete = async (statementId: string) => {
    setPageError(null);
    setAnalysis(null);
    try {
      await hydrateAnalysisForStatement(statementId);
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "Could not analyze voice statement.");
      setPageError(String(msg));
    }
  };

  const handleDownloadPdf = async () => {
    setPageError(null);
    setPdfLoading(true);
    try {
      const activeStatement = analysis?.statement ?? null;
      const statementId =
        (activeStatement?.id as string | undefined) ??
        (analysis?.classification?.victimStatementId as string | undefined) ??
        undefined;

      if (!statementId) {
        throw new Error(
          "Please save and analyze a statement before generating PDF.",
        );
      }

      let classificationData = analysis?.classification ?? null;
      let resolutionData = analysis?.resolution ?? null;
      let rightsData = analysis?.rights ?? null;

      if (!classificationData || !resolutionData || !rightsData) {
        const [c, r, ri] = await Promise.all([
          bnsService.classify(statementId),
          bnsService.getResolution(statementId),
          bnsService.getRights(statementId),
        ]);
        classificationData = c as Record<string, unknown>;
        resolutionData = r as Record<string, unknown>;
        rightsData = ri as Record<string, unknown>;
      }

      downloadStatementReportPdf({
        user,
        statement: activeStatement,
        classification: classificationData,
        resolution: resolutionData,
        rights: rightsData,
        signatureDataUrl,
      });
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "Unable to generate PDF right now.");
      setPageError(String(msg));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSignatureFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPageError("Please upload a valid image file for digital signature.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setPageError("Signature image must be smaller than 3 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSignatureDataUrl(reader.result);
        setSignatureFileName(file.name);
        setPageError(null);
      }
    };
    reader.onerror = () => {
      setPageError("Unable to read signature image. Please try another file.");
    };
    reader.readAsDataURL(file);
  };

  const clearSignature = () => {
    setSignatureDataUrl(null);
    setSignatureFileName(null);
    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
  };

  const handleRefreshWorkspace = async () => {
    setPageError(null);
    const statementId =
      (analysis?.statement?.id as string | undefined) ??
      (analysis?.classification?.victimStatementId as string | undefined) ??
      undefined;

    if (!statementId) {
      setAnalysis(null);
      setPageError("No processed statement found to refresh yet.");
      return;
    }

    setRefreshingWorkspace(true);
    try {
      await hydrateAnalysisForStatement(statementId);
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "Could not refresh workspace.");
      setPageError(String(msg));
    } finally {
      setRefreshingWorkspace(false);
    }
  };

  const handleTextSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accusedPersonName.trim()) {
      setAnalysis(null);
      setPageError(
        "Please enter the name of the person against whom the FIR is being lodged.",
      );
      return;
    }
    if (!accusedAddress.trim()) {
      setAnalysis(null);
      setPageError(
        "Please enter the address of the person against whom the FIR is being lodged.",
      );
      return;
    }
    if (!rawText.trim()) {
      setAnalysis(null);
      setPageError("Please enter your statement before analyzing.");
      return;
    }
    setPageError(null);
    setAnalysis(null);
    setSaving(true);
    try {
      const result = await mlPipelineService.runText({
        rawText,
        accusedPersonName,
        accusedAddress,
        assetsDescription,
        language,
        incidentDate,
        incidentTime,
        incidentLocation,
        witnessDetails,
      });
      setAnalysis({
        statement: (result.statement as Record<string, unknown>) ?? null,
        classification:
          (result.classification as Record<string, unknown>) ?? null,
        resolution: (result.resolution as Record<string, unknown>) ?? null,
        rights: (result.rights as Record<string, unknown>) ?? null,
      });

      const statementId =
        (result.statement as Record<string, unknown> | undefined)?.id ??
        (result.classification as Record<string, unknown> | undefined)
          ?.victimStatementId;
      if (typeof statementId === "string" && statementId.length > 0) {
        void hydrateAnalysisForStatement(statementId);
      }

      await reload();
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "Could not save your statement.");
      setPageError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleSendToStation = async () => {
    setPageError(null);
    setSendSuccess(null);

    if (!activeStatementId) {
      setPageError(
        "Please save and analyze your statement first, then send it to a police station.",
      );
      return;
    }

    if (!selectedStationId) {
      setPageError("Please select a registered police station.");
      return;
    }

    setSendingToStation(true);
    try {
      const result = await statementService.submitToStation({
        statementId: activeStatementId,
        stationId: selectedStationId,
      });

      const firRef =
        result.fir.firNumber ?? result.fir.acknowledgmentNo ?? result.fir.id;
      setSendSuccess(
        result.alreadySubmitted
          ? `This statement is already linked to FIR ${firRef}.`
          : `Statement sent successfully to the selected station. FIR reference: ${firRef}.`,
      );
      await reload();
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error
          ? e.message
          : "Could not send statement to police station.");
      setPageError(String(msg));
    } finally {
      setSendingToStation(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100vh",
        background: isDark ? "#0f0f0f" : "#f8fafc",
        color: isDark ? "#fff" : "#0f172a",
        padding: "40px 20px",
        fontFamily: "Inter, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 840, margin: "0 auto" }}
      >
        <motion.div variants={item} style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#FF9933",
              marginBottom: 12,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <ShieldAlert size={18} /> Statement Prep
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              margin: "0 0 12px 0",
              letterSpacing: "-0.03em",
            }}
          >
            Describe what happened
          </h1>
          <p
            style={{
              color: isDark ? "#94a3b8" : "#475569",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 600,
            }}
          >
            Choose to type or speak your complaint. Both methods run through our
            advanced AI pipeline to map BNS classifications instantly.
          </p>
        </motion.div>

        {/* Tab Selector */}
        <motion.div
          variants={item}
          style={{
            display: "flex",
            background: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(15,23,42,0.04)",
            padding: 6,
            borderRadius: 16,
            width: "fit-content",
            marginBottom: 32,
            border: isDark
              ? "1px solid rgba(255,255,255,0.05)"
              : "1px solid rgba(15,23,42,0.1)",
          }}
        >
          {(["text", "voice"] as const).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  position: "relative",
                  padding: "12px 24px",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  background: "transparent",
                  color: isActive ? (isDark ? "#fff" : "#0f172a") : "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "color 0.3s",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(135deg, rgba(255, 153, 51, 0.15), rgba(220, 38, 38, 0.15))",
                      border: "1px solid rgba(255, 153, 51, 0.5)",
                      borderRadius: 12,
                      zIndex: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {t === "text" ? <Type size={16} /> : <Mic size={16} />}
                  {t === "text" ? "Typed Statement" : "Voice Upload"}
                </span>
              </button>
            );
          })}
        </motion.div>

        <motion.div
          variants={item}
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <label
            style={{
              fontSize: 14,
              color: isDark ? "#94a3b8" : "#334155",
              fontWeight: 600,
            }}
          >
            Select Language:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: isDark ? "#1e1e1e" : "#ffffff",
              color: isDark ? "#fff" : "#0f172a",
              border: isDark ? "1px solid #333" : "1px solid #cbd5e1",
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="hi">Hindi / Hinglish</option>
            <option value="en">English</option>
          </select>
        </motion.div>

        <AnimatePresence mode="wait">
          {(error || pageError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.1)",
                padding: 12,
                borderRadius: 10,
                marginBottom: 24,
                fontSize: 14,
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              {pageError ?? error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          key={tab}
          style={{
            background: "linear-gradient(145deg, #0b0f19, #111827)",
            border: "1px solid #1f2937",
            padding: 24,
            borderRadius: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* Common Metadata Fields */}
          <motion.div
            variants={item}
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              marginBottom: 20,
            }}
          >
            <div className="input-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#94a3b8",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <Calendar size={14} /> Date of Incident
              </div>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div className="input-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#94a3b8",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <Clock size={14} /> Time of Incident
              </div>
              <input
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div className="input-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#94a3b8",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <MapPin size={14} /> Location
              </div>
              <input
                type="text"
                value={incidentLocation}
                onChange={(e) => setIncidentLocation(e.target.value)}
                placeholder="Where did it happen?"
                style={inputStyle}
              />
            </div>
            <div className="input-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#94a3b8",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <UserX size={14} /> Name Of Accused Person *
              </div>
              <input
                type="text"
                value={accusedPersonName}
                onChange={(e) => setAccusedPersonName(e.target.value)}
                placeholder="Name of person against whom FIR is lodged"
                style={inputStyle}
                required
              />
            </div>
            <div className="input-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#94a3b8",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <MapPin size={14} /> Address Of Accused Person *
              </div>
              <input
                type="text"
                value={accusedAddress}
                onChange={(e) => setAccusedAddress(e.target.value)}
                placeholder="Address of person against whom FIR is lodged"
                style={inputStyle}
                required
              />
            </div>
          </motion.div>

          <motion.div variants={item} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <Building2 size={14} /> Description Of Assets (If Any)
            </div>
            <textarea
              value={assetsDescription}
              onChange={(e) => setAssetsDescription(e.target.value)}
              rows={2}
              placeholder="Describe stolen/damaged/affected assets, if any"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </motion.div>

          <motion.div variants={item} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <Users size={14} /> Witnesses (Optional)
            </div>
            <textarea
              value={witnessDetails}
              onChange={(e) => setWitnessDetails(e.target.value)}
              rows={2}
              placeholder="Names or details of anyone who saw the incident"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </motion.div>

          {tab === "text" ? (
            <motion.form
              variants={item}
              onSubmit={handleTextSubmit}
              style={{ display: "grid", gap: 24 }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#FF9933",
                    fontSize: 12,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  <Edit3 size={14} /> STATEMENT
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  placeholder="Describe the incident in your own words. Please be as detailed as possible..."
                  style={{
                    ...inputStyle,
                    minHeight: 150,
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                />
              </div>

              <motion.button
                whileHover={
                  textSubmitDisabled
                    ? {}
                    : {
                        scale: 1.02,
                        boxShadow: "0 10px 25px rgba(255, 153, 51, 0.4)",
                      }
                }
                whileTap={textSubmitDisabled ? {} : { scale: 0.98 }}
                animate={
                  saving ? { opacity: [1, 0.7, 1], scale: [1, 0.99, 1] } : {}
                }
                transition={saving ? { repeat: Infinity, duration: 1.5 } : {}}
                type="submit"
                disabled={textSubmitDisabled}
                style={{
                  background: "linear-gradient(135deg, #FF9933, #dc2626)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  padding: "16px 24px",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: textSubmitDisabled ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  opacity: textSubmitDisabled ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Processing with AI Pipeline..."
                  : "Save & Analyze Statement"}
                {!saving && <Send size={18} />}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div variants={item}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#FF9933",
                  fontSize: 12,
                  marginBottom: 12,
                  fontWeight: 700,
                }}
              >
                <Mic size={14} /> VOICE UPLOAD
              </div>
              <div
                style={{
                  background: "#1e1e1e",
                  padding: 24,
                  borderRadius: 16,
                  border: "1px dashed #333",
                }}
              >
                <StatementVoiceTab
                  language={language}
                  accusedPersonName={accusedPersonName}
                  accusedAddress={accusedAddress}
                  assetsDescription={assetsDescription}
                  incidentDate={incidentDate}
                  incidentTime={incidentTime}
                  incidentLocation={incidentLocation}
                  witnessDetails={witnessDetails}
                  disabled={saving || isLoading || analysisLoading}
                  onComplete={handleVoiceComplete}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          variants={item}
          ref={workspaceRef}
          whileHover={{ y: -2, boxShadow: "0 18px 32px rgba(0,0,0,0.35)" }}
          style={{
            marginTop: 24,
            background: "linear-gradient(145deg, #0b0f19, #111827)",
            border: "1px solid rgba(255,153,51,0.28)",
            borderRadius: 20,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: "#FF9933",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Unified Statement Workspace
              </div>
              <h3
                style={{ margin: "8px 0 6px", fontSize: 20, fontWeight: 800 }}
              >
                Analyze + Download Legal Report PDF
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                The PDF uses your saved statement text, your profile details,
                and live BNS/IPC mapping from the current AI classification.
              </p>
              <div
                style={{
                  marginTop: 8,
                  color:
                    saving || analysisLoading
                      ? "#fbbf24"
                      : analysis
                        ? "#86efac"
                        : "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {saving || analysisLoading
                  ? "Updating workspace with latest analysis..."
                  : analysis
                    ? "Workspace is up to date"
                    : "No analysis yet"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureFileChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => signatureInputRef.current?.click()}
                disabled={pdfLoading || saving || isLoading || analysisLoading}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor:
                    pdfLoading || saving || isLoading || analysisLoading
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    pdfLoading || saving || isLoading || analysisLoading
                      ? 0.6
                      : 1,
                }}
              >
                Upload Signature Photo
              </button>

              {signatureDataUrl && (
                <button
                  type="button"
                  onClick={clearSignature}
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    color: "#fecaca",
                    border: "1px solid rgba(239,68,68,0.35)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Remove Signature
                </button>
              )}

              {signatureFileName && (
                <div
                  style={{
                    color: "#86efac",
                    fontSize: 12,
                    fontWeight: 700,
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    alignSelf: "center",
                  }}
                  title={signatureFileName}
                >
                  Signature: {signatureFileName}
                </div>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={
                  pdfLoading ||
                  saving ||
                  isLoading ||
                  analysisLoading ||
                  refreshingWorkspace
                }
                style={{
                  background: "linear-gradient(135deg, #f97316, #dc2626)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 800,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor:
                    pdfLoading || saving || isLoading || analysisLoading
                      ? "not-allowed"
                      : "pointer",
                  opacity: pdfLoading ? 0.7 : 1,
                }}
              >
                <Download size={16} />
                {pdfLoading ? "Preparing PDF..." : "Download Statement PDF"}
              </button>

              <button
                type="button"
                onClick={() => void handleRefreshWorkspace()}
                disabled={
                  saving ||
                  isLoading ||
                  analysisLoading ||
                  refreshingWorkspace ||
                  !analysis
                }
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 700,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor:
                    saving ||
                    isLoading ||
                    analysisLoading ||
                    refreshingWorkspace ||
                    !analysis
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving ||
                    isLoading ||
                    analysisLoading ||
                    refreshingWorkspace ||
                    !analysis
                      ? 0.6
                      : 1,
                }}
              >
                <RefreshCw
                  size={16}
                  className={refreshingWorkspace ? "animate-spin" : undefined}
                />
                {refreshingWorkspace ? "Refreshing..." : "Refresh Section"}
              </button>

              {Boolean(analysis?.statement?.id as string | undefined) && (
                <button
                  type="button"
                  onClick={() =>
                    goClassify(String(analysis?.statement?.id ?? ""))
                  }
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#e2e8f0",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <FileSearch size={16} />
                  Open Detailed Mapping
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div style={previewTileStyle}>
              <div style={previewLabelStyle}>Primary BNS</div>
              <div style={previewValueStyle}>
                {String(
                  (
                    analysis?.classification?.bnsSection as
                      | Record<string, unknown>
                      | undefined
                  )?.sectionNumber ?? "Pending",
                )}
              </div>
            </div>
            <div style={previewTileStyle}>
              <div style={previewLabelStyle}>IPC Equivalent</div>
              <div style={previewValueStyle}>
                {String(
                  (
                    analysis?.classification?.bnsSection as
                      | Record<string, unknown>
                      | undefined
                  )?.ipcEquivalent ?? "Pending",
                )}
              </div>
            </div>
            <div style={previewTileStyle}>
              <div style={previewLabelStyle}>Statement ID</div>
              <div style={previewValueStyle}>
                {String(
                  (analysis?.statement?.id as string | undefined) ?? "Pending",
                )}
              </div>
            </div>
            <div style={previewTileStyle}>
              <div style={previewLabelStyle}>Complainant</div>
              <div style={previewValueStyle}>{user?.name ?? "Victim User"}</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          whileHover={{ y: -2 }}
          style={{
            marginTop: 20,
            background: "linear-gradient(145deg, #0b0f19, #111827)",
            border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#93c5fd",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <Building2 size={14} /> Station Dispatch
              </div>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: 14 }}>
                Choose a registered police station and dispatch this statement
                for officer review and FIR registration.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "flex-end",
                width: "100%",
                maxWidth: 820,
              }}
            >
              <div
                ref={stationPickerRef}
                style={{
                  minWidth: 320,
                  flex: "1 1 420px",
                  display: "grid",
                  gap: 8,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(59,130,246,0.28)",
                    borderRadius: 10,
                    padding: "9px 10px",
                  }}
                >
                  <Search size={14} color="#93c5fd" />
                  <input
                    value={stationQuery}
                    onChange={(e) => setStationQuery(e.target.value)}
                    placeholder="Filter by station name, district, or code"
                    disabled={
                      stationsLoading ||
                      sendingToStation ||
                      stations.length === 0
                    }
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#fff",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div
                  style={{
                    position: "relative",
                    background:
                      "linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))",
                    border: "1px solid rgba(147,197,253,0.35)",
                    borderRadius: 12,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setStationPickerOpen((open) => !open)}
                    disabled={
                      stationsLoading ||
                      sendingToStation ||
                      stationOptions.length === 0
                    }
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "12px 38px 12px 12px",
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {selectedStation
                      ? formatStationLine(selectedStation)
                      : "Select a registered police station"}
                  </button>
                  <ChevronDown
                    size={16}
                    color="#93c5fd"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: stationPickerOpen
                        ? "translateY(-50%) rotate(180deg)"
                        : "translateY(-50%)",
                      pointerEvents: "none",
                      transition: "transform 0.2s ease",
                    }}
                  />

                  {stationPickerOpen && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "calc(100% + 8px)",
                        borderRadius: 12,
                        background: "#0b1220",
                        border: "1px solid rgba(147,197,253,0.35)",
                        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
                        zIndex: 25,
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {stationOptions.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 12px",
                            color: "#93c5fd",
                            fontSize: 13,
                          }}
                        >
                          No station matches your filter.
                        </div>
                      ) : (
                        stationOptions.map((station) => {
                          const active = station.id === selectedStationId;
                          return (
                            <button
                              key={station.id}
                              type="button"
                              onClick={() => {
                                setSelectedStationId(station.id);
                                setStationPickerOpen(false);
                              }}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                border: "none",
                                cursor: "pointer",
                                background: active
                                  ? "rgba(59,130,246,0.28)"
                                  : "transparent",
                                color: active ? "#fff" : "#dbeafe",
                                padding: "10px 12px",
                                borderBottom:
                                  "1px solid rgba(148,163,184,0.14)",
                                fontWeight: active ? 700 : 500,
                                fontSize: 13,
                              }}
                            >
                              {formatStationLine(station)}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#93c5fd",
                    fontSize: 12,
                  }}
                >
                  {selectedStation
                    ? `Selected station: ${selectedStation.name}${selectedStation.stationCode ? ` (${selectedStation.stationCode})` : ""}`
                    : "Select a station to continue."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleSendToStation()}
                disabled={
                  sendingToStation ||
                  stationsLoading ||
                  !selectedStationId ||
                  !activeStatementId
                }
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  height: 46,
                  whiteSpace: "nowrap",
                  alignSelf: "flex-end",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor:
                    sendingToStation ||
                    stationsLoading ||
                    !selectedStationId ||
                    !activeStatementId
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    sendingToStation ||
                    stationsLoading ||
                    !selectedStationId ||
                    !activeStatementId
                      ? 0.7
                      : 1,
                }}
              >
                {sendingToStation ? "Sending..." : "Send Statement"}
              </button>
            </div>
          </div>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              color: activeStatementId ? "#86efac" : "#fbbf24",
              fontWeight: 700,
            }}
          >
            {activeStatementId
              ? `Ready to dispatch statement ID ${activeStatementId}.`
              : "No analyzed statement available yet. Save and analyze first."}
          </p>
          {sendSuccess && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#93c5fd" }}>
              {sendSuccess}
            </p>
          )}
        </motion.div>

        <AnimatePresence>
          {latestStatement && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                marginTop: 32,
                background: "rgba(255, 153, 51, 0.05)",
                border: "1px solid rgba(255, 153, 51, 0.2)",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: 18,
                  color: "#FF9933",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={20} /> Previously Saved Statement
              </h2>
              <p
                style={{
                  color: "#cbd5e1",
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {latestStatement.rawText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

const inputStyle = {
  width: "100%",
  background: "#1a1a1a",
  color: "#fff",
  borderRadius: 12,
  padding: "14px 16px",
  border: "1px solid #333",
  outline: "none",
  fontSize: 14,
  transition: "border-color 0.3s, box-shadow 0.3s",
  fontFamily: "inherit",
};

const previewTileStyle = {
  background: "rgba(15,23,42,0.65)",
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: 12,
  padding: "12px 14px",
};

const previewLabelStyle = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  marginBottom: 4,
};

const previewValueStyle = {
  color: "#f8fafc",
  fontSize: 14,
  fontWeight: 700,
  wordBreak: "break-word" as const,
};

export default VictimStatementPage;
