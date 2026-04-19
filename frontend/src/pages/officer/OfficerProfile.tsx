import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { useLocation } from "react-router-dom";
import { officerService } from "../../services/officerService";

type OfficerProfileData = Awaited<ReturnType<typeof officerService.getProfile>>;

const LANG_OPTIONS = [
  "ENGLISH",
  "HINDI",
  "BHOJPURI",
  "MARATHI",
  "TAMIL",
  "TELUGU",
  "BENGALI",
  "GUJARATI",
  "KANNADA",
  "MALAYALAM",
  "PUNJABI",
  "ODIA",
] as const;

export const OfficerProfile = () => {
  const location = useLocation();
  const prefetchedProfile =
    (
      location.state as {
        prefetchedProfile?: OfficerProfileData;
      } | null
    )?.prefetchedProfile ?? null;

  const [profile, setProfile] = useState<OfficerProfileData | null>(
    prefetchedProfile,
  );
  const [loading, setLoading] = useState(!prefetchedProfile);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reverifyPending, setReverifyPending] = useState(false);
  const [form, setForm] = useState({
    name: prefetchedProfile?.user.name ?? "",
    phone: prefetchedProfile?.user.phone ?? "",
    preferredLang: prefetchedProfile?.user.preferredLang ?? "ENGLISH",
  });

  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;
    return (
      form.name.trim() !== profile.user.name ||
      form.phone.trim() !== profile.user.phone ||
      form.preferredLang !== profile.user.preferredLang
    );
  }, [form, profile]);

  useEffect(() => {
    let active = true;

    if (prefetchedProfile) {
      setProfile(prefetchedProfile);
      setForm({
        name: prefetchedProfile.user.name,
        phone: prefetchedProfile.user.phone,
        preferredLang: prefetchedProfile.user.preferredLang,
      });
      setError(null);
      setLoading(false);
    }

    void officerService
      .getProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setForm({
          name: data.user.name,
          phone: data.user.phone,
          preferredLang: data.user.preferredLang,
        });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (!prefetchedProfile) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load officer profile.",
          );
        }
      })
      .finally(() => {
        if (active && !prefetchedProfile) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [prefetchedProfile]);

  const handleSave = async () => {
    if (!profile || !hasProfileChanges) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await officerService.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        preferredLang: form.preferredLang,
      });
      setProfile(updated);
      setForm({
        name: updated.user.name,
        phone: updated.user.phone,
        preferredLang: updated.user.preferredLang,
      });
      setMessage("Profile updated successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRequestReverification = async () => {
    if (!profile) return;

    setReverifyPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await officerService.requestReverification();
      setProfile(updated);
      setMessage(
        "Re-verification request submitted. Your status is now pending review.",
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit re-verification request.",
      );
    } finally {
      setReverifyPending(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase mb-2">
        — प्रोफ़ाइल · OFFICER PROFILE
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-12">
        {profile?.user.name ?? "Officer profile"}
      </h1>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Loading profile...</p>
      ) : null}
      {error ? <p className="text-sm text-[#FCA5A5]">{error}</p> : null}
      {message ? <p className="text-sm text-[#86EFAC]">{message}</p> : null}

      {profile ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid lg:grid-cols-[62fr_38fr] gap-8"
        >
          <section className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#6B7280] uppercase mb-5">
              Officer Identity & Contact
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
              <label className="space-y-1">
                <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wide">
                  Name
                </span>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/[0.1] bg-black/45 px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#F97316]/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wide">
                  Phone
                </span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/[0.1] bg-black/45 px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#F97316]/50"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wide">
                  Language Preference
                </span>
                <select
                  value={form.preferredLang}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      preferredLang: e.target.value,
                    }))
                  }
                  className="officer-select w-full rounded-xl border border-white/[0.1] bg-black/45 px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#F97316]/50"
                >
                  {LANG_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-white/[0.08] pt-5 text-sm">
              {(
                [
                  ["Badge Number", profile.badgeNumber],
                  ["Rank", profile.rank],
                  ["Department", profile.department],
                  ["Station", profile.station.name],
                  ["District", profile.station.district],
                  ["CCTNS ID", profile.cctnsId ?? "Pending"],
                  ["Email", profile.user.email],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <dt className="text-[#6B7280] w-28 shrink-0">{k}:</dt>
                  <dd
                    className={`text-white font-semibold ${k.includes("ID") || k.includes("Badge") ? "font-mono" : ""}`}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !hasProfileChanges}
                className="inline-flex items-center gap-2 rounded-xl border border-[#F97316]/40 bg-[#F97316]/15 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#FDBA74] hover:bg-[#F97316]/25 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {saving ? "Saving…" : "Save Profile Changes"}
              </button>
              <button
                type="button"
                onClick={() => void handleRequestReverification()}
                disabled={
                  reverifyPending || profile.verificationStatus === "PENDING"
                }
                className="inline-flex items-center gap-2 rounded-xl border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#fcd34d] hover:bg-[#f59e0b]/20 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {reverifyPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldAlert size={14} />
                )}
                {profile.verificationStatus === "PENDING"
                  ? "Re-verification Pending"
                  : "Request Re-verification"}
              </button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-2xl border border-[#16A34A]/30 bg-[#16A34A]/10 p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#86EFAC] font-bold mb-1">
                Verification Status
              </p>
              <p className="text-xl font-extrabold text-[#4ADE80]">
                {profile.verificationStatus}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-2">
                Verified on{" "}
                {profile.verifiedAt
                  ? new Date(profile.verifiedAt).toLocaleString("en-GB")
                  : "Pending"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[10px] font-bold tracking-[0.15em] text-[#6B7280] uppercase mb-4">
                Performance Snapshot
              </p>
              <div className="grid gap-4">
                <div>
                  <p className="text-[44px] font-black text-white tabular-nums leading-none">
                    {profile.stats.docsGenerated}
                  </p>
                  <p className="mt-1 text-[10px] text-[#94A3B8] uppercase tracking-[0.14em]">
                    Documents Generated
                  </p>
                </div>
                <div>
                  <p className="text-[44px] font-black text-white tabular-nums leading-none">
                    {profile.stats.firsHandled}
                  </p>
                  <p className="mt-1 text-[10px] text-[#94A3B8] uppercase tracking-[0.14em]">
                    FIRs Handled
                  </p>
                </div>
                <div>
                  <p className="text-[44px] font-black text-white tabular-nums leading-none">
                    {profile.stats.voiceVerified}
                  </p>
                  <p className="mt-1 text-[10px] text-[#94A3B8] uppercase tracking-[0.14em]">
                    Voice Statements Verified
                  </p>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      ) : null}
    </div>
  );
};

export default OfficerProfile;
