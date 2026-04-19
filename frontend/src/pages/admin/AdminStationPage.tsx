import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { adminService } from "../../services/adminService";

type Station = {
  id: string;
  name: string;
  stationCode: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  email?: string | null;
  jurisdictionArea?: string | null;
  isActive?: boolean;
};

type StationForm = {
  name: string;
  stationCode: string;
  district: string;
  state: string;
  address: string;
  pincode: string;
  phone: string;
};

const emptyForm: StationForm = {
  name: "",
  stationCode: "",
  district: "",
  state: "",
  address: "",
  pincode: "",
  phone: "",
};

const extractErrorMessage = (err: unknown, fallback: string) => {
  const apiMessage =
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: { message?: unknown } } }).response?.data
      ?.message;

  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return fallback;
};

export const AdminStationPage = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [addressValue, setAddressValue] = useState("");
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [undoCandidate, setUndoCandidate] = useState<Station | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const clearUndoTimer = () => {
    if (undoTimerRef.current != null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const showUndoToast = (station: Station) => {
    clearUndoTimer();
    setUndoCandidate(station);
    setUndoVisible(true);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoVisible(false);
      setUndoCandidate(null);
      undoTimerRef.current = null;
    }, 5000);
  };

  const dismissUndo = () => {
    clearUndoTimer();
    setUndoVisible(false);
    setUndoCandidate(null);
  };

  const loadStations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.listStations();
      const rows = Array.isArray(data) ? (data as Station[]) : [];
      setStations(rows);
      setSelectedId((current) => {
        if (!rows.length) return null;
        if (current && rows.some((r) => r.id === current)) return current;
        return rows[0].id;
      });
      window.dispatchEvent(new Event("admin:refresh"));
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to load stations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStations();
    return () => {
      clearUndoTimer();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedCode = form.stationCode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");
    const payload = {
      ...form,
      stationCode: normalizedCode,
      latitude: 0,
      longitude: 0,
    };

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await adminService.createStation(payload);
      setForm(emptyForm);
      setSuccess("Station added successfully.");
      await loadStations();
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to create station."));
    } finally {
      setSaving(false);
    }
  };

  const uniqueStates = useMemo(() => {
    return Array.from(
      new Set(stations.map((station) => station.state).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [stations]);

  const filteredStations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return stations.filter((station) => {
      const matchesState =
        stateFilter === "all" || station.state === stateFilter;
      if (!matchesState) return false;
      if (!normalizedQuery) return true;

      const searchIndex =
        `${station.stationCode} ${station.name} ${station.district} ${station.state} ${station.pincode} ${station.phone}`.toLowerCase();
      return searchIndex.includes(normalizedQuery);
    });
  }, [query, stateFilter, stations]);

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedId) ?? null,
    [selectedId, stations],
  );

  useEffect(() => {
    if (selectedStation) {
      setRenameValue(selectedStation.name);
      setAddressValue(selectedStation.address);
    }
  }, [selectedStation]);

  const handleRename = async () => {
    if (!selectedStation) return;

    const trimmed = renameValue.trim();
    if (!trimmed) {
      setError("Station name cannot be empty.");
      return;
    }

    if (trimmed === selectedStation.name.trim()) {
      setIsRenameOpen(false);
      return;
    }

    try {
      setRenaming(true);
      setError(null);
      setSuccess(null);
      await adminService.renameStation(selectedStation.id, trimmed);
      setSuccess("Station renamed successfully.");
      setIsRenameOpen(false);
      await loadStations();
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to rename station."));
    } finally {
      setRenaming(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedStation) return;

    try {
      setRemoving(true);
      setError(null);
      setSuccess(null);
      const removedStation = selectedStation;
      await adminService.removeStation(selectedStation.id);
      setIsRemoveConfirmOpen(false);
      setSuccess(`Removed station \"${removedStation.name}\".`);
      showUndoToast(removedStation);
      await loadStations();
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to remove station."));
    } finally {
      setRemoving(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!selectedStation) return;

    const trimmed = addressValue.trim();
    if (!trimmed) {
      setError("Station address cannot be empty.");
      return;
    }

    if (trimmed === selectedStation.address.trim()) {
      setIsAddressOpen(false);
      return;
    }

    try {
      setUpdatingAddress(true);
      setError(null);
      setSuccess(null);
      await adminService.updateStationAddress(selectedStation.id, trimmed);
      setSuccess("Station address updated successfully.");
      setIsAddressOpen(false);
      await loadStations();
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to update station address."));
    } finally {
      setUpdatingAddress(false);
    }
  };

  const handleUndoRemove = async () => {
    if (!undoCandidate) return;

    try {
      setUndoing(true);
      setError(null);
      await adminService.createStation({
        name: undoCandidate.name,
        stationCode: undoCandidate.stationCode,
        address: undoCandidate.address,
        district: undoCandidate.district,
        state: undoCandidate.state,
        pincode: undoCandidate.pincode,
        phone: undoCandidate.phone,
        latitude: undoCandidate.latitude ?? 0,
        longitude: undoCandidate.longitude ?? 0,
        email: undoCandidate.email ?? undefined,
        jurisdictionArea: undoCandidate.jurisdictionArea ?? undefined,
      });
      dismissUndo();
      setSuccess(`Restored station \"${undoCandidate.name}\".`);
      await loadStations();
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to restore station."));
    } finally {
      setUndoing(false);
    }
  };

  const districtCount = useMemo(() => {
    return new Set(
      stations.map((station) => `${station.state}:${station.district}`),
    ).size;
  }, [stations]);

  return (
    <div className="p-8 lg:p-10 max-w-[1480px] text-white">
      <p className="text-[11px] font-bold tracking-[0.22em] text-[#9CA3AF] uppercase mb-2">
        Admin catalogue
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
        Station catalogue
      </h1>
      <p className="text-sm text-[#9CA3AF] mb-8">
        Essential station details for officer assignment and victim routing.
      </p>
      {error && (
        <div className="mb-4 rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">
            Total stations
          </p>
          <p className="text-2xl font-extrabold text-white">
            {stations.length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">
            States covered
          </p>
          <p className="text-2xl font-extrabold text-white">
            {uniqueStates.length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">
            Districts covered
          </p>
          <p className="text-2xl font-extrabold text-white">{districtCount}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[420px,1fr] gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-white">Add station</h2>
          <p className="text-xs text-[#9CA3AF]">
            Only required fields are shown here. Coordinates are handled
            automatically.
          </p>

          <div className="grid gap-3">
            <input
              value={form.name}
              onChange={(e) =>
                setForm((current) => ({ ...current, name: e.target.value }))
              }
              placeholder="Station name"
              required
              className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
            />
            <input
              value={form.stationCode}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  stationCode: e.target.value.toUpperCase(),
                }))
              }
              placeholder="Station code (e.g. KA-BLR-01)"
              required
              minLength={3}
              className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.district}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    district: e.target.value,
                  }))
                }
                placeholder="District"
                required
                className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
              />
              <input
                value={form.state}
                onChange={(e) =>
                  setForm((current) => ({ ...current, state: e.target.value }))
                }
                placeholder="State"
                required
                className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
              />
            </div>

            <input
              value={form.address}
              onChange={(e) =>
                setForm((current) => ({ ...current, address: e.target.value }))
              }
              placeholder="Full address"
              required
              className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.pincode}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    pincode: e.target.value,
                  }))
                }
                placeholder="Pincode"
                required
                className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
              />
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((current) => ({ ...current, phone: e.target.value }))
                }
                placeholder="Contact phone"
                required
                className="w-full rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-[#6B7280]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl px-3 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] bg-[#F97316] text-white disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? "Adding station..." : "Create station"}
          </button>
        </form>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <div className="border-b border-white/[0.08] p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
              <Building2 size={16} className="text-[#F97316]" />
              <span>{filteredStations.length} stations shown</span>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search code, name, district..."
                  className="w-[220px] rounded-xl bg-[#0b0b0b] border border-white/[0.08] pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#6B7280]"
                />
              </div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                aria-label="Filter stations by state"
                className="rounded-xl bg-[#0b0b0b] border border-white/[0.08] px-3 py-2 text-sm text-white"
              >
                <option value="all">All states</option>
                {uniqueStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadStations()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bold tracking-[0.15em] text-[#9CA3AF] uppercase">
                <th className="px-6 py-4">Station</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-[#9CA3AF]"
                  >
                    No stations match current filters.
                  </td>
                </tr>
              ) : (
                filteredStations.map((station) => {
                  const selected = station.id === selectedId;
                  return (
                    <tr
                      key={station.id}
                      onClick={() => setSelectedId(station.id)}
                      className={`border-b border-white/[0.06] cursor-pointer transition-colors ${selected ? "bg-orange-500/10" : "hover:bg-white/[0.03]"}`}
                    >
                      <td className="px-6 py-4 text-white font-semibold">
                        {station.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-[#D1D5DB]">
                        {station.stationCode}
                      </td>
                      <td className="px-6 py-4 text-[#D1D5DB]">
                        {station.district}, {station.state}
                      </td>
                      <td className="px-6 py-4 text-[#D1D5DB]">
                        {station.phone}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {selectedStation && (
            <div className="border-t border-white/[0.08] p-4 bg-[#0b0b0b]/70 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF]">
                  Selected station
                </p>
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ y: -1, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setIsRenameOpen((v) => !v);
                      setRenameValue(selectedStation.name);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.16] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-[#D1D5DB] hover:text-white"
                  >
                    <Pencil size={12} /> Rename
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -1, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setIsAddressOpen((v) => !v);
                      setAddressValue(selectedStation.address);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.16] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-[#D1D5DB] hover:text-white"
                  >
                    <MapPin size={12} /> Address
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -1, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsRemoveConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-500/20"
                  >
                    <Trash2 size={12} /> Remove
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {isRenameOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-[#F97316]/35 bg-[#1a1208] p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.13em] text-[#FDBA74] mb-2 font-semibold">
                      Rename station
                    </p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 rounded-lg bg-[#0b0b0b] border border-white/[0.12] px-3 py-2 text-sm text-white placeholder:text-[#6B7280]"
                        placeholder="New station name"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          title="Cancel rename"
                          onClick={() => {
                            setIsRenameOpen(false);
                            setRenameValue(selectedStation.name);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-white/[0.16] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#D1D5DB]"
                        >
                          <X size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={renaming}
                          onClick={() => void handleRename()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                        >
                          <Check size={13} />
                          {renaming ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isAddressOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-sky-300/30 bg-[#08131a] p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.13em] text-sky-200 mb-2 font-semibold">
                      Update address
                    </p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        value={addressValue}
                        onChange={(e) => setAddressValue(e.target.value)}
                        className="flex-1 rounded-lg bg-[#0b0b0b] border border-white/[0.12] px-3 py-2 text-sm text-white placeholder:text-[#6B7280]"
                        placeholder="New station address"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label="Cancel address update"
                          title="Cancel address update"
                          onClick={() => {
                            setIsAddressOpen(false);
                            setAddressValue(selectedStation.address);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-white/[0.16] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#D1D5DB]"
                        >
                          <X size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={updatingAddress}
                          onClick={() => void handleUpdateAddress()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                        >
                          <Check size={13} />
                          {updatingAddress ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[#9CA3AF] mb-1">Code</p>
                  <p className="text-white font-mono">
                    {selectedStation.stationCode}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[#9CA3AF] mb-1">Address</p>
                  <p className="text-white flex items-start gap-1">
                    <MapPin size={14} className="mt-0.5 text-[#F97316]" />
                    {selectedStation.address}, {selectedStation.pincode}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[#9CA3AF] mb-1">Contact</p>
                  <p className="text-white flex items-center gap-1">
                    <Phone size={14} className="text-[#F97316]" />
                    {selectedStation.phone}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isRemoveConfirmOpen && selectedStation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-2xl border border-red-300/30 bg-[#120b0b] p-5 shadow-2xl"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-300 mb-2">
                Confirm removal
              </p>
              <h3 className="text-lg font-bold text-white mb-1">
                Remove station permanently?
              </h3>
              <p className="text-sm text-[#D1D5DB] mb-4">
                This will remove{" "}
                <span className="font-semibold text-white">
                  {selectedStation.name}
                </span>{" "}
                from the station catalogue.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRemoveConfirmOpen(false)}
                  className="rounded-lg border border-white/[0.16] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#D1D5DB]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => void handleRemove()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-70"
                >
                  <Trash2 size={13} />
                  {removing ? "Removing..." : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {undoVisible && undoCandidate && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed right-6 bottom-6 z-50 w-full max-w-sm rounded-2xl border border-emerald-300/30 bg-[#08120c] shadow-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300 font-bold mb-1">
                  Station removed
                </p>
                <p className="text-sm text-[#D1D5DB] leading-relaxed">
                  {undoCandidate.name} was removed from the catalogue.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss undo notification"
                onClick={dismissUndo}
                className="rounded-md border border-white/[0.14] bg-white/[0.04] p-1.5 text-[#D1D5DB] hover:text-white"
              >
                <X size={12} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleUndoRemove()}
                disabled={undoing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-70"
              >
                {undoing ? "Restoring..." : "Undo"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminStationPage;
