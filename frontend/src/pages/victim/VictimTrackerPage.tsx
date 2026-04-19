import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Search,
  FileText,
  CheckCircle,
  Clock,
  MapPin,
  FileClock,
} from "lucide-react";
import { useTracker } from "../../features/victim/tracker/useTracker";
import { readVictimTheme } from "../../features/victim/theme/victimTheme";

/* ── Animation Variants ── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 20 },
  },
};

export const VictimTrackerPage = () => {
  const [isDark] = useState(() => readVictimTheme());
  const { cases, trackedCase, error, isLoading, trackCase } = useTracker();
  const [acknowledgmentNo, setAcknowledgmentNo] = useState("");

  useEffect(() => {
    document.body.style.background = isDark ? "#0f0f0f" : "#f8fafc";
    return () => {
      document.body.style.background = "";
    };
  }, [isDark]);

  const handleTrack = async (event: FormEvent) => {
    event.preventDefault();
    if (acknowledgmentNo.trim()) {
      await trackCase(acknowledgmentNo.trim());
    }
  };

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
        variants={container}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 980, margin: "0 auto" }}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          style={{ marginBottom: 40, textAlign: "center" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: isDark
                ? "rgba(249, 115, 22, 0.1)"
                : "rgba(249, 115, 22, 0.14)",
              color: "#f97316",
              padding: "8px 16px",
              borderRadius: 20,
              marginBottom: 16,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <Target size={18} /> Case Tracker
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 900,
              margin: "0 0 16px 0",
              letterSpacing: "-0.04em",
            }}
          >
            Track Your FIR Status
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
            Enter your Acknowledgment Number below to see real-time updates and
            actions taken by the assigned investigating officer.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          variants={itemVariants}
          style={{ maxWidth: 600, margin: "0 auto 40px" }}
        >
          <form
            onSubmit={handleTrack}
            style={{ display: "flex", gap: 12, position: "relative" }}
          >
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                color: "#64748b",
              }}
            >
              <Search size={22} />
            </div>
            <input
              value={acknowledgmentNo}
              onChange={(e) => setAcknowledgmentNo(e.target.value)}
              placeholder="Enter acknowledgment or FIR number..."
              style={{
                flex: 1,
                background: isDark ? "#171717" : "#ffffff",
                color: isDark ? "#fff" : "#0f172a",
                border: isDark ? "1px solid #262626" : "1px solid #cbd5e1",
                borderRadius: 16,
                padding: "16px 16px 16px 52px",
                fontSize: 16,
                outline: "none",
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#f97316")}
              onBlur={(e) =>
                (e.target.style.borderColor = isDark ? "#262626" : "#cbd5e1")
              }
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              style={{
                background: "linear-gradient(135deg, #FF9933, #ea580c)",
                color: "#fff",
                border: "none",
                borderRadius: 16,
                padding: "0 24px",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Track{" "}
              {isLoading && (
                <div
                  className="spinner"
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid #fff",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
            </motion.button>
          </form>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  color: "#ef4444",
                  marginTop: 16,
                  background: isDark
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(239,68,68,0.12)",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tracked Case Details & Timeline */}
        <AnimatePresence mode="wait">
          {trackedCase && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -2, boxShadow: "0 20px 34px rgba(0,0,0,0.42)" }}
              style={{
                background: "linear-gradient(145deg, #0b0f19, #111827)",
                border: "1px solid #1f2937",
                borderRadius: 24,
                padding: 32,
                marginBottom: 40,
                display: "grid",
                gap: 32,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              {/* Left Col: Details */}
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    padding: "6px 12px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  <CheckCircle size={16} /> {trackedCase.status}
                </div>
                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    margin: "0 0 8px 0",
                    color: "#fff",
                  }}
                >
                  {trackedCase.acknowledgmentNo}
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#cbd5e1",
                    fontSize: 15,
                    marginBottom: 24,
                  }}
                >
                  <MapPin size={18} />{" "}
                  {trackedCase.station?.name || "Pending Station Assignment"}
                </div>

                <h3
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 12,
                    fontWeight: 800,
                  }}
                >
                  Incident Location
                </h3>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: 16,
                    margin: 0,
                    background: "#1e293b",
                    padding: 16,
                    borderRadius: 16,
                  }}
                >
                  {trackedCase.incidentLocation || "Not specified"}
                </p>
              </div>

              {/* Right Col: Vertical Timeline */}
              <div
                style={{
                  background: "#0b0f19",
                  borderRadius: 20,
                  padding: 24,
                  border: "1px solid #1e293b",
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    margin: "0 0 24px 0",
                  }}
                >
                  <FileClock size={20} color="#FF9933" /> Activity Timeline
                </h3>
                <div style={{ position: "relative", paddingLeft: 16 }}>
                  {/* Vertical Line */}
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      bottom: 8,
                      left: 23,
                      width: 2,
                      background: isDark ? "#1e293b" : "#cbd5e1",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 24,
                    }}
                  >
                    {(trackedCase.caseUpdates ?? []).map(
                      (update: any, idx: number) => {
                        const isLast =
                          idx === (trackedCase.caseUpdates ?? []).length - 1;
                        return (
                          <div
                            key={update.id}
                            style={{ position: "relative", paddingLeft: 32 }}
                          >
                            {/* Dot */}
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 4,
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: isLast ? "#FF9933" : "#334155",
                                border: "3px solid #0b0f19",
                                zIndex: 1,
                              }}
                            />
                            <h4
                              style={{
                                margin: "0 0 4px 0",
                                fontSize: 15,
                                fontWeight: 700,
                                color: isLast ? "#fff" : "#cbd5e1",
                              }}
                            >
                              {update.status}
                            </h4>
                            {update.note && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 14,
                                  color: "#cbd5e1",
                                  lineHeight: 1.5,
                                }}
                              >
                                {update.note}
                              </p>
                            )}
                          </div>
                        );
                      },
                    )}
                    {!trackedCase.caseUpdates?.length && (
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 14,
                          fontStyle: "italic",
                          paddingLeft: 16,
                        }}
                      >
                        No updates posted yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Drafts/Cases Grid */}
        <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              borderBottom: isDark ? "1px solid #262626" : "1px solid #dbeafe",
              paddingBottom: 16,
              margin: "0 0 24px",
            }}
          >
            Your Local History
          </h3>
          {cases.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                background: "#111",
                borderRadius: 20,
                border: "1px dashed #333",
              }}
            >
              <FileText size={48} color="#333" style={{ marginBottom: 16 }} />
              <p style={{ color: "#64748b", margin: 0 }}>
                You don't have any saved cases or drafts yet.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              }}
            >
              {cases.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setAcknowledgmentNo(item.acknowledgmentNo ?? "")
                  }
                  style={{
                    background: "#171717",
                    border: "1px solid #262626",
                    borderRadius: 20,
                    padding: 20,
                    textAlign: "left",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      {item.firNumber ?? item.acknowledgmentNo ?? "Draft FIR"}
                    </h3>
                    {item.status.toLowerCase().includes("pending") ? (
                      <Clock size={18} color="#f59e0b" />
                    ) : (
                      <CheckCircle size={18} color="#10b981" />
                    )}
                  </div>
                  <p
                    style={{
                      color: "#f97316",
                      fontSize: 13,
                      fontWeight: 700,
                      margin: "0 0 8px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.status.toUpperCase()}
                  </p>
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: 14,
                      margin: "0 0 16px",
                    }}
                  >
                    <MapPin
                      size={14}
                      style={{
                        display: "inline",
                        verticalAlign: "text-bottom",
                      }}
                    />{" "}
                    {item.station?.name || "Unassigned"}
                  </p>
                  <div
                    style={{
                      background: "#0f0f0f",
                      padding: "10px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#cbd5e1",
                    }}
                  >
                    {item.incidentLocation || "No location saved"}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VictimTrackerPage;
