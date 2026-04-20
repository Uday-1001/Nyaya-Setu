import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useInView,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  FileText,
  Mic,
  Scale,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Search,
  Globe,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  AlertTriangle,
  PhoneCall,
  BadgeInfo,
  User,
  LogOut,
  LayoutDashboard,
  LocateFixed,
  Route,
  Loader2,
  MapPinned,
  History,
  Trash2,
} from "lucide-react";
import { WatermarkBackground } from "../../components/ui/WatermarkBackground";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authService";
import { firService } from "../../services/firService";
import { platformStatsService } from "../../services/platformStatsService";
import {
  readVictimTheme,
  writeVictimTheme,
} from "../../features/victim/theme/victimTheme";

const ChakraIcon = ({ size = 22 }: { size?: number }) => (
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

/* ══════════════════════════════════════════════════════════════════
   TYPES & MOCK DATA
══════════════════════════════════════════════════════════════════ */
type Urgency = "critical" | "high" | "medium" | "low";
type SMSStatus = "sent" | "failed" | "pending";

interface Case {
  id: string;
  bns: string;
  urgency: Urgency;
  status: string;
  date: string;
}
interface DisplayCase {
  id: string;
  bns: string;
  urgency: Urgency;
  status: string;
  date: string;
  createdAt: string;
}
interface Right {
  title: string;
  basis: string;
  highlight?: boolean;
}
interface Notification {
  id: number;
  status: SMSStatus;
  message: string;
  time: string;
}
interface Action {
  icon: React.ElementType;
  title: string;
  titleHi: string;
  desc: string;
  href: string;
  color: string;
}
interface Stat {
  value: string;
  label: string;
  labelHi: string;
  numericValue: number;
}

type Coords = {
  lat: number;
  lon: number;
};

type NearbyPoliceStation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address: string;
  phone: string | null;
};

const distanceKm = (from: Coords, to: Coords) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const CASES: Case[] = [
  {
    id: "FIR/MH/2024/00123",
    bns: "BNS § 115",
    urgency: "high",
    status: "Under Investigation",
    date: "08 Apr 2024",
  },
  {
    id: "FIR/MH/2024/00089",
    bns: "BNS § 351",
    urgency: "medium",
    status: "FIR Registered",
    date: "02 Apr 2024",
  },
  {
    id: "FIR/MH/2024/00056",
    bns: "BNS § 303",
    urgency: "low",
    status: "Chargesheet Filed",
    date: "28 Mar 2024",
  },
];

const RIGHTS: Right[] = [
  {
    title: "Free FIR copy within 24 hours",
    basis: "BNSS § 173(2)",
    highlight: true,
  },
  { title: "Legal aid & representation", basis: "Legal Services Act, 1987" },
  { title: "Zero FIR at any police station", basis: "BNSS § 173(1)" },
  { title: "Right to know investigation", basis: "BNSS § 193" },
  { title: "Compensation for harm caused", basis: "BNS § 25", highlight: true },
];

const NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    status: "sent",
    message: "FIR/MH/2024/00123 has been registered successfully",
    time: "2h ago",
  },
  {
    id: 2,
    status: "sent",
    message: "SI Kumar has been assigned to your case",
    time: "5h ago",
  },
  {
    id: 3,
    status: "failed",
    message: "SMS delivery failed — retry will happen shortly",
    time: "8h ago",
  },
  {
    id: 4,
    status: "sent",
    message: "Case status updated: Under Investigation",
    time: "1d ago",
  },
  {
    id: 5,
    status: "pending",
    message: "Court date notification pending approval",
    time: "2d ago",
  },
];

const ACTIONS: Action[] = [
  {
    icon: FileText,
    title: "Describe Incident",
    titleHi: "घटना बताएं",
    desc: "AI maps it to the correct BNS section automatically",
    href: "/victim/statement",
    color: "#3B82F6",
  },
  {
    icon: Mic,
    title: "Voice Statement",
    titleHi: "बयान दर्ज करें",
    desc: "Speak freely in your preferred language",
    href: "/victim/statement?tab=voice",
    color: "#10B981",
  },
  {
    icon: Scale,
    title: "Know My Rights",
    titleHi: "अधिकार जानें",
    desc: "BNSS rights, BNS §25 victim compensation details",
    href: "/victim/rights",
    color: "#8B5CF6",
  },
];

const STATS: Stat[] = [
  {
    value: "1,247",
    numericValue: 1247,
    label: "Total FIRs",
    labelHi: "कुल FIR",
  },
  {
    value: "0",
    numericValue: 0,
    label: "BNS Sections",
    labelHi: "BNS धाराएं",
  },
  {
    value: "0",
    numericValue: 0,
    label: "BNSS Sections",
    labelHi: "BNSS धाराएं",
  },
  {
    value: "0",
    numericValue: 0,
    label: "Active Officers",
    labelHi: "सक्रिय अधिकारी",
  },
];

const NAV_LINKS = [
  { label: "Statement Workspace", href: "/victim/statement" },
  { label: "Send to Station", href: "/victim/statement?send=1" },
  { label: "Know Rights", href: "/victim/rights" },
  { label: "My Cases", href: "/victim/tracker" },
];

const VIEWED_FIRS_STORAGE_KEY = "victim_viewed_firs";
const HIDDEN_FIRS_STORAGE_KEY = "victim_hidden_firs";

const deriveUrgency = (status: string): Urgency => {
  const s = status.toLowerCase();
  if (s.includes("investigation") || s.includes("urgent")) return "high";
  if (s.includes("registered") || s.includes("pending")) return "medium";
  if (s.includes("closed") || s.includes("chargesheet")) return "low";
  return "medium";
};

const toDisplayCase = (raw: any): DisplayCase => {
  const createdAtValue =
    raw?.updatedAt ?? raw?.createdAt ?? raw?.registeredAt ?? null;
  const createdAt = createdAtValue
    ? new Date(createdAtValue).toISOString()
    : new Date(0).toISOString();

  const dateLabel = createdAtValue
    ? new Date(createdAtValue).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Date unavailable";

  return {
    id: raw?.firNumber ?? raw?.acknowledgmentNo ?? raw?.id ?? "Unknown FIR",
    bns: raw?.primarySection?.sectionNumber
      ? `BNS § ${raw.primarySection.sectionNumber}`
      : (raw?.bns ?? "BNS § --"),
    urgency: deriveUrgency(String(raw?.status ?? "Pending")),
    status: String(raw?.status ?? "Pending").replace(/_/g, " "),
    date: dateLabel,
    createdAt,
  };
};

/* ══════════════════════════════════════════════════════════════════
   HELPERS & THEME
══════════════════════════════════════════════════════════════════ */
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
};

const getT = (isDark: boolean) => ({
  accent: "#FF9933",
  muted: isDark ? "#5a7090" : "#64748B",
  ultraMuted: isDark ? "#3a5070" : "#94A3B8",
  white: isDark ? "#ffffff" : "#020617",
  bg: isDark ? "#0f0f0f" : "#f8fafc",
  cardBg: isDark
    ? "linear-gradient(160deg, rgba(8,8,8,0.9) 0%, rgba(13,13,13,0.9) 60%, rgba(17,17,17,0.9) 100%)"
    : "#ffffff",
  caseBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
  cardBdr: isDark
    ? "1px solid rgba(255,255,255,0.1)"
    : "1px solid rgba(0,0,0,0.08)",
  divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
  iconBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
  label: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.25em",
    color: isDark ? "#5a7090" : "#64748B",
    textTransform: "uppercase" as const,
  },
  sectionHd: {
    fontSize: 24,
    fontWeight: 800,
    color: isDark ? "#fff" : "#0f172a",
  },
});

/* ══════════════════════════════════════════════════════════════════
   COMPONENTS
══════════════════════════════════════════════════════════════════ */

/** Animated Counter component */
const Counter = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);
  const nodeRef = useRef(null);
  const inView = useInView(nodeRef, { once: true });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const end = value;
      if (start === end) return;
      const duration = 2000;
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setCount(Math.floor(progress * (end - start) + start));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [inView, value]);

  return <span ref={nodeRef}>{count.toLocaleString()}</span>;
};

/** High-performance Parallax Card */
const ParallaxCard = ({ children, style, className }: any) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth the raw motion values for elegant spring-physics rotation
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

  return (
    <motion.div
      style={{
        ...style,
        rotateX,
        rotateY,
        zIndex: 1,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        // Calculate normalized position -0.5 to 0.5
        const normX = (event.clientX - rect.left) / rect.width - 0.5;
        const normY = (event.clientY - rect.top) / rect.height - 0.5;
        x.set(normX);
        y.set(normY);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={className}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div style={{ transform: "translateZ(30px)" }}>{children}</div>
    </motion.div>
  );
};

/* ── Animation Variants ─────────────────────────────────────────── */
const containerBase: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const slideUpItem: any = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

const slideRightItem: any = {
  hidden: { opacity: 0, x: -30, filter: "blur(10px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

/* ══════════════════════════════════════════════════════════════════
   LANDING HOME
══════════════════════════════════════════════════════════════════ */
export const LandingHome = () => {
  const user = useAuthStore((s) => s.user);
  const storeOut = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobile] = useState(false);
  const [isDark, setIsDark] = useState(() => readVictimTheme());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stat[]>(STATS);
  const [recentCases, setRecentCases] = useState<DisplayCase[]>([]);
  const [allCases, setAllCases] = useState<DisplayCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [viewedHistoryIds, setViewedHistoryIds] = useState<string[]>([]);
  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<string[]>([]);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyPoliceStation[]>(
    [],
  );
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.style.background = isDark ? "#0f0f0f" : "#f8fafc";
    writeVictimTheme(isDark);
    return () => {
      document.body.style.background = "";
    };
  }, [isDark]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        showNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }

      if (
        showProfileMenu &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications, showProfileMenu]);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const T = getT(isDark);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEWED_FIRS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setViewedHistoryIds(parsed.filter((v) => typeof v === "string"));
      }
    } catch {
      setViewedHistoryIds([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_FIRS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setHiddenHistoryIds(parsed.filter((v) => typeof v === "string"));
      }
    } catch {
      setHiddenHistoryIds([]);
    }
  }, []);

  useEffect(() => {
    const loadCases = async () => {
      setCasesLoading(true);
      setCasesError(null);
      try {
        const payload = await firService.listVictimCases();
        const normalized = Array.isArray(payload)
          ? payload.map(toDisplayCase)
          : [];

        normalized.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        setAllCases(normalized);
        setRecentCases(normalized.slice(0, 3));
      } catch (err) {
        setCasesError(
          err instanceof Error ? err.message : "Unable to load recent FIRs.",
        );
      } finally {
        setCasesLoading(false);
      }
    };

    void loadCases();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const data = await platformStatsService.getPublicStats();
        if (!mounted) return;

        setStats((prev) => [
          {
            ...prev[0],
            value: data.totalFirs.toLocaleString("en-IN"),
            numericValue: data.totalFirs,
          },
          {
            ...prev[1],
            value: data.bnsSections.toLocaleString("en-IN"),
            numericValue: data.bnsSections,
          },
          {
            ...prev[2],
            value: data.bnssSections.toLocaleString("en-IN"),
            numericValue: data.bnssSections,
          },
          {
            ...prev[3],
            value: data.activeOfficers.toLocaleString("en-IN"),
            numericValue: data.activeOfficers,
          },
        ]);
      } catch {
        // Keep fallback values if stats endpoint is unavailable.
      }
    };

    void loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const markCaseAsViewed = (firId: string) => {
    setViewedHistoryIds((prev) => {
      const updated = [firId, ...prev.filter((id) => id !== firId)].slice(
        0,
        100,
      );
      localStorage.setItem(VIEWED_FIRS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearViewedHistory = () => {
    const source = allCases.length > 0 ? allCases : CASES;
    const idsToHide = source.map((item) => item.id);

    localStorage.removeItem(VIEWED_FIRS_STORAGE_KEY);
    setViewedHistoryIds([]);

    localStorage.setItem(HIDDEN_FIRS_STORAGE_KEY, JSON.stringify(idsToHide));
    setHiddenHistoryIds(idsToHide);
    setHistoryNotice("History cleared successfully.");
  };

  const historyCases = (allCases.length > 0 ? allCases : CASES).filter(
    (item) => !hiddenHistoryIds.includes(item.id),
  );

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      /* swallow */
    }
    storeOut();
    navigate("/login", { replace: true });
  };

  const getCurrentCoords = () =>
    new Promise<Coords>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location access is not available on this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }),
        () =>
          reject(
            new Error(
              "Could not access your location. Please enable location permissions.",
            ),
          ),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });

  const fetchNearbyStations = async (coords: Coords) => {
    const query = `[out:json][timeout:25];(node["amenity"="police"](around:10000,${coords.lat},${coords.lon});way["amenity"="police"](around:10000,${coords.lat},${coords.lon});relation["amenity"="police"](around:10000,${coords.lat},${coords.lon}););out center 25;`;
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error("Could not fetch nearby police stations right now.");
    }

    const payload = (await response.json()) as {
      elements?: Array<{
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const seen = new Set<string>();
    return (payload.elements ?? [])
      .map((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        if (typeof lat !== "number" || typeof lon !== "number") return null;

        const tags = element.tags ?? {};
        const name = tags.name || tags["name:en"] || "Police Station";
        const address = [
          tags["addr:street"],
          tags["addr:suburb"],
          tags["addr:city"],
          tags["addr:state"],
        ]
          .filter(Boolean)
          .join(", ");

        const station: NearbyPoliceStation = {
          id: String(element.id),
          name,
          lat,
          lon,
          distanceKm: distanceKm(coords, { lat, lon }),
          address: address || "Address unavailable",
          phone: tags.phone || tags["contact:phone"] || null,
        };

        const key = `${station.name}-${station.lat.toFixed(4)}-${station.lon.toFixed(4)}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return station;
      })
      .filter((station): station is NearbyPoliceStation => Boolean(station))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  };

  const refreshNearbyStations = async () => {
    setSosError(null);
    setSosLoading(true);
    try {
      const coords = await getCurrentCoords();
      setUserCoords(coords);
      const stations = await fetchNearbyStations(coords);
      setNearbyStations(stations);
      setSelectedStationId(stations[0]?.id ?? null);
      if (!stations.length) {
        setSosError(
          "No nearby police stations found for your location. Try refreshing in a moment.",
        );
      }
    } catch (error) {
      setNearbyStations([]);
      setSelectedStationId(null);
      setSosError(
        error instanceof Error
          ? error.message
          : "Could not load nearby police stations.",
      );
    } finally {
      setSosLoading(false);
    }
  };
  const openRoute = (station: NearbyPoliceStation) => {
    const origin = userCoords
      ? `${userCoords.lat},${userCoords.lon}`
      : undefined;
    const destination = `${station.lat},${station.lon}`;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSOSClick = () => {
    setSosOpen(true);
    void refreshNearbyStations();
  };

  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        color: T.white,
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <WatermarkBackground isDark={isDark} />

      {/* Floating SOS Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring" }}
        whileHover={{
          scale: 1.1,
          boxShadow: "0px 0px 30px rgba(239,68,68,0.8)",
        }}
        whileTap={{ scale: 0.9 }}
        onClick={handleSOSClick}
        style={{
          position: "fixed",
          bottom: 30,
          right: 30,
          zIndex: 1000,
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          color: "white",
          border: "4px solid rgba(255,255,255,0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 25px rgba(239, 68, 68, 0.4)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <PhoneCall size={24} />
        </motion.div>
        <span style={{ fontSize: 10, fontWeight: 900, marginTop: 2 }}>SOS</span>
      </motion.button>

      <AnimatePresence>
        {sosOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background: "rgba(2, 6, 23, 0.72)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setSosOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 170, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(920px, 100%)",
                maxHeight: "88vh",
                overflow: "auto",
                borderRadius: 20,
                border: "1px solid rgba(248, 113, 113, 0.35)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(3,7,18,0.98))",
                boxShadow: "0 28px 70px rgba(0, 0, 0, 0.6)",
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.12em",
                      fontWeight: 800,
                      color: "#f87171",
                      textTransform: "uppercase",
                    }}
                  >
                    Emergency Station Finder
                  </div>
                  <h3
                    style={{
                      margin: "8px 0 6px",
                      fontSize: 28,
                      fontWeight: 900,
                      color: "#fee2e2",
                    }}
                  >
                    Nearest Police Stations
                  </h3>
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.6 }}>
                    Select a station and open Google Maps to get instant driving
                    route and details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSosOpen(false)}
                  style={{
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    background: "rgba(248, 113, 113, 0.12)",
                    color: "#fecaca",
                    borderRadius: 10,
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Close
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => void refreshNearbyStations()}
                  disabled={sosLoading}
                  style={{
                    background: "linear-gradient(135deg, #f97316, #dc2626)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: sosLoading ? "not-allowed" : "pointer",
                    opacity: sosLoading ? 0.75 : 1,
                  }}
                >
                  {sosLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LocateFixed size={15} />
                  )}
                  {sosLoading ? "Finding Stations..." : "Use My Location"}
                </button>

                {userCoords && (
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.12)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#bae6fd",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <MapPinned
                      size={14}
                      style={{ marginRight: 6, verticalAlign: "text-bottom" }}
                    />
                    {userCoords.lat.toFixed(4)}, {userCoords.lon.toFixed(4)}
                  </div>
                )}
              </div>

              {sosError && (
                <div
                  style={{
                    marginBottom: 14,
                    background: "rgba(248, 113, 113, 0.12)",
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    color: "#fecaca",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                  }}
                >
                  {sosError}
                </div>
              )}

              {nearbyStations.length > 0 &&
                nearbyStations.every(
                  (station) => station.address === "Address unavailable",
                ) && (
                  <div
                    style={{
                      marginBottom: 10,
                      color: "#cbd5e1",
                      fontSize: 12,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Address details not available. Showing closest stations.
                  </div>
                )}

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns:
                    nearbyStations.length > 0 &&
                    nearbyStations.every(
                      (station) => station.address === "Address unavailable",
                    )
                      ? "repeat(auto-fit, minmax(250px, 1fr))"
                      : "1fr",
                }}
              >
                {(nearbyStations.length > 0 &&
                nearbyStations.every(
                  (station) => station.address === "Address unavailable",
                )
                  ? nearbyStations.slice(0, 4)
                  : nearbyStations
                ).map((station, idx) => {
                  const selected = selectedStationId === station.id;
                  const compactCard = station.address === "Address unavailable";
                  const flipped = hoveredStationId === station.id;
                  return (
                    <motion.div
                      key={station.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={
                        selected
                          ? {
                              y: -3,
                              scale: 1.015,
                              boxShadow:
                                "0 0 0 2px rgba(251,146,60,0.28), 0 18px 32px rgba(15,23,42,0.45)",
                            }
                          : {
                              y: -2,
                              scale: 1.01,
                              boxShadow: "0 16px 28px rgba(15,23,42,0.35)",
                            }
                      }
                      whileTap={{ scale: 0.995 }}
                      onMouseEnter={() => {
                        setHoveredStationId(station.id);
                        setSelectedStationId(station.id);
                      }}
                      onMouseLeave={() =>
                        setHoveredStationId((prev) =>
                          prev === station.id ? null : prev,
                        )
                      }
                      onClick={() => setSelectedStationId(station.id)}
                      transition={{ delay: idx * 0.04 }}
                      style={{
                        borderRadius: 14,
                        perspective: 1200,
                        minHeight: compactCard ? 132 : 156,
                        cursor: "pointer",
                      }}
                    >
                      <motion.div
                        animate={{ rotateY: flipped ? 180 : 0 }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 14,
                            padding: compactCard ? 12 : 14,
                            border: selected
                              ? "1px solid rgba(251, 146, 60, 0.7)"
                              : "1px solid rgba(148, 163, 184, 0.25)",
                            background: selected
                              ? "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(30,58,138,0.22))"
                              : "rgba(15, 23, 42, 0.6)",
                            backfaceVisibility: "hidden",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 6px",
                              fontSize: compactCard ? 16 : 18,
                              color: "#f8fafc",
                            }}
                          >
                            {station.name}
                          </h4>
                          {!compactCard && (
                            <p
                              style={{
                                margin: "0 0 6px",
                                color: "#cbd5e1",
                                fontSize: 14,
                              }}
                            >
                              {station.address}
                            </p>
                          )}
                          <p
                            style={{
                              margin: 0,
                              color: "#94a3b8",
                              fontSize: 12,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              fontWeight: 700,
                            }}
                          >
                            Hover to view route details
                          </p>
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 14,
                            padding: compactCard ? 12 : 14,
                            border: selected
                              ? "1px solid rgba(251, 146, 60, 0.7)"
                              : "1px solid rgba(148, 163, 184, 0.25)",
                            background: selected
                              ? "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(30,58,138,0.22))"
                              : "rgba(15, 23, 42, 0.7)",
                            transform: "rotateY(180deg)",
                            backfaceVisibility: "hidden",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                margin: 0,
                                color: "#e2e8f0",
                                fontSize: 15,
                                fontWeight: 800,
                              }}
                            >
                              {station.distanceKm.toFixed(2)} km away
                            </p>
                            {station.phone && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  color: "#94a3b8",
                                  fontSize: 12,
                                }}
                              >
                                Phone: {station.phone}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedStationId(station.id);
                              openRoute(station);
                            }}
                            style={{
                              border: "none",
                              background:
                                "linear-gradient(135deg, #22c55e, #16a34a)",
                              color: "#fff",
                              borderRadius: 10,
                              padding: "8px 11px",
                              fontWeight: 800,
                              fontSize: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              cursor: "pointer",
                            }}
                          >
                            <Route size={13} /> Route on Maps
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>

              {!sosLoading && !nearbyStations.length && !sosError && (
                <div style={{ marginTop: 12, color: "#cbd5e1", fontSize: 14 }}>
                  Tap "Use My Location" to find nearby police stations.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <nav
          style={{
            borderBottom: T.divider,
            background: isDark ? "rgba(15,15,15,0.8)" : "rgba(248,250,252,0.8)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "0 24px",
              height: 64,
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            {/* Logo */}
            <Link
              to="/victim"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: T.white,
                flexShrink: 0,
                marginRight: 40,
              }}
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                style={{ color: "#f59e0b" }}
              >
                <ChakraIcon size={24} />
              </motion.div>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "-0.02em",
                  color: T.white,
                }}
              >
                NyayaSetu
              </span>
            </Link>

            {/* Nav links — desktop */}
            <div
              className="hidden md:flex"
              style={{ gap: 4, flex: 1, justifyContent: "center" }}
            >
              {NAV_LINKS.map(({ label, href }) => {
                const active = location.pathname === href.split("?")[0];
                return (
                  <Link
                    key={label}
                    to={href}
                    style={{ position: "relative", textDecoration: "none" }}
                  >
                    <motion.div
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                      style={{
                        fontSize: 14,
                        fontWeight: active ? 700 : 500,
                        color: active ? T.white : T.muted,
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: active ? T.iconBg : "transparent",
                      }}
                    >
                      {label}
                      {active && (
                        <motion.div
                          layoutId="nav-pill"
                          style={{
                            position: "absolute",
                            bottom: -12,
                            left: "20%",
                            right: "20%",
                            height: 3,
                            background: T.accent,
                            borderRadius: "4px 4px 0 0",
                          }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Right controls */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div ref={notificationsRef} style={{ position: "relative" }}>
                <motion.button
                  onClick={() => setShowNotifications(!showNotifications)}
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                  }}
                >
                  <Bell size={20} style={{ color: T.muted }} />
                  <motion.span
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 8,
                      width: 8,
                      height: 8,
                      background: "#ef4444",
                      borderRadius: "50%",
                      border: `1.5px solid ${T.bg}`,
                    }}
                  />
                </motion.button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: "absolute",
                        top: 45,
                        right: 0,
                        width: 320,
                        background: T.cardBg,
                        border: T.cardBdr,
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                        zIndex: 500,
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: 14,
                          borderBottom: T.divider,
                          paddingBottom: 8,
                        }}
                      >
                        Notifications
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          maxHeight: 300,
                          overflowY: "auto",
                        }}
                      >
                        {NOTIFICATIONS.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ marginTop: 2 }}>
                              {n.status === "sent" && (
                                <CheckCircle2 size={14} color="#10b981" />
                              )}
                              {n.status === "failed" && (
                                <AlertTriangle size={14} color="#ef4444" />
                              )}
                              {n.status === "pending" && (
                                <span
                                  style={{
                                    display: "block",
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: "#f59e0b",
                                    margin: 3,
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  lineHeight: 1.4,
                                  color: T.white,
                                }}
                              >
                                {n.message}
                              </p>
                              <span
                                style={{ fontSize: 10, color: T.ultraMuted }}
                              >
                                {n.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, rotate: -90 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDark(!isDark)}
                style={{
                  color: T.muted,
                  padding: "8px",
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              <div ref={profileMenuRef} style={{ position: "relative" }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #FF9933, #dc2626)",
                    border: `none`,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(user?.name?.[0] ?? "U").toUpperCase()}
                </motion.button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: "absolute",
                        top: 45,
                        right: 0,
                        width: 220,
                        background: T.cardBg,
                        border: T.cardBdr,
                        borderRadius: 12,
                        padding: 8,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                        zIndex: 500,
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          borderBottom: T.divider,
                          marginBottom: 8,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: 14,
                            color: T.white,
                          }}
                        >
                          {user?.name || "Victim Portal"}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: T.muted,
                          }}
                        >
                          {user?.email || "+91 XXXX XXXX"}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <Link
                          to="/victim/profile"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            color: T.white,
                            textDecoration: "none",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          <User size={16} /> My Profile
                        </Link>
                        <Link
                          to="/victim/tracker"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            color: T.white,
                            textDecoration: "none",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          <LayoutDashboard size={16} /> My Cases
                        </Link>
                        <button
                          onClick={handleLogout}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            color: "#ef4444",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                            width: "100%",
                            textAlign: "left",
                          }}
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </nav>

        {/* ══ PAGE CONTENT ═════════════════════════════════════════ */}
        <motion.main
          variants={containerBase}
          initial="hidden"
          animate="show"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px 96px",
            position: "relative",
            width: "100%",
          }}
        >
          {/* SECTION 1 — Greeting & Intro */}
          <motion.section
            variants={slideUpItem}
            style={{
              paddingTop: 80,
              paddingBottom: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              style={{
                ...T.label,
                color: "#FF9933",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,153,51,0.1)",
                padding: "6px 16px",
                borderRadius: 20,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FF9933",
                }}
              ></div>
              स्वागत है &nbsp;·&nbsp; WELCOME TO NYAYA SETU
            </motion.div>

            <h1
              style={{
                marginTop: 24,
                marginBottom: 0,
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: T.white,
                lineHeight: 1.1,
              }}
            >
              {getGreeting()},{" "}
              <span style={{ color: T.accent }}>{firstName}</span>
            </h1>
            <p
              style={{
                marginTop: 16,
                fontSize: "clamp(16px, 2vw, 20px)",
                color: T.muted,
                lineHeight: 1.6,
                maxWidth: 600,
              }}
            >
              Your comprehensive hub for FIR generation, legal rights awareness,
              and real-time case tracking.
            </p>
          </motion.section>

          {/* SECTION 2 — Features Grid */}
          <motion.section variants={slideUpItem} style={{ paddingBottom: 60 }}>
            <div style={{ ...T.label, marginBottom: 24, fontSize: 12 }}>
              What do you need help with today?
            </div>
            <div
              className="grid grid-cols-1 md:grid-cols-3"
              style={{ gap: 20 }}
            >
              {ACTIONS.map(
                ({ icon: Icon, title, titleHi, desc, href, color }, i) => (
                  <Link
                    key={title}
                    to={href}
                    style={{
                      textDecoration: "none",
                      display: "block",
                      perspective: 1000,
                    }}
                  >
                    <ParallaxCard
                      style={{
                        background: isDark
                          ? "linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.95))"
                          : "#fff",
                        border: T.cardBdr,
                        borderRadius: 20,
                        padding: "32px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        height: "100%",
                        cursor: "pointer",
                        borderTop: `4px solid ${color}`,
                        boxShadow: isDark
                          ? "0 20px 40px rgba(0,0,0,0.4)"
                          : "0 10px 30px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 12,
                          background: `${color}22`,
                          color: color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={26} strokeWidth={2} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: T.white,
                            lineHeight: 1.2,
                          }}
                        >
                          {title}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.ultraMuted,
                            marginTop: 4,
                            fontWeight: 600,
                          }}
                        >
                          {titleHi}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          color: T.muted,
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {desc}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: color,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        Start <ArrowRight size={16} />
                      </div>
                    </ParallaxCard>
                  </Link>
                ),
              )}
            </div>
          </motion.section>

          {/* TWO COLUMN LAYOUT: MY CASES & RIGHTS */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: 40, paddingBottom: 80 }}
          >
            {/* LEFT: MY CASES */}
            <motion.section
              variants={slideRightItem}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ ...T.sectionHd }}>My Cases Tracking</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryNotice(null);
                      setHistoryOpen(true);
                    }}
                    style={{
                      fontSize: 12,
                      color: "#93c5fd",
                      fontWeight: 700,
                      border: "1px solid rgba(148,163,184,0.3)",
                      background: "rgba(15,23,42,0.55)",
                      borderRadius: 999,
                      padding: "6px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <History size={13} /> History
                  </button>
                  <Link
                    to="/victim/tracker"
                    style={{
                      fontSize: 12,
                      color: T.accent,
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    View All <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
              {casesError && (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)",
                    color: "#fca5a5",
                    fontSize: 12,
                    padding: "8px 10px",
                  }}
                >
                  {casesError}
                </div>
              )}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {(recentCases.length > 0 ? recentCases : CASES).map((c) => (
                  <motion.div
                    key={c.id}
                    whileHover={{ scale: 1.02, x: 5 }}
                    style={{
                      background: T.caseBg,
                      border: T.cardBdr,
                      borderRadius: 16,
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: T.white,
                          letterSpacing: 0.5,
                        }}
                      >
                        {c.id}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: T.muted,
                          marginTop: 4,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            background: T.iconBg,
                            borderRadius: 4,
                          }}
                        >
                          {c.bns}
                        </span>
                        <span>•</span>
                        <span>{c.date}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background:
                            c.urgency === "high"
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(59,130,246,0.15)",
                          color: c.urgency === "high" ? "#ef4444" : "#3b82f6",
                          textTransform: "uppercase",
                        }}
                      >
                        {c.status}
                      </span>
                      <Link
                        to="/victim/tracker"
                        onClick={() => markCaseAsViewed(c.id)}
                        style={{
                          fontSize: 11,
                          color: T.accent,
                          textDecoration: "none",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Track <ChevronRight size={12} />
                      </Link>
                    </div>
                  </motion.div>
                ))}

                {casesLoading && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: T.cardBdr,
                      background: T.caseBg,
                      color: T.muted,
                      padding: "14px 16px",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Loader2 size={14} className="animate-spin" /> Loading
                    recent FIRs...
                  </div>
                )}

                {!casesLoading && allCases.length === 0 && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: T.cardBdr,
                      background: T.caseBg,
                      color: T.muted,
                      padding: "14px 16px",
                      fontSize: 13,
                    }}
                  >
                    No FIRs found yet. Once you file one, your latest cases will
                    appear here.
                  </div>
                )}
              </div>
            </motion.section>

            {/* RIGHT: LEGAL RIGHTS */}
            <motion.section
              variants={slideUpItem}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ ...T.sectionHd }}>Know Your Legal Rights</div>
                <BadgeInfo size={20} color={T.accent} />
              </div>
              <div
                style={{
                  background: T.caseBg,
                  border: T.cardBdr,
                  borderRadius: 16,
                  padding: "10px 0",
                  overflow: "hidden",
                }}
              >
                {RIGHTS.map((r, i) => (
                  <motion.div
                    whileHover={{ background: "rgba(255,255,255,0.05)" }}
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 20px",
                      borderBottom: i < RIGHTS.length - 1 ? T.divider : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: r.highlight ? `${T.accent}22` : T.iconBg,
                        color: r.highlight ? T.accent : T.muted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: r.highlight ? T.accent : T.white,
                        }}
                      >
                        {r.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: T.ultraMuted,
                          marginTop: 2,
                          fontFamily: "monospace",
                        }}
                      >
                        {r.basis}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>

          {/* SECTION 4 — Animated Stats Banner */}
          <motion.section variants={slideUpItem} style={{ paddingBottom: 80 }}>
            <div
              style={{
                background:
                  "linear-gradient(90deg, rgba(239,68,68,0.05), rgba(249,115,22,0.05))",
                borderRadius: 24,
                border: `1px solid rgba(249,115,22,0.2)`,
                padding: "40px 20px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-around",
                alignItems: "center",
              }}
            >
              {stats.map(({ numericValue, label, labelHi }, idx) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -5 }}
                  style={{
                    flex: "1 1 200px",
                    textAlign: "center",
                    padding: "10px 0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(36px, 4.5vw, 48px)",
                      fontWeight: 900,
                      color: T.accent,
                      lineHeight: 1,
                    }}
                  >
                    <Counter value={numericValue} />+
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      color: T.white,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{ fontSize: 12, color: T.ultraMuted, marginTop: 2 }}
                  >
                    {labelHi}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </motion.main>

        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1400,
                background: "rgba(2,6,23,0.75)",
                backdropFilter: "blur(4px)",
                display: "grid",
                placeItems: "center",
                padding: 16,
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(820px, 96vw)",
                  maxHeight: "80vh",
                  overflow: "hidden",
                  borderRadius: 18,
                  border: T.cardBdr,
                  background: isDark
                    ? "linear-gradient(160deg, rgba(8,8,8,0.95), rgba(12,12,12,0.95))"
                    : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "16px 18px",
                    borderBottom: `1px solid ${T.divider}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: T.white,
                      }}
                    >
                      FIR History
                    </h3>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        color: T.muted,
                      }}
                    >
                      Every FIR is listed here. Clear History removes local
                      history from this device only.
                    </p>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      type="button"
                      onClick={clearViewedHistory}
                      disabled={historyCases.length === 0}
                      style={{
                        borderRadius: 10,
                        border: "1px solid rgba(248,113,113,0.35)",
                        background: "rgba(239,68,68,0.1)",
                        color: "#fca5a5",
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                        cursor:
                          historyCases.length === 0 ? "not-allowed" : "pointer",
                        opacity: historyCases.length === 0 ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={14} /> Clear History
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${T.divider}`,
                        background: "transparent",
                        color: T.white,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    overflowY: "auto",
                    padding: 14,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {historyNotice && (
                    <div
                      style={{
                        borderRadius: 10,
                        border: "1px solid rgba(34,197,94,0.35)",
                        background: "rgba(34,197,94,0.12)",
                        color: "#86efac",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "8px 10px",
                      }}
                    >
                      {historyNotice}
                    </div>
                  )}

                  {historyCases.map((c) => {
                    const isViewed = viewedHistoryIds.includes(c.id);

                    return (
                      <div
                        key={`history-${c.id}`}
                        style={{
                          borderRadius: 14,
                          border: T.cardBdr,
                          background: T.caseBg,
                          padding: "12px 14px",
                          display: "grid",
                          gridTemplateColumns: "minmax(0,1fr) auto",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: T.white,
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            {c.id}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: T.muted,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                borderRadius: 6,
                                background: T.iconBg,
                                padding: "2px 8px",
                                color: T.ultraMuted,
                              }}
                            >
                              {c.bns}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <CalendarDays size={12} /> {c.date}
                            </span>
                            {isViewed && (
                              <span
                                style={{
                                  borderRadius: 999,
                                  background: "rgba(56,189,248,0.15)",
                                  color: "#7dd3fc",
                                  padding: "2px 8px",
                                  fontWeight: 700,
                                }}
                              >
                                Viewed
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "5px 10px",
                            borderRadius: 999,
                            textTransform: "uppercase",
                            background:
                              c.urgency === "high"
                                ? "rgba(239,68,68,0.15)"
                                : c.urgency === "medium"
                                  ? "rgba(59,130,246,0.15)"
                                  : "rgba(16,185,129,0.15)",
                            color:
                              c.urgency === "high"
                                ? "#ef4444"
                                : c.urgency === "medium"
                                  ? "#60a5fa"
                                  : "#34d399",
                          }}
                        >
                          {c.status}
                        </span>
                      </div>
                    );
                  })}

                  {historyCases.length === 0 && (
                    <div
                      style={{
                        borderRadius: 14,
                        border: T.cardBdr,
                        background: T.caseBg,
                        color: T.muted,
                        padding: "18px 16px",
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      History is empty now. New FIR activity will appear here.
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ FOOTER ═══════════════════════════════════════════════ */}
        <footer
          style={{
            borderTop: T.divider,
            padding: "24px",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span
              style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}
            >
              © {new Date().getFullYear()} NyayaSetu · Ministry of Home Affairs,
              Govt. of India · NIC
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: T.accent,
                letterSpacing: "0.2em",
              }}
            >
              सत्यमेव जयते
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingHome;
