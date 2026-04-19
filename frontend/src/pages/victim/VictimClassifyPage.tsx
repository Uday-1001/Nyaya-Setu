import { useEffect, type CSSProperties } from "react";
import { useLocation, Link } from "react-router-dom";
import { useClassification } from "../../features/victim/classification/useClassification";

type AlternativeSection = {
  sectionNumber?: string;
  title?: string;
  confidence?: number;
};

const pct = (value?: number) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "N/A";

export const VictimClassifyPage = () => {
  const location = useLocation();
  const statementId = (location.state as { statementId?: string } | null)
    ?.statementId;
  const { classification, resolution, rights, isLoading, error, classify } =
    useClassification();

  useEffect(() => {
    void classify(statementId);
  }, [classify, statementId]);

  return (
    <div style={pageStyle}>
      <div style={pageGlowTop} />
      <div style={pageGlowBottom} />

      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        <header style={heroCardStyle}>
          <p style={heroTagStyle}>Crime Classifier</p>
          <h1 style={heroTitleStyle}>Likely BNS Mapping and Victim Guidance</h1>
          <p style={heroSubtitleStyle}>
            Structured analysis of your submitted statement with mapped legal
            sections, expected resolution, and immediate rights.
          </p>
        </header>

        {isLoading && (
          <section style={statusCardStyle}>Analyzing your statement...</section>
        )}
        {error && (
          <section
            style={{
              ...statusCardStyle,
              border: "1px solid rgba(248,113,113,0.5)",
              color: "#fecaca",
            }}
          >
            {error}
          </section>
        )}

        {classification && (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <div style={headingRowStyle}>
                <h2 style={sectionHeadingStyle}>Primary Mapping</h2>
                <div style={badgeRowStyle}>
                  <span style={badgeStyle}>
                    Confidence: {pct(classification.confidenceScore)}
                  </span>
                  <span style={badgeStyle}>
                    Urgency: {String(classification.urgencyLevel ?? "N/A")}
                  </span>
                </div>
              </div>

              <div style={primaryTitleStyle}>
                BNS {classification.bnsSection.sectionNumber} -{" "}
                {classification.bnsSection.sectionTitle}
              </div>

              <div style={descriptionCardStyle}>
                <p style={descriptionTextStyle}>
                  {classification.bnsSection.description}
                </p>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={miniLabelStyle}>Urgency Reason</div>
                <p
                  style={{
                    color: "#bfdbfe",
                    margin: "6px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  {classification.urgencyReason ||
                    "No urgency reason was provided."}
                </p>
              </div>
            </section>

            <div style={twoColGridStyle}>
              <section style={cardStyle}>
                <h3 style={sectionHeadingStyle}>Other Possible Sections</h3>
                {Array.isArray(classification.alternativeSections) &&
                classification.alternativeSections.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {classification.alternativeSections.map(
                      (alt: AlternativeSection, idx: number) => (
                        <div
                          key={`${alt.sectionNumber ?? idx}`}
                          style={altItemStyle}
                        >
                          <div style={{ color: "#f8fafc", fontWeight: 700 }}>
                            {alt.sectionNumber ?? "Unknown"}
                            {alt.title ? ` - ${alt.title}` : ""}
                          </div>
                          <div style={{ color: "#93c5fd", fontSize: 13 }}>
                            Confidence: {pct(alt.confidence)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p style={mutedTextStyle}>
                    No alternative sections were returned.
                  </p>
                )}
              </section>

              {resolution && (
                <section style={cardStyle}>
                  <h3 style={sectionHeadingStyle}>Expected Resolution</h3>
                  <div style={resolutionTitleStyle}>
                    Based on your statement: BNS {resolution.sectionNumber} -{" "}
                    {resolution.sectionTitle}
                  </div>

                  <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    <div style={infoRowStyle}>
                      <span style={infoLabelStyle}>Punishment Range</span>
                      <span style={infoValueStyle}>
                        {resolution.punishmentRange}
                      </span>
                    </div>
                    <div style={infoRowStyle}>
                      <span style={infoLabelStyle}>Fine Range</span>
                      <span style={infoValueStyle}>{resolution.fineRange}</span>
                    </div>
                  </div>

                  <div style={compNoteStyle}>{resolution.compensationNote}</div>

                  {Array.isArray(resolution.expectedNextSteps) &&
                    resolution.expectedNextSteps.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={miniLabelStyle}>Suggested Next Steps</div>
                        <ul style={listStyle}>
                          {resolution.expectedNextSteps.map((item: string) => (
                            <li key={item} style={{ marginBottom: 8 }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </section>
              )}
            </div>

            {rights && (
              <section style={cardStyle}>
                <div style={headingRowStyle}>
                  <h3 style={sectionHeadingStyle}>Immediate Victim Rights</h3>
                  <Link to="/victim/station" style={actionLinkStyle}>
                    Find nearest police station
                  </Link>
                </div>

                <div style={rightsGridStyle}>
                  {(rights.rights ?? []).map((right: any) => (
                    <article key={right.title} style={rightCardStyle}>
                      <div
                        style={{
                          color: "#f8fafc",
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        {right.title}
                      </div>
                      <p
                        style={{
                          color: "#cbd5e1",
                          margin: 0,
                          lineHeight: 1.55,
                        }}
                      >
                        {right.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#06080d",
  color: "#fff",
  padding: "30px 20px 44px",
  position: "relative",
  overflow: "hidden",
};

const pageGlowTop: CSSProperties = {
  position: "absolute",
  top: "-120px",
  left: "-80px",
  width: 320,
  height: 320,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(249,115,22,0.28), rgba(249,115,22,0))",
  pointerEvents: "none",
};

const pageGlowBottom: CSSProperties = {
  position: "absolute",
  bottom: "-140px",
  right: "-120px",
  width: 380,
  height: 380,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(59,130,246,0.22), rgba(59,130,246,0))",
  pointerEvents: "none",
};

const heroCardStyle: CSSProperties = {
  background:
    "linear-gradient(165deg, rgba(15,23,42,0.95), rgba(13,18,30,0.92))",
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: 18,
  padding: "24px 22px",
  marginBottom: 16,
};

const heroTagStyle: CSSProperties = {
  color: "#fb923c",
  fontSize: 12,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  margin: 0,
  fontWeight: 800,
};

const heroTitleStyle: CSSProperties = {
  margin: "10px 0 10px",
  fontSize: "clamp(1.7rem, 3vw, 2.3rem)",
  lineHeight: 1.15,
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  maxWidth: 760,
  lineHeight: 1.65,
  fontSize: 15,
};

const statusCardStyle: CSSProperties = {
  background: "rgba(15,23,42,0.85)",
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.25)",
  padding: "14px 16px",
  marginBottom: 16,
  color: "#cbd5e1",
};

const cardStyle: CSSProperties = {
  background: "linear-gradient(160deg, rgba(15,23,42,0.9), rgba(8,12,22,0.86))",
  borderRadius: 16,
  padding: 18,
  border: "1px solid rgba(148,163,184,0.2)",
};

const headingRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const sectionHeadingStyle: CSSProperties = {
  margin: 0,
  fontSize: 19,
  color: "#f8fafc",
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(251,146,60,0.4)",
  background: "rgba(251,146,60,0.12)",
  color: "#fed7aa",
  fontSize: 12,
  fontWeight: 700,
};

const primaryTitleStyle: CSSProperties = {
  marginTop: 12,
  marginBottom: 12,
  fontSize: 22,
  fontWeight: 800,
  color: "#f8fafc",
  lineHeight: 1.3,
};

const descriptionCardStyle: CSSProperties = {
  background: "rgba(2,6,23,0.45)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  padding: "12px 14px",
  maxHeight: 240,
  overflowY: "auto",
};

const descriptionTextStyle: CSSProperties = {
  margin: 0,
  color: "#dbeafe",
  lineHeight: 1.65,
};

const miniLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 700,
};

const twoColGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
};

const altItemStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: 12,
  padding: "12px 12px",
  background: "rgba(2,6,23,0.4)",
};

const mutedTextStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#94a3b8",
};

const resolutionTitleStyle: CSSProperties = {
  marginTop: 10,
  color: "#bfdbfe",
  fontWeight: 700,
  lineHeight: 1.5,
};

const infoRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px 1fr",
  gap: 10,
  padding: "8px 10px",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 10,
  background: "rgba(2,6,23,0.35)",
};

const infoLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontWeight: 700,
  fontSize: 13,
};

const infoValueStyle: CSSProperties = {
  color: "#e2e8f0",
  fontSize: 13,
  lineHeight: 1.45,
};

const compNoteStyle: CSSProperties = {
  marginTop: 12,
  border: "1px solid rgba(251,191,36,0.35)",
  borderRadius: 10,
  background: "rgba(251,191,36,0.08)",
  padding: "10px 12px",
  color: "#fde68a",
  lineHeight: 1.5,
};

const listStyle: CSSProperties = {
  color: "#e2e8f0",
  paddingLeft: 18,
  margin: "8px 0 0",
  lineHeight: 1.5,
};

const rightsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const rightCardStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: 12,
  background: "rgba(2,6,23,0.45)",
  padding: "12px 12px",
};

const actionLinkStyle: CSSProperties = {
  color: "#93c5fd",
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid rgba(147,197,253,0.3)",
  borderRadius: 10,
  padding: "7px 10px",
  background: "rgba(59,130,246,0.1)",
};

export default VictimClassifyPage;
