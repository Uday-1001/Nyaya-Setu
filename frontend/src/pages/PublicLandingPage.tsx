import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  X,
  Scale,
  FileText,
  Mic,
  ShieldCheck,
  MapPin,
  Bell,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { HeroSection } from "../components/ui/HeroSection";
import { StatsBar } from "../components/ui/StatsBar";

/* ── Inline 24-spoke mini Chakra for the nav logo ─────────────── */
const ChakraIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
    {Array.from({ length: 24 }, (_, i) => {
      const rad = ((i * 15 - 90) * Math.PI) / 180;
      return (
        <line
          key={i}
          x1={50 + 10 * Math.cos(rad)}
          y1={50 + 10 * Math.sin(rad)}
          x2={50 + 40 * Math.cos(rad)}
          y2={50 + 40 * Math.sin(rad)}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
    })}
    <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="4" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════
   PUBLIC LANDING PAGE
══════════════════════════════════════════════════════════════ */
export const PublicLandingPage: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden bg-[#0a0f1a]"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Ambient glow blobs ─────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10vh] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#ea580c]/10 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10vh] left-[-10vw] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-emerald-500/5 to-transparent blur-[100px]" />
      </div>

      {/* ── Content layer (above blobs) ────────────────────────── */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Tricolor top stripe ─────────────────────────────── */}
        <div className="flex h-[3px] flex-shrink-0">
          <div className="flex-1 bg-[#ff9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {/* ══ NAVBAR ═════════════════════════════════════════════ */}
        <header className="sticky top-0 z-50 flex-shrink-0 border-b border-white/[0.04] bg-[#0f172a]/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 text-[#ea580c] no-underline mr-10 hover:opacity-80 transition-opacity"
              aria-label="NyayaSetu home"
            >
              <ChakraIcon size={22} />
              <span className="font-extrabold text-[16px] tracking-[-0.02em] text-white">
                Nyaya<span className="text-[#ea580c]">Setu</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2 flex-1 justify-end">
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                  style={{ textDecoration: "none" }}
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Right CTA group */}
            <div className="flex items-center gap-4 md:hidden">
              {/* Burger */}
              <button
                className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-white/5 transition-colors border-none bg-transparent outline-none cursor-pointer"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/[0.04] bg-[#0f172a]/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-2"
            >
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Login", href: "/login" },
                { label: "Get Started", href: "/register/victim" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-semibold py-3 border-b border-white/[0.04] ${label === "Get Started" ? "text-[#ea580c]" : "text-slate-300"}`}
                  style={{ textDecoration: "none" }}
                >
                  {label}
                </a>
              ))}
            </motion.div>
          )}
        </header>

        {/* ══ MAIN ═══════════════════════════════════════════════ */}
        <main className="flex-1">
          {/* Hero */}
          <HeroSection />

          {/* Stats bar */}
          <div className="relative z-20 shadow-2xl">
            <StatsBar />
          </div>

          {/* ── Features section ───────────────────────────────── */}
          <section id="features" className="py-32 px-8 relative">
            <div className="max-w-7xl mx-auto">
              {/* Section header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-16 max-w-xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[2px] w-6 bg-gradient-to-r from-[#ea580c] to-transparent" />
                  <span className="text-[#ea580c] text-[10px] font-extrabold tracking-[0.25em] uppercase">
                    Platform Features
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] text-white tracking-tight">
                  Everything you need,
                  <br />
                  <span className="bg-gradient-to-b from-[#ff9933] to-[#ea580c] text-transparent bg-clip-text">
                    in a single hub.
                  </span>
                </h2>
              </motion.div>

              {/* Feature cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Scale,
                    title: "AI-Powered BNS-BNSS Mapping",
                    desc: "Describe the incident in plain language. Our ML engine matches semantics against the Nandhakumar dataset to recommend sections.",
                    tag: "Machine Learning",
                  },
                  {
                    icon: Mic,
                    title: "Backend Transcription",
                    desc: "Record audio natively. Sent to our secure backend where Whisper generates highly-accurate verbatum transcripts without flakyness.",
                    tag: "Voice Engine",
                  },
                  {
                    icon: FileText,
                    title: "Official Document Structuring",
                    desc: "Generates formal, diagonal Saffron watermarked PDF documents compliant with Ministry of Home Affairs structural guidelines.",
                    tag: "Generative",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Rights Transparency",
                    desc: "BNSS §173 free copy rights and Zero FIR explained clearly in multiple languages making the legal process frictionless.",
                    tag: "Awareness",
                  },
                  {
                    icon: MapPin,
                    title: "Jurisdiction Targeting",
                    desc: "Use location APIs to target the correct nodal authority ensuring your documents are sent to the exactly relevant station.",
                    tag: "Geo-Targeting",
                  },
                  {
                    icon: Bell,
                    title: "Status Progression",
                    desc: "Check state updates live on your dedicated secure dashboard. Witness chargesheets progress from drafting straight to court filing.",
                    tag: "Live Tracking",
                  },
                ].map(({ icon: Icon, title, desc, tag }, idx) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative rounded-2xl border border-white/5 p-8 transition-all duration-300 bg-[#0f172a]/50 backdrop-blur-lg hover:bg-[#1e293b]/50 hover:shadow-[0_20px_40px_-15px_rgba(234,88,12,0.15)] hover:-translate-y-1 hover:border-[#ea580c]/30"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:bg-[#ea580c]/10 group-hover:border-[#ea580c]/30 transition-colors">
                        <Icon className="w-6 h-6 text-slate-300 group-hover:text-[#ea580c] transition-colors" />
                      </div>
                      <span className="text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 group-hover:bg-[#ea580c]/20 group-hover:text-[#ea580c] transition-colors">
                        {tag}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 tracking-tight group-hover:text-[#ff9933] transition-colors">
                      {title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ────────────────────────────────────── */}
          <section
            id="how-it-works"
            className="py-32 px-8 relative bg-gradient-to-b from-[#0a0f1a] to-[#0f172a]"
          >
            {/* Divider */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#ea580c]" />
                  <span className="text-[#ea580c] text-[10px] font-extrabold tracking-[0.25em] uppercase">
                    Workflow
                  </span>
                  <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#ea580c]" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Zero friction. Maximum{" "}
                  <span className="bg-gradient-to-b from-[#ff9933] to-[#ea580c] text-transparent bg-clip-text">
                    impact.
                  </span>
                </h2>
              </motion.div>

              <div className="relative">
                {/* Connecting line */}
                <div className="hidden md:block absolute top-[30px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#ea580c]/30 to-transparent" />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
                  {[
                    {
                      step: "01",
                      title: "Share Your Statement",
                      body: "Type or speak what happened in your own words. Your information stays protected.",
                    },
                    {
                      step: "02",
                      title: "We Review It",
                      body: "The system reads your statement and finds the most relevant legal sections for your case.",
                    },
                    {
                      step: "03",
                      title: "Draft Is Ready",
                      body: "A clear FIR draft is prepared for you in the right format.",
                    },
                    {
                      step: "04",
                      title: "Download & Share PDF",
                      body: "Get the official PDF instantly and share it when needed.",
                    },
                  ].map(({ step, title, body }, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.15 }}
                      key={step}
                      className="flex flex-col items-center text-center group"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-[15px] font-black mb-6 relative z-10 bg-[#0f172a] border border-[#ea580c]/30 text-[#ea580c] shadow-[0_0_20px_rgba(234,88,12,0.1)] group-hover:bg-[#ea580c] group-hover:text-white transition-all duration-300">
                        <div className="absolute inset-0 rounded-full border border-[#ea580c]/20 scale-110 group-hover:scale-125 transition-transform duration-500" />
                        {step}
                      </div>
                      <h3 className="text-white font-bold text-base mb-3 group-hover:text-[#ea580c] transition-colors">
                        {title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">
                        {body}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── BNS 2024 compliance callout ──────────────────────── */}
          <section id="bns" className="py-32 px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-[2rem] overflow-hidden px-10 py-16 md:px-20 border border-white/5 shadow-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,41,59,0.8) 100%)",
                }}
              >
                {/* Decorative large chakra watermark */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 opacity-[0.03]"
                >
                  <ChakraIcon size={400} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-12">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#ea580c]/20 bg-[#ea580c]/10 mb-6">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#ff9933]" />
                      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#ff9933]">
                        BNS 2024 Compliance
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6 tracking-tight">
                      Architected natively on
                      <br />
                      the Bharatiya Nyaya Sanhita
                    </h2>
                    <p className="text-slate-400 text-[15px] leading-relaxed max-w-xl">
                      The core AI mappings and formal drafting modules are
                      programmed against the new Bharatiya Nyaya Sanhita 2024
                      (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and
                      Bharatiya Sakshya Adhiniyam (BSA) rules.
                    </p>
                  </div>
                  <div className="flex flex-col gap-4 min-w-[280px]">
                    {[
                      "Smart AI Legal Classification",
                      "Instant Context Processing Engine",
                      "Automatic BNS Section Mapping",
                      "Advanced Natural Language Engine",
                    ].map((item, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        key={item}
                        className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-xl backdrop-blur-md"
                      >
                        <div className="w-5 h-5 rounded-md flex flex-shrink-0 items-center justify-center bg-emerald-500/20 border border-emerald-500/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-slate-300 text-[13px] font-semibold">
                          {item}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── Final CTA ───────────────────────────────────────── */}
          <section className="py-32 px-8 relative bg-gradient-to-t from-[#0f172a] to-[#0a0f1a]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-8 tracking-tight drop-shadow-xl">
                आपका अधिकार.
                <br />
                <span className="bg-gradient-to-b from-[#ff9933] to-[#ea580c] text-transparent bg-clip-text">
                  आपकी सुरक्षा।
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-12">
                Log into your robust operational console. Execute context
                reporting securely, encrypted directly via Indian legal
                frameworks.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6">
                <Link
                  to="/register/victim"
                  className="relative group bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white rounded-xl px-10 py-4 text-xs font-black tracking-widest uppercase transition-all shadow-[0_8px_20px_-6px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(234,88,12,0.6)] flex items-center gap-2 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                  <span>Establish Context</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="bg-white/5 border border-white/10 text-white rounded-xl px-10 py-4 text-xs font-black tracking-widest uppercase hover:bg-white/10 transition-all shadow-lg flex items-center gap-2"
                >
                  Login
                </Link>
              </div>
            </motion.div>
          </section>
        </main>

        {/* ══ FOOTER ═══════════════════════════════════════════════ */}
        <footer className="border-t border-white/[0.04] bg-[#0f172a]/90 backdrop-blur-xl px-8 py-10 relative z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-[#ea580c] opacity-80">
                <ChakraIcon size={20} />
              </span>
              <span className="text-white font-black text-sm tracking-[-0.02em]">
                Nyaya<span className="text-[#ea580c]">Setu</span>
              </span>
            </div>

            <p className="text-slate-500 text-[10px] font-semibold text-center tracking-wider uppercase">
              © {new Date().getFullYear()} Nodal Legal Pipeline · Framework By
              Semicolon Squad
            </p>

            <span className="text-[10px] font-black tracking-[0.2em] uppercase bg-gradient-to-r from-[#ff9933] to-[#ea580c] text-transparent bg-clip-text">
              सत्यमेव जयते
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PublicLandingPage;
