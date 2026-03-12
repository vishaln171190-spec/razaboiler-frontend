import React, { useState, useEffect } from "react";
import { Calendar, Wrench, Car, ClipboardList } from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { API_BASE_URL } from "../../constants";

const MaintenanceReports: React.FC = () => {
  // Filters
  const [vehicle, setVehicle] = useState("");
  const [type, setType] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Dropdown data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);

  // Report
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth header helper
  const getAuthHeaders = () => {
    const token = getCookie("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch vehicles
  const fetchVehicles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles`, { method: "GET", headers: getAuthHeaders() });
      const data = await res.json();
      setVehicles((data.data || data || []).map((v: any) => ({
        id: v.id ?? v.vehicleid ?? v._id ?? Math.random().toString(36).slice(2),
        name: v.vehicalid || v.rcnumber || v.vehicalmodel || `Vehicle ${v.id}`,
      })));
    } catch {
      setError("Failed to load vehicles");
    }
  };

  // Fetch types
  const fetchTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/maintanance-types`, { method: "GET", headers: getAuthHeaders() });
      const data = await res.json();
      setTypes((data.data || data || []).map((t: any) => ({
        id: t.id ?? t.maintanancetype ?? t._id ?? Math.random().toString(36).slice(2),
        name: t.maintanancetype || "Type",
      })));
    } catch {
      setError("Failed to load types");
    }
  };

  useEffect(() => {
    Promise.all([fetchVehicles(), fetchTypes()]).finally(() => setLoading(false));
  }, []);

  // Date range calculation
  const getDateRange = () => {
    const today = new Date();
    let start_date = "", end_date = "";
    switch (dateFilter) {
      case "today":
        start_date = end_date = today.toISOString().slice(0, 10);
        break;
      case "yesterday":
        const yest = new Date(today);
        yest.setDate(today.getDate() - 1);
        start_date = end_date = yest.toISOString().slice(0, 10);
        break;
      case "thisweek":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start_date = weekStart.toISOString().slice(0, 10);
        end_date = today.toISOString().slice(0, 10);
        break;
      case "thismonth":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start_date = monthStart.toISOString().slice(0, 10);
        end_date = today.toISOString().slice(0, 10);
        break;
      case "customdate":
        start_date = customStart;
        end_date = customEnd;
        break;
      default:
        start_date = end_date = today.toISOString().slice(0, 10);
    }
    return { start_date, end_date };
  };

  // Fetch report
  const getReport = async () => {
    setLoading(true);
    setError("");
    const { start_date, end_date } = getDateRange();
    const url = `${API_BASE_URL}/reports/maintanance?vehicleid=${vehicle}&start_date=${start_date}&end_date=${end_date}&typeid=${type}`;
    try {
      const res = await fetch(url, { method: "GET", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      // Normalize data for table
      const rows = (data.data || data || []).map((row: any) => ({
        vehicle: row.vehicle_number || row.vehicle || row.vehicalid || "",
        date: row.maintanancedate || row.date || "",
        type: row.maintanancetype || row.type || "",
        cost: row.maintanancecost || row.cost || 0,
      }));
      setReportData(rows);
    } catch {
      setError("Failed to fetch report");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportCSV = () => {
    if (!reportData.length) {
      alert("No data to export!");
      return;
    }
    const csvRows = [
      ["Vehicle", "Date", "Type", "Cost"],
      ...reportData.map((row: any) => [row.vehicle, row.date, row.type, row.cost]),
    ];
    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance_report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate total cost
  const totalCost = reportData.reduce((sum, row) => sum + Number(row.cost), 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Maintenance Reports</h1>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Report</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">{error}</div>
        )}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Filters</h2>
          </div>
          <div className="px-6 py-4 flex flex-wrap gap-4">
            <select value={vehicle} onChange={e => setVehicle(e.target.value)} className="w-64 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <select value={type} onChange={e => setType(e.target.value)} className="w-64 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option value="">Select Maintenance Type</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisweek">This Week</option>
              <option value="thismonth">This Month</option>
              <option value="customdate">Custom Date</option>
            </select>
            {dateFilter === "customdate" && (
              <div className="flex gap-2 mt-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer" />
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer" />
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
            <button onClick={getReport} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400">
              {loading ? "Loading..." : "Get Report"}
            </button>
            <button onClick={exportCSV} className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400">
              Export
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl mt-6">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Maintenance Report</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/80 uppercase text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-center">Vehicle</th>
                  <th className="px-6 py-4 text-center">Date</th>
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4 text-right">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No maintenance found.</td>
                  </tr>
                ) : (
                  reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-700 text-center">{row.vehicle}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-center">{row.date}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-center">{row.type}</td>
                      <td className="px-6 py-4 text-slate-900 font-bold text-right">₹{Number(row.cost).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportData.length > 0 && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Total Cost</td>
                    <td colSpan={3} className="px-6 py-4 text-right font-bold">₹{totalCost.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MaintenanceReports;
