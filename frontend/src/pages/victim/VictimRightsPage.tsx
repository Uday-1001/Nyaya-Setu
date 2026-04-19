import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scale, CheckCircle, ShieldAlert, FileText, Info } from "lucide-react";
import { bnsService } from "../../services/bnsService";
import { readVictimTheme } from "../../features/victim/theme/victimTheme";

type RightsItem = {
  title: string;
  basis: string;
  detail: string;
};

type RightsPayload = {
  section: {
    number: string;
    title: string;
    victimsRightsNote?: string;
    compensationNote?: string;
  };
  rights: RightsItem[];
  preFirChecklist: string[];
  zeroFirGuidance: string;
};

const FALLBACK_RIGHTS_DATA: RightsPayload = {
  section: {
    number: "173",
    title: "Victim Support and Information Rights",
    victimsRightsNote:
      "You have the right to receive a copy of your FIR and timely updates about your case.",
    compensationNote:
      "If you are eligible, you can request compensation through the Victim Compensation Scheme with help from the police station or legal services authority.",
  },
  rights: [
    {
      title: "Free FIR Copy",
      basis: "BNSS",
      detail:
        "You can ask for and receive a free copy of your FIR after it is registered.",
    },
    {
      title: "Case Update Access",
      basis: "Victim Rights",
      detail:
        "You can request progress updates so you know what actions have been taken.",
    },
    {
      title: "Compensation Support",
      basis: "State Scheme",
      detail:
        "You can seek compensation support if the case qualifies under victim support rules.",
    },
  ],
  preFirChecklist: [
    "Write the main incident details: what happened, when, and where.",
    "Keep any evidence ready (photos, messages, recordings, documents).",
    "List witness names and contact details if available.",
    "Carry a valid ID document while visiting the police station.",
  ],
  zeroFirGuidance:
    "You can file a Zero FIR at any police station, even if the incident happened in another area. The station will register it and transfer it to the correct jurisdiction.",
};

/* ── Animation Variants ── */
const containerBase = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const slideUpItem = {
  hidden: { opacity: 0, y: 30, filter: "blur(5px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 120, damping: 20 },
  },
};

export const VictimRightsPage = () => {
  const [isDark] = useState(() => readVictimTheme());
  const [data, setData] = useState<RightsPayload>(FALLBACK_RIGHTS_DATA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.background = isDark ? "#0f0f0f" : "#f8fafc";
    return () => {
      document.body.style.background = "";
    };
  }, [isDark]);

  useEffect(() => {
    void bnsService
      .getRights()
      .then((response) => {
        if (!response || typeof response !== "object") return;
        setData((prev) => ({
          section: {
            ...prev.section,
            ...((response as Partial<RightsPayload>).section ?? {}),
          },
          rights: (response as Partial<RightsPayload>).rights?.length
            ? (response as Partial<RightsPayload>).rights!
            : prev.rights,
          preFirChecklist: (response as Partial<RightsPayload>).preFirChecklist
            ?.length
            ? (response as Partial<RightsPayload>).preFirChecklist!
            : prev.preFirChecklist,
          zeroFirGuidance:
            (response as Partial<RightsPayload>).zeroFirGuidance ??
            prev.zeroFirGuidance,
        }));
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load latest rights information. Showing quick reference.",
        ),
      );
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark ? "#0f0f0f" : "#f8fafc",
        color: isDark ? "#fff" : "#0f172a",
        padding: "40px 20px",
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <motion.div
        variants={containerBase}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 1000, margin: "0 auto" }}
      >
        {/* Header */}
        <motion.div
          variants={slideUpItem}
          style={{ marginBottom: 40, textAlign: "center" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: isDark
                ? "rgba(139, 92, 246, 0.1)"
                : "rgba(139, 92, 246, 0.14)",
              color: "#8b5cf6",
              padding: "8px 16px",
              borderRadius: 20,
              marginBottom: 16,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <Scale size={18} /> Know Your Rights
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 900,
              margin: "0 0 16px 0",
              letterSpacing: "-0.04em",
            }}
          >
            BNSS Rights & Next Steps
          </h1>
          <p
            style={{
              color: isDark ? "#94a3b8" : "#475569",
              fontSize: 16,
              maxWidth: 600,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            The Bharatiya Nagarik Suraksha Sanhita (BNSS) guarantees specific
            rights and compensation mechanisms. Understand your position before
            finalizing your FIR.
          </p>
        </motion.div>

        {error && (
          <motion.div
            variants={slideUpItem}
            style={{
              background: isDark
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            {error}
          </motion.div>
        )}

        <motion.div
          variants={slideUpItem}
          whileHover={{ y: -2, boxShadow: "0 20px 36px rgba(0,0,0,0.45)" }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          style={{
            background: "linear-gradient(145deg, #0b0f19, #111827)",
            border: isDark
              ? "1px solid rgba(255, 153, 51, 0.2)"
              : "1px solid rgba(255, 153, 51, 0.28)",
            borderRadius: 24,
            padding: 32,
            marginBottom: 40,
            boxShadow: "0 18px 32px rgba(0,0,0,0.38)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <ShieldAlert size={28} color="#FF9933" />
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                margin: 0,
                color: "#fff",
              }}
            >
              BNS {data.section.number}: {data.section.title}
            </h2>
          </div>
          <p
            style={{
              color: "#cbd5e1",
              fontSize: 16,
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {data.section.victimsRightsNote}
          </p>
          <div
            style={{
              background: "rgba(250, 204, 21, 0.1)",
              borderLeft: "4px solid #facc15",
              padding: "16px 20px",
              borderRadius: "0 12px 12px 0",
            }}
          >
            <p
              style={{
                color: "#facc15",
                margin: 0,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <strong>Compensation Note:</strong>{" "}
              {data.section.compensationNote}
            </p>
          </div>
        </motion.div>

        {/* Rights Grid */}
        <motion.div
          variants={containerBase}
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginBottom: 40,
          }}
        >
          {(data.rights ?? []).map((right: RightsItem, idx: number) => (
            <motion.div
              key={idx}
              variants={slideUpItem}
              whileHover={{
                y: -5,
                scale: 1.02,
                boxShadow: "0 15px 30px rgba(0,0,0,0.5)",
                borderColor: "#FF9933",
              }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 20,
              }}
              style={{
                background: "#171717",
                border: "1px solid #262626",
                borderRadius: 20,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                cursor: "default",
              }}
            >
              <div
                style={{
                  background: "rgba(255, 153, 51, 0.1)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Info size={22} color="#FF9933" />
              </div>
              <h3
                style={{
                  margin: "0 0 8px 0",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {right.title}
              </h3>
              <p
                style={{
                  color: "#FF9933",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  margin: "0 0 12px 0",
                  textTransform: "uppercase",
                }}
              >
                BASIS: {right.basis}
              </p>
              <p
                style={{
                  color: "#94a3b8",
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {right.detail}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Pre-FIR Checklist & Zero FIR */}
        <motion.div
          variants={slideUpItem}
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 24,
              padding: 32,
            }}
          >
            <h3
              style={{
                margin: "0 0 24px 0",
                fontSize: 20,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <FileText color="#3b82f6" /> Pre-FIR Checklist
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                color: "#93c5fd",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Keep these details ready before filing to make registration faster
              and smoother.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(data.preFirChecklist ?? []).map((item: string, idx: number) => (
                <motion.div
                  key={idx}
                  whileHover={{ x: 5 }}
                  style={{ display: "flex", gap: 12, alignItems: "center" }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: "rgba(16, 185, 129, 0.14)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      color: "#34d399",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.5 }}
                  >
                    {item}
                  </span>
                </motion.div>
              ))}
              {!data.preFirChecklist?.length && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    color: "#9ca3af",
                  }}
                >
                  <CheckCircle
                    size={20}
                    color="#64748b"
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14 }}>
                    Checklist information is currently unavailable.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(145deg, #1e1b4b, #312e81)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: 24,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "rgba(99, 102, 241, 0.2)",
                width: 48,
                height: 48,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Scale size={24} color="#818cf8" />
            </div>
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: 22,
                fontWeight: 800,
                color: "#e0e7ff",
              }}
            >
              Zero FIR & Jurisdiction
            </h3>
            <p
              style={{
                color: "#a5b4fc",
                fontSize: 15,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {data.zeroFirGuidance}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VictimRightsPage;
