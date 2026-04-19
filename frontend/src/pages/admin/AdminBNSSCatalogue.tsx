import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search,
  BookOpen,
  AlertOctagon,
  Scale,
  ShieldCheck,
  Database,
} from "lucide-react";
import {
  adminService,
  type AdminBnssSection,
} from "../../services/adminService";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } },
};

const getSectionGist = (section: AdminBnssSection) => {
  const description = section.description?.replace(/\s+/g, " ").trim() ?? "";
  const title = section.sectionTitle?.replace(/\s+/g, " ").trim() ?? "";

  const titleForSentence = title
    ? title.charAt(0).toLowerCase() + title.slice(1)
    : "this procedural section";

  if (!description) {
    return `This section explains ${titleForSentence}.`;
  }

  if (description.length > 170) {
    return `${description.slice(0, 167)}...`;
  }

  return description;
};

export const AdminBNSSCatalogue = () => {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminBnssSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const rows = await adminService.listBnss();
        if (!active) return;
        setData(rows);
      } catch {
        if (!active) return;
        setIsError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredData = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter(
      (sec) =>
        sec.sectionNumber.toLowerCase().includes(q) ||
        sec.sectionTitle.toLowerCase().includes(q) ||
        (sec.crpcEquivalent ?? "").toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <motion.div
      className="p-8 lg:p-10 max-w-[1480px] text-white"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      <motion.div
        className="mb-10 w-full flex flex-col md:flex-row md:items-start justify-between gap-6"
        variants={itemVariants}
      >
        <div>
          <p className="text-[11px] font-bold tracking-[0.22em] text-[#9CA3AF] uppercase mb-2 flex items-center gap-2">
            <span className="w-4 h-px bg-[#3B82F6] inline-block" />
            Machine Learning Reference
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3 flex items-center gap-4">
            <BookOpen className="w-9 h-9 text-[#3B82F6]" strokeWidth={2.5} />
            Global BNSS Catalogue
          </h1>
          <p className="max-w-2xl text-sm text-[#D1D5DB] leading-relaxed">
            Live index of the {data.length} BNSS sections mapped against CRPC
            from your trained CRPC-BNSS pipeline.
          </p>
        </div>

        <div className="flex bg-[#0b0b0b] border border-white/[0.08] p-4 rounded-xl items-center gap-4 min-w-[280px]">
          <Database
            className="w-8 h-8 text-[#16A34A] opacity-80"
            strokeWidth={1.5}
          />
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-white">
              {data.length}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Synced Sections
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8 relative max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by BNSS Number, Title, or CrPC equivalent..."
          className="block w-full pl-12 pr-4 py-4 bg-[#0b0b0b] border border-white/[0.12] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all text-sm"
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 flex h-[2px]">
          <div className="flex-1 bg-[#3B82F6]" />
        </div>

        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#0b0b0b] border-b border-white/[0.08]">
              <tr>
                <th className="px-6 py-5 font-bold tracking-widest text-[10px] uppercase text-[#9CA3AF]">
                  BNSS Sec.
                </th>
                <th className="px-6 py-5 font-bold tracking-widest text-[10px] uppercase text-[#9CA3AF]">
                  Section Gist
                </th>
                <th className="px-6 py-5 font-bold tracking-widest text-[10px] uppercase text-[#9CA3AF]">
                  CrPC Eqv.
                </th>
                <th className="px-6 py-5 font-bold tracking-widest text-[10px] uppercase text-[#9CA3AF]">
                  Characteristics
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence>
                {filteredData.map((sec) => (
                  <motion.tr
                    key={sec.sectionNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-5 align-top whitespace-nowrap">
                      <span className="font-mono text-lg font-bold text-white tracking-widest">
                        §{sec.sectionNumber}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top max-w-[380px]">
                      <div className="text-sm text-[#E5E7EB] leading-relaxed max-w-[360px]">
                        {getSectionGist(sec)}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top whitespace-nowrap">
                      {sec.crpcEquivalent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-mono font-medium text-gray-300">
                          <Scale className="w-3 h-3 text-[#FF9933] opacity-80" />
                          Old CrPC {sec.crpcEquivalent}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 font-mono italic">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-wrap gap-2">
                        {sec.isCognizable ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                            <AlertOctagon className="w-3 h-3" />
                            Cognizable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                            <ShieldCheck className="w-3 h-3" />
                            Non-Cognizable
                          </span>
                        )}
                        {sec.isBailable ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                            Bailable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">
                            Non-Bailable
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {isLoading && (
            <div className="text-center py-24 text-sm text-gray-400">
              Loading BNSS catalogue...
            </div>
          )}

          {isError && !isLoading && (
            <div className="text-center py-24 text-sm text-red-300">
              Unable to load BNSS catalogue. Ensure backend and ml-service are
              running.
            </div>
          )}

          {!isLoading && !isError && filteredData.length === 0 && (
            <div className="text-center py-24">
              <BookOpen
                className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50"
                strokeWidth={1}
              />
              <div className="text-lg font-semibold text-gray-400 mb-1">
                No mappings found
              </div>
              <p className="text-sm text-gray-600">
                Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminBNSSCatalogue;
