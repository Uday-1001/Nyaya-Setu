import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  Languages,
  ChevronDown,
  ShieldCheck,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Scale,
  ArrowRight,
  BadgeInfo,
} from "lucide-react";
import { authService } from "../../services/authService";
import { firService } from "../../services/firService";
import { statementService } from "../../services/statementService";
import { useAuthStore } from "../../store/authStore";
import type { User as AppUser } from "../../types/user.types";

type ProfileForm = {
  name: string;
  phone: string;
  email: string;
  gender: string;
  language: string;
  aadhaarLast4: string;
};

type ProfileStats = {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  latestStatementDate: string;
};

type FieldErrors = {
  name?: string;
  phone?: string;
  aadhaarLast4?: string;
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "gu", label: "Gujarati" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const toForm = (user: AppUser | null): ProfileForm => ({
  name: user?.name ?? "",
  phone: user?.phone ?? "",
  email: user?.email ?? "",
  gender: user?.gender ?? "prefer_not_to_say",
  language: user?.language ?? "en",
  aadhaarLast4: user?.aadhaarLast4 ?? "",
});

const statusStyles = {
  success: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.35)",
    color: "#86efac",
  },
  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fca5a5",
  },
} as const;

export const VictimProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [form, setForm] = useState<ProfileForm>(() => toForm(user));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    totalCases: 0,
    activeCases: 0,
    closedCases: 0,
    latestStatementDate: "No statement yet",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setForm(toForm(user));
  }, [user]);

  const hasChanges = useMemo(() => {
    const original = toForm(user);
    return (
      form.name !== original.name ||
      form.phone !== original.phone ||
      form.gender !== original.gender ||
      form.language !== original.language ||
      form.aadhaarLast4 !== original.aadhaarLast4
    );
  }, [form, user]);

  const validate = () => {
    if (form.name.trim().length < 2) {
      return "Name must be at least 2 characters.";
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      return "Phone must be a valid 10-digit Indian mobile number.";
    }

    if (form.aadhaarLast4 && !/^\d{4}$/.test(form.aadhaarLast4.trim())) {
      return "Aadhaar field should contain exactly 4 digits.";
    }

    return null;
  };

  const fieldErrors = useMemo<FieldErrors>(() => {
    const errors: FieldErrors = {};

    if (form.name.trim().length > 0 && form.name.trim().length < 2) {
      errors.name = "Use at least 2 characters.";
    }

    if (
      form.phone.trim().length > 0 &&
      !/^[6-9]\d{9}$/.test(form.phone.trim())
    ) {
      errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }

    if (
      form.aadhaarLast4.trim().length > 0 &&
      !/^\d{4}$/.test(form.aadhaarLast4.trim())
    ) {
      errors.aadhaarLast4 = "Aadhaar input must be exactly 4 digits.";
    }

    return errors;
  }, [form.name, form.phone, form.aadhaarLast4]);

  const completion = useMemo(() => {
    let score = 0;
    if (form.name.trim().length >= 2) score += 1;
    if (/^[6-9]\d{9}$/.test(form.phone.trim())) score += 1;
    if (form.gender) score += 1;
    if (form.language) score += 1;
    if (form.aadhaarLast4.trim().length === 4) score += 1;
    return Math.round((score / 5) * 100);
  }, [form]);

  const refreshProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profile, cases, latestStatement] = await Promise.all([
        authService.getProfile(),
        firService.listVictimCases(),
        statementService.getLatest().catch(() => null),
      ]);

      setUser(profile);
      setForm(toForm(profile));

      const activeCases = Array.isArray(cases)
        ? cases.filter((item: any) => {
            const status = String(item.status ?? "").toLowerCase();
            return (
              !status.includes("closed") && !status.includes("chargesheet")
            );
          }).length
        : 0;

      const latestDate = latestStatement?.createdAt
        ? new Date(latestStatement.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "No statement yet";

      setStats({
        totalCases: Array.isArray(cases) ? cases.length : 0,
        activeCases,
        closedCases: Math.max(
          (Array.isArray(cases) ? cases.length : 0) - activeCases,
          0,
        ),
        latestStatementDate: latestDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProfile();
  }, []);

  const handleChange = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const handleBlur = (key: keyof ProfileForm) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleReset = () => {
    setForm(toForm(user));
    setMessage(null);
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setMessageType("error");
      setMessage(validationError);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updated = await authService.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        language: form.language,
        aadhaarLast4: form.aadhaarLast4.trim(),
      });

      setUser(updated);
      setForm(toForm(updated));
      setMessageType("success");
      setMessage("Profile saved successfully.");
    } catch (err) {
      setMessageType("error");
      setMessage(
        err instanceof Error ? err.message : "Unable to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 18%, rgba(249,115,22,0.16), transparent 35%), radial-gradient(circle at 85% 10%, rgba(59,130,246,0.16), transparent 30%), linear-gradient(180deg, #05070f 0%, #0a0f1e 48%, #070b16 100%)",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "40px 20px 56px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 1080, margin: "0 auto" }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                color: "#93c5fd",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Victim Profile Workspace
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: 36,
                fontWeight: 900,
                color: "#f8fafc",
              }}
            >
              Personal Identity and Safety Profile
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void refreshProfile()}
              disabled={loading}
              style={{
                border: "1px solid rgba(148,163,184,0.35)",
                borderRadius: 12,
                background: "rgba(15, 23, 42, 0.7)",
                color: "#cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 12px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <Link
              to="/victim"
              style={{
                border: "1px solid rgba(251,146,60,0.45)",
                borderRadius: 12,
                background: "rgba(249,115,22,0.15)",
                color: "#fdba74",
                padding: "9px 12px",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Home <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {error && (
          <div
            style={{
              ...statusStyles.error,
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {message && (
          <div
            style={{
              ...(messageType === "success"
                ? statusStyles.success
                : statusStyles.error),
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {messageType === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {[
            {
              label: "Total Cases",
              value: stats.totalCases,
              icon: FileText,
              color: "#38bdf8",
            },
            {
              label: "Active Cases",
              value: stats.activeCases,
              icon: ShieldCheck,
              color: "#fb923c",
            },
            {
              label: "Closed Cases",
              value: stats.closedCases,
              icon: CheckCircle2,
              color: "#4ade80",
            },
            {
              label: "Latest Statement",
              value: stats.latestStatementDate,
              icon: BadgeInfo,
              color: "#a78bfa",
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -3, scale: 1.01 }}
              style={{
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <card.icon size={16} color={card.color} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#93c5fd",
                    letterSpacing: "0.06em",
                  }}
                >
                  {card.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: card.label === "Latest Statement" ? 16 : 28,
                  fontWeight: 900,
                  color: "#f8fafc",
                }}
              >
                {card.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: 14,
          }}
        >
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            style={{
              border: "1px solid rgba(148,163,184,0.25)",
              background:
                "linear-gradient(170deg, rgba(15,23,42,0.88), rgba(2,6,23,0.95))",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <h2
              style={{
                margin: "0 0 14px",
                fontSize: 22,
                fontWeight: 900,
                color: "#f8fafc",
              }}
            >
              Edit Profile
            </h2>

            <div
              style={{
                marginBottom: 14,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(15,23,42,0.52)",
                padding: "10px 12px",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 700 }}>
                Profile completeness: {completion}%
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#93c5fd",
                }}
              >
                Keep details accurate for faster notices and case updates.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}
                >
                  Full Name
                </span>
                <div style={{ position: "relative" }}>
                  <User
                    size={15}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "#64748b",
                    }}
                  />
                  <input
                    value={form.name}
                    onChange={(event) =>
                      handleChange("name", event.target.value)
                    }
                    onBlur={() => handleBlur("name")}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border:
                        touched.name && fieldErrors.name
                          ? "1px solid rgba(248,113,113,0.75)"
                          : "1px solid rgba(148,163,184,0.3)",
                      background: "rgba(15,23,42,0.78)",
                      color: "#f8fafc",
                      padding: "10px 12px 10px 36px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
                {touched.name && fieldErrors.name ? (
                  <span style={{ fontSize: 12, color: "#fca5a5" }}>
                    {fieldErrors.name}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Use your legal name as used in FIR records.
                  </span>
                )}
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}
                >
                  Phone
                </span>
                <div style={{ position: "relative" }}>
                  <Phone
                    size={15}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "#64748b",
                    }}
                  />
                  <input
                    value={form.phone}
                    maxLength={10}
                    onChange={(event) =>
                      handleChange(
                        "phone",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                    onBlur={() => handleBlur("phone")}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border:
                        touched.phone && fieldErrors.phone
                          ? "1px solid rgba(248,113,113,0.75)"
                          : "1px solid rgba(148,163,184,0.3)",
                      background: "rgba(15,23,42,0.78)",
                      color: "#f8fafc",
                      padding: "10px 12px 10px 36px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
                {touched.phone && fieldErrors.phone ? (
                  <span style={{ fontSize: 12, color: "#fca5a5" }}>
                    {fieldErrors.phone}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    FIR alerts are sent to this number. ({form.phone.length}/10)
                  </span>
                )}
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}
                >
                  Email (read-only)
                </span>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={15}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "#64748b",
                    }}
                  />
                  <input
                    value={form.email}
                    disabled
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(15,23,42,0.42)",
                      color: "#94a3b8",
                      padding: "10px 12px 10px 36px",
                      fontSize: 14,
                    }}
                  />
                </div>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}
                >
                  Gender
                </span>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.gender}
                    onChange={(event) =>
                      handleChange("gender", event.target.value)
                    }
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.3)",
                      background: "rgba(15,23,42,0.78)",
                      color: "#f8fafc",
                      padding: "10px 38px 10px 12px",
                      fontSize: 14,
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      color: "#94a3b8",
                      pointerEvents: "none",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Used for respectful communication in official notices.
                </span>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}
                >
                  Preferred Language
                </span>
                <div style={{ position: "relative" }}>
                  <Languages
                    size={15}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "#64748b",
                    }}
                  />
                  <select
                    value={form.language}
                    onChange={(event) =>
                      handleChange("language", event.target.value)
                    }
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.3)",
                      background: "rgba(15,23,42,0.78)",
                      color: "#f8fafc",
                      padding: "10px 12px 10px 36px",
                      fontSize: 14,
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      color: "#94a3b8",
                      pointerEvents: "none",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Choose your preferred language for support interactions.
                </span>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}
                >
                  Aadhaar Last 4 Digits
                </span>
                <input
                  value={form.aadhaarLast4}
                  maxLength={4}
                  placeholder="Optional"
                  onChange={(event) =>
                    handleChange(
                      "aadhaarLast4",
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  onBlur={() => handleBlur("aadhaarLast4")}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border:
                      touched.aadhaarLast4 && fieldErrors.aadhaarLast4
                        ? "1px solid rgba(248,113,113,0.75)"
                        : "1px solid rgba(148,163,184,0.3)",
                    background: "rgba(15,23,42,0.78)",
                    color: "#f8fafc",
                    padding: "10px 12px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                {touched.aadhaarLast4 && fieldErrors.aadhaarLast4 ? (
                  <span style={{ fontSize: 12, color: "#fca5a5" }}>
                    {fieldErrors.aadhaarLast4}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Optional, for verification only. ({form.aadhaarLast4.length}
                    /4)
                  </span>
                )}
              </label>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #f97316, #fb7185)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: saving || !hasChanges ? "not-allowed" : "pointer",
                  opacity: saving || !hasChanges ? 0.7 : 1,
                }}
              >
                <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges || saving}
                style={{
                  border: "1px solid rgba(148,163,184,0.35)",
                  borderRadius: 12,
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#cbd5e1",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: !hasChanges || saving ? "not-allowed" : "pointer",
                  opacity: !hasChanges || saving ? 0.6 : 1,
                }}
              >
                Reset Draft
              </button>
            </div>

            {!hasChanges && !loading && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                No pending changes. Update any field to enable Save.
              </p>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              border: "1px solid rgba(148,163,184,0.22)",
              background:
                "linear-gradient(170deg, rgba(30,41,59,0.65), rgba(2,6,23,0.92))",
              borderRadius: 20,
              padding: 18,
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(59,130,246,0.35)",
                background: "rgba(30,58,138,0.2)",
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <ShieldCheck size={16} color="#60a5fa" />
                <strong style={{ color: "#bfdbfe", fontSize: 13 }}>
                  Safety Tip
                </strong>
              </div>
              <p
                style={{
                  margin: 0,
                  color: "#cbd5e1",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Keep your phone number updated so FIR and hearing updates reach
                you instantly.
              </p>
            </div>

            {[
              {
                to: "/victim/statement",
                icon: FileText,
                title: "Statement Workspace",
                subtitle: "Write or update your incident narrative",
              },
              {
                to: "/victim/tracker",
                icon: BadgeInfo,
                title: "Track My Cases",
                subtitle: "Monitor investigation and timeline updates",
              },
              {
                to: "/victim/rights",
                icon: Scale,
                title: "Know My Rights",
                subtitle: "Quick rights and compensation guidance",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  textDecoration: "none",
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.24)",
                  background: "rgba(15,23,42,0.58)",
                  padding: 12,
                  display: "grid",
                  gap: 6,
                  color: "#e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 800,
                    color: "#f8fafc",
                  }}
                >
                  <item.icon size={16} color="#f97316" />
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {item.subtitle}
                </div>
              </Link>
            ))}
          </motion.aside>
        </div>
      </motion.div>
    </div>
  );
};

export default VictimProfilePage;
