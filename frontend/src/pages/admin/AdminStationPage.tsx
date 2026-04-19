import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, MapPin, Phone, RefreshCw, Search } from "lucide-react";
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

export const AdminStationPage = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.listStations();
      const rows = Array.isArray(data) ? (data as Station[]) : [];
      setStations(rows);
      if (rows.length > 0) {
        setSelectedId((current) => current ?? rows[0].id);
      }
      window.dispatchEvent(new Event("admin:refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load stations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStations();
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
      setError(
        err instanceof Error ? err.message : "Unable to create station.",
      );
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
            <div className="border-t border-white/[0.08] p-4 bg-[#0b0b0b]/70">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-2">
                Selected station
              </p>
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
    </div>
  );
};

export default AdminStationPage;
