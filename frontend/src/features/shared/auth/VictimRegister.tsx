import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Mail,
  Phone,
  Lock,
  Globe,
  Loader2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./useAuth";
import { AuthLayout } from "./AuthLayout";
import { AnimatedAuthBackground } from "../../../components/ui/AnimatedAuthBackground";
import { CardMotionBackdrop } from "./CardMotionBackdrop";

/* ── Validation ─────────────────────────────────────────────────── */
const schema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    language: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "mr", label: "मराठी (Marathi)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "bh", label: "भोजपुरी (Bhojpuri)" },
];

/* ── Animation Variants ─────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const boxHoverMotion = {
  whileHover: { y: -2, scale: 1.01 },
};

/* ══════════════════════════════════════════════════════════════════ */
export const VictimRegister = () => {
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { victimRegister, isLoading, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    const { confirmPassword: _, ...payload } = values;
    try {
      await victimRegister(payload);
    } catch {
      /* error via store */
    }
  };

  const Err = ({ msg }: { msg?: string }) =>
    msg ? (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[10px] text-red-400 flex items-center gap-1.5 pl-2 pt-0.5 font-medium"
      >
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {msg}
      </motion.p>
    ) : null;

  return (
    <>
      <AnimatedAuthBackground />
      <AuthLayout
        backTo="/login"
        backLabel="← Back to portal"
        formMaxWidth="max-w-[550px]"
        variant="minimal"
      >
        <div className="w-full mx-auto">
          <motion.div
            className="relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* The beautiful frosted glass container */}
            <div className="relative overflow-hidden bg-[#0f172a]/72 backdrop-blur-2xl border border-white/10 rounded-[1.6rem] p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)]">
              <CardMotionBackdrop />

              <div className="relative z-10">
                {/* ── Header ──────────────────────── */}
                <motion.div
                  className="mb-8 text-center"
                  variants={itemVariants}
                >
                  <motion.div className="inline-flex items-center gap-2 mb-4 py-1.5 px-4 rounded-full bg-gradient-to-r from-[#ea580c]/10 to-[#ea580c]/5 border border-[#ea580c]/20">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff9933]" />
                    <span className="text-[9px] font-extrabold tracking-[0.25em] uppercase text-[#ffadd6] bg-clip-text text-transparent bg-gradient-to-r from-[#ff9933] to-[#ffb84d]">
                      Registration
                    </span>
                  </motion.div>

                  <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                    Create Victim Account
                  </h1>

                  <p className="text-xs text-slate-400 font-medium">
                    Already registered?{" "}
                    <Link
                      to="/login"
                      className="text-[#ea580c] hover:text-[#ffb84d] transition-colors ml-1 font-bold inline-flex items-center group"
                    >
                      Sign in{" "}
                      <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </p>
                </motion.div>

                {/* ── Registration Form ──────────────────────────────── */}
                <motion.form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-4"
                  variants={itemVariants}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name container */}
                    <motion.div
                      className="space-y-1.5 relative group"
                      {...boxHoverMotion}
                    >
                      <label
                        htmlFor="v-name"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                      >
                        Full Name
                      </label>
                      <div
                        className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                        style={{
                          borderColor:
                            focusedField === "name"
                              ? "rgba(234,88,12,0.5)"
                              : "rgba(255,255,255,0.05)",
                          boxShadow:
                            focusedField === "name"
                              ? "0 0 0 4px rgba(234,88,12,0.1)"
                              : "none",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                          style={{
                            color:
                              focusedField === "name" ? "#ea580c" : "#64748b",
                          }}
                        >
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="v-name"
                          type="text"
                          autoComplete="name"
                          placeholder="Ravi Kumar"
                          onFocus={() => setFocusedField("name")}
                          {...register("name", {
                            onBlur: () => setFocusedField(null),
                          })}
                          className="w-full bg-transparent pl-10 pr-4 py-3 text-xs text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-0 outline-none rounded-xl"
                        />
                      </div>
                      <Err msg={errors.name?.message} />
                    </motion.div>

                    {/* Phone container */}
                    <motion.div
                      className="space-y-1.5 relative group"
                      {...boxHoverMotion}
                    >
                      <label
                        htmlFor="v-phone"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                      >
                        Mobile Number
                      </label>
                      <div
                        className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                        style={{
                          borderColor:
                            focusedField === "phone"
                              ? "rgba(234,88,12,0.5)"
                              : "rgba(255,255,255,0.05)",
                          boxShadow:
                            focusedField === "phone"
                              ? "0 0 0 4px rgba(234,88,12,0.1)"
                              : "none",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                          style={{
                            color:
                              focusedField === "phone" ? "#ea580c" : "#64748b",
                          }}
                        >
                          <Phone className="w-4 h-4" />
                        </div>
                        <span
                          className="absolute left-9 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
                          style={{
                            color:
                              focusedField === "phone" ? "#ea580c" : "#64748b",
                          }}
                        >
                          +91
                        </span>
                        <input
                          id="v-phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="98765 43210"
                          onFocus={() => setFocusedField("phone")}
                          {...register("phone", {
                            onBlur: () => setFocusedField(null),
                          })}
                          className="w-full bg-transparent pl-16 pr-4 py-3 text-xs text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-0 outline-none rounded-xl"
                        />
                      </div>
                      <Err msg={errors.phone?.message} />
                    </motion.div>
                  </div>

                  {/* Email container */}
                  <motion.div
                    className="space-y-1.5 relative group"
                    {...boxHoverMotion}
                  >
                    <label
                      htmlFor="v-email"
                      className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                    >
                      Official Email
                    </label>
                    <div
                      className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                      style={{
                        borderColor:
                          focusedField === "email"
                            ? "rgba(234,88,12,0.5)"
                            : "rgba(255,255,255,0.05)",
                        boxShadow:
                          focusedField === "email"
                            ? "0 0 0 4px rgba(234,88,12,0.1)"
                            : "none",
                      }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                        style={{
                          color:
                            focusedField === "email" ? "#ea580c" : "#64748b",
                        }}
                      >
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="v-email"
                        type="email"
                        autoComplete="email"
                        placeholder="identity@nyayasetu.gov.in"
                        onFocus={() => setFocusedField("email")}
                        {...register("email", {
                          onBlur: () => setFocusedField(null),
                        })}
                        className="w-full bg-transparent pl-10 pr-4 py-3 text-xs text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-0 outline-none rounded-xl"
                      />
                    </div>
                    <Err msg={errors.email?.message} />
                  </motion.div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Gender container */}
                    <motion.div
                      className="space-y-1.5 relative group"
                      {...boxHoverMotion}
                    >
                      <label
                        htmlFor="v-gender"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                      >
                        Gender{" "}
                        <span className="text-[#475569] font-semibold tracking-normal lowercase">
                          (Optional)
                        </span>
                      </label>
                      <div
                        className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                        style={{
                          borderColor:
                            focusedField === "gender"
                              ? "rgba(234,88,12,0.5)"
                              : "rgba(255,255,255,0.05)",
                          boxShadow:
                            focusedField === "gender"
                              ? "0 0 0 4px rgba(234,88,12,0.1)"
                              : "none",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                          style={{
                            color:
                              focusedField === "gender" ? "#ea580c" : "#64748b",
                          }}
                        >
                          <User className="w-4 h-4 opacity-50" />
                        </div>
                        <select
                          id="v-gender"
                          onFocus={() => setFocusedField("gender")}
                          {...register("gender", {
                            onBlur: () => setFocusedField(null),
                          })}
                          className="w-full bg-transparent pl-10 pr-4 py-3 text-xs text-white font-medium focus:outline-none outline-none appearance-none cursor-pointer"
                        >
                          <option
                            value=""
                            className="bg-[#0f172a] text-slate-400"
                          >
                            Select gender
                          </option>
                          <option value="male" className="bg-[#0f172a]">
                            Male / पुरुष
                          </option>
                          <option value="female" className="bg-[#0f172a]">
                            Female / महिला
                          </option>
                          <option value="other" className="bg-[#0f172a]">
                            Other / अन्य
                          </option>
                          <option
                            value="prefer_not_to_say"
                            className="bg-[#0f172a]"
                          >
                            Prefer not to say
                          </option>
                        </select>
                      </div>
                    </motion.div>
                    {/* Language container */}
                    <motion.div
                      className="space-y-1.5 relative group"
                      {...boxHoverMotion}
                    >
                      <label
                        htmlFor="v-language"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                      >
                        Preferred Language
                      </label>
                      <div
                        className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                        style={{
                          borderColor:
                            focusedField === "language"
                              ? "rgba(234,88,12,0.5)"
                              : "rgba(255,255,255,0.05)",
                          boxShadow:
                            focusedField === "language"
                              ? "0 0 0 4px rgba(234,88,12,0.1)"
                              : "none",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                          style={{
                            color:
                              focusedField === "language"
                                ? "#ea580c"
                                : "#64748b",
                          }}
                        >
                          <Globe className="w-4 h-4 opacity-50" />
                        </div>
                        <select
                          id="v-language"
                          onFocus={() => setFocusedField("language")}
                          {...register("language", {
                            onBlur: () => setFocusedField(null),
                          })}
                          className="w-full bg-transparent pl-10 pr-4 py-3 text-xs text-white font-medium focus:outline-none outline-none appearance-none cursor-pointer"
                        >
                          {LANGUAGES.map((l) => (
                            <option
                              key={l.value}
                              value={l.value}
                              className="bg-[#0f172a]"
                            >
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password container */}
                    <motion.div
                      className="space-y-1.5 relative group"
                      {...boxHoverMotion}
                    >
                      <label
                        htmlFor="v-password"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                      >
                        Access Token
                      </label>
                      <div
                        className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                        style={{
                          borderColor:
                            focusedField === "password"
                              ? "rgba(234,88,12,0.5)"
                              : "rgba(255,255,255,0.05)",
                          boxShadow:
                            focusedField === "password"
                              ? "0 0 0 4px rgba(234,88,12,0.1)"
                              : "none",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                          style={{
                            color:
                              focusedField === "password"
                                ? "#ea580c"
                                : "#64748b",
                          }}
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="v-password"
                          type={showPw ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Min 8 chars"
                          onFocus={() => setFocusedField("password")}
                          {...register("password", {
                            onBlur: () => setFocusedField(null),
                          })}
                          className="w-full bg-transparent pl-10 pr-10 py-3 text-xs text-white font-medium placeholder-slate-500 tracking-wider focus:outline-none focus:ring-0 outline-none rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#ea580c] transition-colors"
                        >
                          {showPw ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Err msg={errors.password?.message} />
                    </motion.div>

                    {/* Confirm Password container */}
                    <motion.div
                      className="space-y-1.5 relative group"
                      {...boxHoverMotion}
                    >
                      <label
                        htmlFor="v-confirm"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2"
                      >
                        Confirm Token
                      </label>
                      <div
                        className="relative rounded-xl transition-all duration-300 bg-[#1e293b]/40 border"
                        style={{
                          borderColor:
                            focusedField === "confirm"
                              ? "rgba(234,88,12,0.5)"
                              : "rgba(255,255,255,0.05)",
                          boxShadow:
                            focusedField === "confirm"
                              ? "0 0 0 4px rgba(234,88,12,0.1)"
                              : "none",
                        }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300"
                          style={{
                            color:
                              focusedField === "confirm"
                                ? "#ea580c"
                                : "#64748b",
                          }}
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="v-confirm"
                          type={showCpw ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Repeat token"
                          onFocus={() => setFocusedField("confirm")}
                          {...register("confirmPassword", {
                            onBlur: () => setFocusedField(null),
                          })}
                          className="w-full bg-transparent pl-10 pr-10 py-3 text-xs text-white font-medium placeholder-slate-500 tracking-wider focus:outline-none focus:ring-0 outline-none rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCpw(!showCpw)}
                          className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-[#ea580c] transition-colors"
                        >
                          {showCpw ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Err msg={errors.confirmPassword?.message} />
                    </motion.div>
                  </div>

                  {/* API Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 mt-3"
                      >
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-red-500 flex-shrink-0" />
                        <p className="text-[11px] font-medium text-red-400/90 leading-relaxed">
                          {error}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Buttion */}
                  <motion.button
                    id="victim-register-submit"
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="relative group w-full py-3 px-6 mt-3 rounded-xl flex items-center justify-center gap-2 overflow-hidden text-xs font-extrabold uppercase tracking-widest text-white disabled:opacity-50 transition-all shadow-[0_8px_20px_-6px_rgba(234,88,12,0.35)]"
                    style={{
                      background: isLoading
                        ? "#334155"
                        : "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                        <span>Establish Context</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1 border-white/50" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              </div>
            </div>

            {/* Bottom Security notice */}
            <motion.div className="mt-5 text-center" variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.05] bg-[#0f172a]/40 backdrop-blur-md">
                <ShieldCheck className="w-3 h-3 text-[#64748b]" />
                <span className="text-[9px] font-bold text-[#64748b] tracking-wider uppercase">
                  Secured by MHA encryption standard
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </AuthLayout>
    </>
  );
};

export default VictimRegister;
