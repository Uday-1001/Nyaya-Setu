import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Scale,
  ShieldCheck,
  Mic,
  FileText,
  Landmark,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AshokaChakraSVG } from "../ui/AshokaChakraSVG";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative w-full min-h-[calc(100vh-100px)] flex flex-col md:flex-row overflow-hidden bg-transparent perspective-1000">
      <style>{`
        @keyframes spin-cw {
          from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
        }
        @keyframes spin-ccw {
          from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
          to { transform: rotate(-360deg) translateX(var(--r)) rotate(360deg); }
        }
      `}</style>

      {/* LEFT SIDE (50%) */}
      <div className="w-full md:w-1/2 relative px-8 flex flex-col justify-center py-20 z-10 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/90 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-xl xl:pl-12"
        >
          {/* Welcome Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-6 py-1.5 px-4 rounded-full bg-gradient-to-r from-[#ea580c]/10 to-[#ea580c]/5 border border-[#ea580c]/20 shadow-[0_0_15px_rgba(234,88,12,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ff9933]" />
            <span className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#ffadd6] bg-clip-text text-transparent bg-gradient-to-r from-[#ff9933] to-[#ffb84d]">
              न्याय · DIGITAL JUSTICE SYSTEM
            </span>
          </motion.div>

          <h1 className="text-[64px] md:text-[84px] font-bold leading-[1.2] mb-8 tracking-tight flex flex-col gap-3">
            <span className="text-white drop-shadow-md">न्याय आपकी</span>
            <span className="bg-gradient-to-b from-[#ea580c] to-[#c2410c] text-transparent bg-clip-text pb-2 px-1 -ml-1 drop-shadow-lg">
              उंगलियों पर।
            </span>
          </h1>

          <p className="text-slate-400 text-[17px] max-w-[440px] mb-12 leading-relaxed font-medium p-1">
            India's first AI-powered FIR platform. Know your rights, prepare
            your complaint, and connect with justice — before you even reach the
            police station.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Link
              to="/register/victim"
              className="relative group bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white rounded-xl px-8 py-4 text-xs font-black tracking-widest uppercase transition-all shadow-[0_8px_20px_-6px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(234,88,12,0.6)] flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              <span>GET STARTED</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="text-slate-300 border border-white/10 bg-[#1e293b]/40 backdrop-blur-md rounded-xl px-8 py-4 text-xs font-black tracking-widest uppercase hover:bg-[#1e293b]/60 hover:text-white transition-all shadow-lg"
            >
              LOGIN
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[12px] font-medium tracking-wide">
            <span className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              End-to-end encrypted
            </span>
            <span className="opacity-40">·</span>
            <span>BNS 2024 Compliant</span>
            <span className="opacity-40">·</span>
            <span>2 Regional Languages</span>
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE (50%) — ORBITAL ANIMATION */}
      <div className="w-full md:w-1/2 relative bg-transparent flex items-center justify-center min-h-[500px] md:min-h-full overflow-hidden z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="relative w-[500px] h-[500px] scale-[0.6] sm:scale-75 lg:scale-100 flex items-center justify-center"
        >
          {/* Static Trails */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none text-white/[0.05]">
            <circle
              cx="250"
              cy="250"
              r="165"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <circle
              cx="250"
              cy="250"
              r="265"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          </svg>

          {/* Center Chakra */}
          <div
            className="absolute z-10 w-[120px] h-[120px] opacity-100 animate-[spin_40s_linear_infinite]"
            style={{ filter: "drop-shadow(0 0 45px rgba(234,88,12,0.6))" }}
          >
            <AshokaChakraSVG className="w-full h-full stroke-2 text-[#ea580c]" />
          </div>

          {/* ORBIT RING 1 (r=165px, cw, 22s) */}
          <div className="absolute w-full h-full pointer-events-none z-20">
            {/* Trucolor Ring Icon */}
            <div
              className="absolute top-1/2 left-1/2 w-[44px] h-[44px] -ml-[22px] -mt-[22px] rounded-full bg-[#0f172a]/70 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center overflow-hidden animate-[spin-cw_22s_linear_infinite] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              style={{ "--r": "165px" } as React.CSSProperties}
            >
              <div className="w-full h-1/3 bg-[#FF9933]/90"></div>
              <div className="w-full h-1/3 bg-white/90 relative flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0f172a] border border-[#ea580c]"></div>
              </div>
              <div className="w-full h-1/3 bg-[#138808]/90"></div>
            </div>

            <div
              className="absolute top-1/2 left-1/2 w-[44px] h-[44px] -ml-[22px] -mt-[22px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 flex items-center justify-center animate-[spin-cw_22s_linear_infinite] shadow-[0_4px_12px_rgba(234,88,12,0.2)]"
              style={
                {
                  "--r": "165px",
                  animationDelay: "-7.33s",
                } as React.CSSProperties
              }
            >
              <Scale className="w-[18px] h-[18px] text-[#ffb84d]" />
            </div>

            <div
              className="absolute top-1/2 left-1/2 w-[44px] h-[44px] -ml-[22px] -mt-[22px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 flex items-center justify-center animate-[spin-cw_22s_linear_infinite] shadow-[0_4px_12px_rgba(234,88,12,0.2)]"
              style={
                {
                  "--r": "165px",
                  animationDelay: "-14.66s",
                } as React.CSSProperties
              }
            >
              <span className="bg-gradient-to-b from-[#ff9933] to-[#ea580c] text-transparent bg-clip-text font-mono text-[22px] font-black leading-none pb-0.5">
                §
              </span>
            </div>
          </div>

          {/* ORBIT RING 2 (r=265px, ccw, 38s) */}
          <div className="absolute w-full h-full pointer-events-none z-20">
            <div
              className="absolute top-1/2 left-1/2 w-[40px] h-[40px] -ml-[20px] -mt-[20px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 flex items-center justify-center animate-[spin-ccw_38s_linear_infinite] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              style={
                { "--r": "265px", animationDelay: "0s" } as React.CSSProperties
              }
            >
              <ShieldCheck className="w-[18px] h-[18px] text-emerald-400" />
            </div>

            <div
              className="absolute top-1/2 left-1/2 w-[40px] h-[40px] -ml-[20px] -mt-[20px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 flex items-center justify-center animate-[spin-ccw_38s_linear_infinite] shadow-[0_4px_12px_rgba(234,88,12,0.2)]"
              style={
                {
                  "--r": "265px",
                  animationDelay: "-7.6s",
                } as React.CSSProperties
              }
            >
              <Mic className="w-[18px] h-[18px] text-[#ffb84d]" />
            </div>

            <div
              className="absolute top-1/2 left-1/2 w-[40px] h-[40px] -ml-[20px] -mt-[20px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 flex items-center justify-center animate-[spin-ccw_38s_linear_infinite] shadow-[0_4px_12px_rgba(234,88,12,0.2)]"
              style={
                {
                  "--r": "265px",
                  animationDelay: "-15.2s",
                } as React.CSSProperties
              }
            >
              <span className="bg-gradient-to-b from-[#ff9933] to-[#ea580c] text-transparent bg-clip-text font-mono text-[11px] tracking-wider font-bold">
                BNS
              </span>
            </div>

            <div
              className="absolute top-1/2 left-1/2 w-[40px] h-[40px] -ml-[20px] -mt-[20px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-white/10 flex items-center justify-center animate-[spin-ccw_38s_linear_infinite] shadow-[0_4px_12px_rgba(234,88,12,0.2)]"
              style={
                {
                  "--r": "265px",
                  animationDelay: "-22.8s",
                } as React.CSSProperties
              }
            >
              <FileText className="w-[18px] h-[18px] text-[#ffb84d]" />
            </div>

            <div
              className="absolute top-1/2 left-1/2 w-[40px] h-[40px] -ml-[20px] -mt-[20px] rounded-full bg-[#1e293b]/70 backdrop-blur-md border border-[#ff9933] flex items-center justify-center animate-[spin-ccw_38s_linear_infinite] shadow-[0_0_15px_rgba(234,88,12,0.4)]"
              style={
                {
                  "--r": "265px",
                  animationDelay: "-30.4s",
                } as React.CSSProperties
              }
            >
              {/* Replaced broken image with Landmark */}
              <Landmark className="w-[18px] h-[18px] text-[#ff9933]" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
