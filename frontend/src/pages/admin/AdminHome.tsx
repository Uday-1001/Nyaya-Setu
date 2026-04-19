import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { adminService, type AdminDashboardResponse } from '../../services/adminService';
import { Spinner } from '../../components/ui/Spinner';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
};

export const AdminHome = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setError(null);
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const refreshListener = () => {
      void load();
    };

    window.addEventListener('admin:refresh', refreshListener);
    return () => {
      window.removeEventListener('admin:refresh', refreshListener);
    };
  }, []);

  const stats = dashboard?.stats;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner color="#16A34A" />
      </div>
    );
  }

  return (
    <motion.div 
      className="p-8 lg:p-10 max-w-[1480px] text-white"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      <motion.div className="mb-10" variants={itemVariants}>
        <p className="text-[11px] font-bold tracking-[0.22em] text-[#9CA3AF] uppercase mb-2 flex items-center gap-2">
          <span className="w-4 h-px bg-[#9CA3AF] inline-block" />
          Command overview
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3">
          National Operations Center
        </h1>
        <p className="max-w-2xl text-sm text-[#D1D5DB] leading-relaxed">
          Live command dashboard for officer approvals, station coverage, and FIR intake across the platform.
        </p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 text-red-300 text-sm bg-red-900/20 p-4 rounded-xl border border-red-500/20"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="relative mb-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md shadow-2xl"
        variants={itemVariants}
      >
        <div className="absolute inset-x-0 top-0 flex h-[3px]">
          <motion.div initial={{ width: 0 }} animate={{ width: "33.33%" }} transition={{ duration: 1, delay: 0.2 }} className="bg-[#FF9933]" />
          <motion.div initial={{ width: 0 }} animate={{ width: "33.33%" }} transition={{ duration: 1, delay: 0.4 }} className="bg-white" />
          <motion.div initial={{ width: 0 }} animate={{ width: "33.34%" }} transition={{ duration: 1, delay: 0.6 }} className="bg-[#138808]" />
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 px-6 py-8 lg:px-8 lg:py-10">
          {[
            ['Pending officer actions', stats?.pendingOfficerActions ?? '—', '#FF9933'],
            ['Police stations (synced)', stats?.policeStations ?? '—', '#fff'],
            ['FIRs filed (24h)', stats?.firsFiled24h ?? '—', '#16A34A'],
            ['BNS sections live', stats?.bnsSectionsLive ?? '—', '#3B82F6'],
          ].map(([label, value, color], index) => (
            <motion.div 
              key={label}
              whileHover={{ scale: 1.05, y: -4 }}
              className={`text-center lg:px-6 cursor-default ${index > 0 ? 'lg:border-l lg:border-white/[0.08]' : ''}`}
            >
              <div 
                className="text-[46px] lg:text-[56px] font-extrabold leading-none tracking-tight tabular-nums font-mono mb-3"
                style={{ color: typeof color === 'string' ? color : 'white' }}
              >
                {value}
              </div>
              <p className="mt-3 text-[11px] font-bold tracking-[0.18em] text-[#D1D5DB] uppercase max-w-[14rem] mx-auto leading-relaxed">
                {label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10">
        <motion.section 
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md hover:bg-white/[0.03] transition-colors"
          variants={itemVariants}
        >
          <p className="text-[11px] font-bold tracking-[0.22em] text-[#9CA3AF] uppercase mb-5">System status</p>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
              <span className="text-[#9CA3AF] uppercase text-[11px] font-bold tracking-widest">Last sync</span>
              <span className="font-mono text-white">{dashboard?.systemStatus?.lastSync ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
              <span className="text-[#9CA3AF] uppercase text-[11px] font-bold tracking-widest">API gateway</span>
              <span className="rounded-sm bg-[#16A34A]/15 text-[#E5F9EC] text-[11px] font-bold px-2 py-0.5 uppercase tracking-wide border border-[#16A34A]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {dashboard?.systemStatus?.apiGateway ?? 'Nominal'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#9CA3AF] uppercase text-[11px] font-bold tracking-widest">Audit log stream</span>
              <span className="font-mono text-white flex items-center gap-2">
                {dashboard?.systemStatus?.auditLogStream ?? '—'}
                <Spinner size={12} color="#3B82F6" className="inline-flex" />
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section 
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md"
          variants={itemVariants}
        >
          <p className="text-[11px] font-bold tracking-[0.22em] text-[#9CA3AF] uppercase mb-5 flex justify-between items-center">
            Recent officer submissions
            <span className="bg-white/10 px-2 py-0.5 rounded text-[9px]">Live Data</span>
          </p>
          <div className="space-y-3">
            <AnimatePresence>
              {(dashboard?.recentOfficers ?? []).map((officer, idx) => (
                <motion.div 
                  key={officer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  whileHover={{ scale: 1.02, x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-4 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{officer.name}</div>
                      <div className="text-sm text-[#D1D5DB]">
                        {officer.stationName} · {officer.badgeNumber}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#FBBF24] bg-[#FBBF24]/10 px-2 py-1 rounded border border-[#FBBF24]/20">
                      {officer.verificationStatus}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(dashboard?.recentOfficers?.length === 0) && (
              <div className="text-center py-6 text-sm text-[#D1D5DB]">
                No recent officer submissions.
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
};

export default AdminHome;
