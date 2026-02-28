import React, { useEffect, useMemo, useState } from "react";
import { Layers, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { API_BASE_URL } from "../../constants";

type VehicleType = {
  id: number | string;
  vehicletype: string;
};

const VehicleTypeMaster = () => {
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [formData, setFormData] = useState({ vehicletype: "" });

  const getAuthHeaders = () => {
    const token = getCookie("auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const fetchTypes = async () => {
    const res = await fetch(`${API_BASE_URL}/vehicle-types`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as VehicleType[];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const list = await fetchTypes();
      setTypes(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load vehicle types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicletype.trim()) {
      setError("Vehicle type is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { vehicletype: formData.vehicletype.trim() };
      const res = await fetch(`${API_BASE_URL}/vehicle-types${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingId(null);
      setFormData({ vehicletype: "" });
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Failed to save vehicle type");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Delete this vehicle type?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicle-types/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: VehicleType) => {
    setEditingId(row.id);
    setFormData({ vehicletype: row.vehicletype || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = useMemo(() => {
    return types.filter((t) => t.vehicletype?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [types, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 text-white">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vehicle Type Master</h1>
              <p className="text-slate-500 text-sm">Manage all vehicle type categories</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            {loading ? "Loading..." : "Connected"}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              {editingId ? "Edit Vehicle Type" : "Add Vehicle Type"}
              {editingId && (
                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Editing Mode
                </span>
              )}
            </h2>
          </div>
          <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Truck"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                value={formData.vehicletype}
                onChange={(e) => setFormData({ vehicletype: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium py-2 px-8 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                {saving ? "Saving..." : editingId ? "Update Type" : "Save Type"}
              </button>
              {editingId && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ vehicletype: "" });
                  }}
                  className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-600 p-2 rounded-lg transition-colors"
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search vehicle type..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Type</th>
                    <th className="px-6 py-4 font-bold text-slate-700 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <p>Loading vehicle types...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-slate-800 border-r border-slate-100">
                          {row.vehicletype}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(row)}
                              disabled={saving}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={saving}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <Layers size={32} className="text-slate-200" />
                          <p>No vehicle types found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <div>Total: {filtered.length} types</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleTypeMaster;
