import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { MockFIR } from "../../data/officerMock";
import { FIRCard } from "./FIRCard";

export const UrgencyQueue = ({ items }: { items: MockFIR[] }) => (
  <motion.section
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="p-1"
  >
    <div className="mb-8">
      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase"
        style={{
          background: "linear-gradient(90deg, #F97316 0%, #6B7280 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        — प्राथमिकता · URGENCY QUEUE
      </motion.p>
      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-xs text-[#6B7280] mt-1 transition-colors hover:text-[#F97316]"
      >
        Active FIRs requiring attention, dynamically sorted by severity matrix.
      </motion.p>
    </div>

    <motion.div
      className="grid gap-4 md:grid-cols-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <AnimatePresence mode="popLayout">
        {items.map((f, idx) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: idx * 0.08,
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="h-full"
          >
            <FIRCard fir={f} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + items.length * 0.05 }}
      className="mt-8 flex justify-center"
    >
      <Link
        to="/officer/fir"
        className="text-xs px-6 py-2 rounded-full border border-white/10 font-semibold text-[#9CA3AF] hover:text-[#F97316] hover:bg-[#F97316]/10 hover:border-[#F97316]/30 transition-all duration-300 inline-flex items-center gap-2 group shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
      >
        Access Complete FIR Database
        <span className="group-hover:translate-x-1 transition-transform duration-300">
          →
        </span>
      </Link>
    </motion.div>
  </motion.section>
);
