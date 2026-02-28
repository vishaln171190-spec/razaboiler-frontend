import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  ClipboardList,
  IndianRupee,
  PlusCircle,
  Trash2,
  Wrench,
} from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { API_BASE_URL } from "../../constants";

type Vehicle = {
  id: number | string;
  vehicalid?: string;
  rcnumber?: string;
  vehicalmodel?: string;
};

type MaintenanceType = {
  id: number | string;
  maintanancetype?: string;
};

type MaintenanceRow = {
  id: number | string;
  vehicleid: number | string;
  maintanancetype: number | string;
  maintanancecost: number;
  maintanancedate: string;
};

const MaintenanceMaster = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<MaintenanceType[]>([]);
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    maintanancedate: new Date().toISOString().split("T")[0],
    vehicleid: "",
    maintanancetype: "",
    maintanancecost: "",
    created_by: "1",
  });

  const getAuthHeaders = () => {
    const token = getCookie("auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const showToast = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const fetchVehicles = async () => {
    const res = await fetch(`${API_BASE_URL}/vehicles`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as Vehicle[];
  };

  const fetchTypes = async () => {
    const res = await fetch(`${API_BASE_URL}/maintanance-types`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as MaintenanceType[];
  };

  const fetchMaintenance = async () => {
    const res = await fetch(`${API_BASE_URL}/maintanance`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as MaintenanceRow[];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [v, t, m] = await Promise.all([fetchVehicles(), fetchTypes(), fetchMaintenance()]);
      setVehicles(v);
      setTypes(t);
      setRows(m);
    } catch (err) {
      console.error(err);
      showToast("Failed to load maintenance data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleid || !formData.maintanancetype || !formData.maintanancecost) {
      showToast("Please fill in required fields", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vehicleid: Number(formData.vehicleid),
        maintanancetype: Number(formData.maintanancetype),
        maintanancecost: Number(formData.maintanancecost),
        maintanancedate: formData.maintanancedate,
        created_by: Number(formData.created_by),
      };
      const res = await fetch(
        `${API_BASE_URL}/maintanance${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      showToast(editingId ? "Maintenance updated" : "Maintenance logged", "success");
      setEditingId(null);
      setFormData({
        maintanancedate: new Date().toISOString().split("T")[0],
        vehicleid: "",
        maintanancetype: "",
        maintanancecost: "",
        created_by: "1",
      });
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to save maintenance", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/maintanance/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Entry deleted", "success");
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: MaintenanceRow) => {
    setEditingId(row.id);
    setFormData({
      maintanancedate: row.maintanancedate?.split("T")[0] || "",
      vehicleid: String(row.vehicleid),
      maintanancetype: String(row.maintanancetype),
      maintanancecost: String(row.maintanancecost || ""),
      created_by: "1",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalCost = useMemo(() => {
    return rows.reduce((sum, item) => sum + (Number(item.maintanancecost) || 0), 0);
  }, [rows]);

  const getVehicleLabel = (id: number | string) => {
    const v = vehicles.find((x) => String(x.id) === String(id));
    return v ? `${v.vehicalid || "VID"} - ${v.rcnumber || v.vehicalmodel || ""}` : `Vehicle ${id}`;
  };

  const getTypeLabel = (id: number | string) => {
    const t = types.find((x) => String(x.id) === String(id));
    return t?.maintanancetype || "Maintenance";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {msg && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            msg.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {msg.type === "error" ? <AlertCircle size={20} /> : <PlusCircle size={20} />}
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Wrench size={28} />
              </div>
              Maintenance Master
            </h1>
            <p className="text-slate-500 mt-1">Track vehicle maintenance and repair history</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm text-sm font-medium text-slate-600">
            <Car size={16} className="text-emerald-500" />
            Fleet Maintenance
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <PlusCircle size={20} className="text-indigo-600" />
            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">
              {editingId ? "Update Maintenance" : "Log Maintenance"}
            </h2>
          </div>
          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar size={14} /> Date
                </label>
                <input
                  type="date"
                  value={formData.maintanancedate}
                  onChange={(e) => setFormData({ ...formData, maintanancedate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Car size={14} /> Select Vehicle
                </label>
                <select
                  value={formData.vehicleid}
                  onChange={(e) => setFormData({ ...formData, vehicleid: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                >
                  <option value="">Choose a Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicalid || v.rcnumber || v.vehicalmodel || `Vehicle ${v.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ClipboardList size={14} /> Maintenance Type
                </label>
                <select
                  value={formData.maintanancetype}
                  onChange={(e) => setFormData({ ...formData, maintanancetype: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                >
                  <option value="">Select Type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.maintanancetype}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <IndianRupee size={14} /> Cost (₹)
                </label>
                <input
                  type="number"
                  value={formData.maintanancecost}
                  onChange={(e) => setFormData({ ...formData, maintanancecost: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      maintanancedate: new Date().toISOString().split("T")[0],
                      vehicleid: "",
                      maintanancetype: "",
                      maintanancecost: "",
                      created_by: "1",
                    });
                  }}
                  className="text-sm text-slate-500 underline"
                >
                  Cancel edit
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                  saving ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
                }`}
              >
                {saving ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
                <PlusCircle size={20} />
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-slate-600" />
              <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Maintenance History</h2>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded">
              {rows.length} Entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100">Date</th>
                  <th className="px-6 py-4 border-b border-slate-100">Vehicle</th>
                  <th className="px-6 py-4 border-b border-slate-100">Type</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Amount (₹)</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span>Loading history...</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No maintenance logs found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {new Date(row.maintanancedate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{getVehicleLabel(row.vehicleid)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold">
                          <Wrench size={14} /> {getTypeLabel(row.maintanancetype)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-black text-slate-900">
                          ₹{Number(row.maintanancecost || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(row)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <ClipboardList size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Entry"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && rows.length > 0 && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 font-bold text-right text-slate-400 uppercase tracking-wider">
                      Total Maintenance Cost
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xl font-black text-emerald-400">
                        ₹{totalCost.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceMaster;
