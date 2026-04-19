import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  User,
  BadgeCheck,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./useAuth";
import { AuthLayout } from "./AuthLayout";
import { AnimatedAuthBackground } from "../../../components/ui/AnimatedAuthBackground";
import { CardMotionBackdrop } from "./CardMotionBackdrop";
import type { LoginCredentials } from "../../../services/authService";

/* ── Validation ─────────────────────────────────────────────────── */
const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

/* ── Roles ──────────────────────────────────────────────────────── */
const ROLES = [
  { id: "victim" as const, label: "Victim", labelHi: "पीड़ित", icon: User },
  {
    id: "officer" as const,
    label: "Officer",
    labelHi: "अधिकारी",
    icon: BadgeCheck,
  },
  { id: "admin" as const, label: "Admin", labelHi: "व्यवस्थापक", icon: Lock },
] as const;
type RoleId = (typeof ROLES)[number]["id"];

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
export const LoginPage = () => {
  const [activeRole, setActiveRole] = useState<RoleId>("victim");
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
  const [searchParams] = useSearchParams();
  const { login, isLoading, error } = useAuth();
  const isPending = searchParams.get("status") === "pending";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    reset();
  }, [activeRole, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values as LoginCredentials);
    } catch {
      /* error handled via store */
    }
  };

  const registerHref =
    activeRole === "victim"
      ? "/register/victim"
      : activeRole === "officer"
        ? "/register/officer"
        : null;

  return (
    <>
      <AnimatedAuthBackground />
      <AuthLayout backTo="/" backLabel="← Back to portal" variant="minimal">
        <div className="w-full max-w-[390px] mx-auto">
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
                      Welcome
                    </span>
                  </motion.div>

                  <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                    Account Access
                  </h1>

                  <p className="text-xs text-slate-400 font-medium">
                    Sign in to continue securely
                  </p>

                  {/* Pending notice */}
                  <AnimatePresence>
                    {isPending && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          scale: 1,
                          marginTop: 16,
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          scale: 0.95,
                          marginTop: 0,
                        }}
                        className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-start gap-2 mt-4"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-xs text-emerald-400 mb-1">
                            Registration Successful
                          </p>
                          <p className="text-[10px] text-emerald-300/[0.85] leading-relaxed">
                            Your account is pending verification. We will notify
                            you once your access is approved.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ── Role Identity Selector ──────────────────────────────── */}
                <motion.div
                  className="flex relative p-1.5 bg-[#1e293b]/50 border border-white/5 rounded-2xl mb-8 shadow-inner"
                  variants={itemVariants}
                >
                  {ROLES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      id={`tab-role-${id}`}
                      type="button"
                      onClick={() => setActiveRole(id)}
                      className="relative flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[11px] font-bold transition-colors duration-300 outline-none"
                      style={{ color: activeRole === id ? "#fff" : "#64748b" }}
                    >
                      {activeRole === id && (
                        <motion.div
                          layoutId="activeRolePill"
                          className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-[#ea580c] to-[#c2410c] shadow-[0_4px_12px_rgba(234,88,12,0.3)]"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <Icon
                          className={`w-4 h-4 transition-transform duration-300 ${activeRole === id ? "text-white" : ""}`}
                        />
                        <span className="tracking-wide">{label}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>

                {/* ── Login Form ──────────────────────────────── */}
                <motion.form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-4"
                  variants={itemVariants}
                >
                  {/* Email container */}
                  <motion.div
                    className="space-y-1.5 relative group"
                    {...boxHoverMotion}
                  >
                    <label
                      htmlFor="login-email"
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
                        id="login-email"
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
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-red-400 flex items-center gap-1.5 pl-2 pt-0.5 font-medium"
                      >
                        <AlertCircle className="w-3 h-3" />{" "}
                        {errors.email.message}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Password container */}
                  <motion.div
                    className="space-y-1.5 relative group"
                    {...boxHoverMotion}
                  >
                    <div className="flex items-center justify-between px-2">
                      <label
                        htmlFor="login-password"
                        className="block text-[9px] font-black text-slate-400 uppercase tracking-widest"
                      >
                        Access Token
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Protected
                      </span>
                    </div>
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
                            focusedField === "password" ? "#ea580c" : "#64748b",
                        }}
                      >
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        onFocus={() => setFocusedField("password")}
                        {...register("password", {
                          onBlur: () => setFocusedField(null),
                        })}
                        className="w-full bg-transparent pl-10 pr-12 py-3 text-xs text-white font-medium placeholder-slate-500 tracking-wider focus:outline-none focus:ring-0 outline-none rounded-xl"
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
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-red-400 flex items-center gap-1.5 pl-2 pt-0.5 font-medium"
                      >
                        <AlertCircle className="w-3 h-3" />{" "}
                        {errors.password.message}
                      </motion.p>
                    )}
                  </motion.div>

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
                    id="login-submit"
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="relative group w-full py-3 px-6 mt-2 rounded-xl flex items-center justify-center gap-2 overflow-hidden text-xs font-extrabold uppercase tracking-widest text-white disabled:opacity-50 transition-all shadow-[0_8px_20px_-6px_rgba(234,88,12,0.35)]"
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
                        <span>Authenticate</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1 border-white/50" />
                      </>
                    )}
                  </motion.button>
                </motion.form>

                {/* Registration Link */}
                <AnimatePresence>
                  {!isPending && registerHref && (
                    <motion.div
                      className="mt-6 text-center"
                      variants={itemVariants}
                    >
                      <p className="text-[11px] font-semibold text-slate-400">
                        Unregistered node?{" "}
                        <Link
                          to={registerHref}
                          className="text-[#ea580c] hover:text-[#ffb84d] transition-colors ml-1 font-bold inline-flex items-center gap-1 group"
                        >
                          Initialize context
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Security notice */}
            <motion.div
              className="mt-6 text-center flex justify-center"
              variants={itemVariants}
            >
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

export default LoginPage;
