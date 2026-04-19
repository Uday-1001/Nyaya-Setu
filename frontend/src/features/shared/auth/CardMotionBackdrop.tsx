import { motion } from "framer-motion";

export const CardMotionBackdrop = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute -top-16 -left-16 h-44 w-44 rounded-full blur-3xl"
        style={{ background: "rgba(234, 88, 12, 0.18)" }}
        animate={{ x: [0, 28, 0], y: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -bottom-24 -right-14 h-52 w-52 rounded-full blur-3xl"
        style={{ background: "rgba(16, 185, 129, 0.14)" }}
        animate={{
          x: [0, -22, 0],
          y: [0, -26, 0],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-1/3 -left-1/2 h-px w-[180%]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,153,51,0.22) 45%, rgba(255,153,51,0.1) 55%, transparent 100%)",
        }}
        animate={{ x: ["0%", "28%", "0%"], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default CardMotionBackdrop;
