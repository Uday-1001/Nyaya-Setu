import { motion } from "framer-motion";

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
  fullScreen?: boolean;
}

export const Spinner = ({ 
  size = 40, 
  color = "#FF9933", 
  className = "", 
  fullScreen = false 
}: SpinnerProps) => {
  const spinTransition = {
    repeat: Infinity,
    ease: "linear",
    duration: 1
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}40`,
          borderTop: `3px solid ${color}`,
          borderRadius: "50%",
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: "linear" as const, duration: 1 }}
      />
      {fullScreen && <p className="text-slate-500 text-sm font-medium animate-pulse">Loading…</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 min-h-screen bg-[#12100E]/90 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};