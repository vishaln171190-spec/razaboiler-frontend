import React, { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";

const API_BASE_URL = "http://127.0.0.1:8000/api";

type Item = {
  id: number | string;
  name: string;
  type: "ShopCompany" | "Hotel";
};

const ItemMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "master_item");
  const canCreate = isAdmin || hasPermission(authUser, "master_item");
  const canEdit = isAdmin || hasPermission(authUser, "master_item");
  const canDelete = isAdmin || hasPermission(authUser, "master_item");
  const canMutate = canCreate || canEdit;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "ShopCompany",
  });

  const getAuthHeaders = () => {
    const token = getCookie("auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const fetchItems = async () => {
    const res = await fetch(`${API_BASE_URL}/items`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map((it) => ({
      id: it.id ?? it.item_id ?? it._id,
      name: it.itemname || it.name || "",
      type: it.customertypeid === 2 ? "Hotel" : "ShopCompany",
    })) as Item[];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const list = await fetchItems();
      setItems(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [canView]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !canEdit) {
      setError("You do not have permission to update items");
      return;
    }
    if (!editingId && !canCreate) {
      setError("You do not have permission to create items");
      return;
    }
    if (!formData.name) {
      setError("Item name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        itemname: formData.name,
        itemslug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        customertypeid: formData.type === "ShopCompany" ? 1 : 2,
      };
      const res = await fetch(`${API_BASE_URL}/items${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingId(null);
      setFormData({ name: "", type: "ShopCompany" });
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!canDelete) {
      setError("You do not have permission to delete items");
      return;
    }
    if (!window.confirm("Delete this item?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Delete failed");
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Item) => {
    if (!canEdit) {
      setError("You do not have permission to edit items");
      return;
    }
    setEditingId(item.id);
    setFormData({ name: item.name, type: item.type });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredItems = useMemo(() => {
    return items.filter(
      (i) =>
        (typeFilter === "" || i.type === typeFilter) &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, typeFilter, searchTerm]);

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Item Master.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 text-white">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vehicle Item Master</h1>
              <p className="text-slate-500 text-sm">Manage items for shop/company and hotel customers</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            {loading ? "Loading..." : "Connected"}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        {canMutate && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              {editingId ? "Edit Item" : "Add New Item"}
              {editingId && (
                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Editing Mode
                </span>
              )}
            </h2>
          </div>
          <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Fresh Chicken"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Item Type</label>
              <select
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Item["type"] })}
              >
                <option value="ShopCompany">Shop / Company (Live Bird)</option>
                <option value="Hotel">Hotel (Processed Meat)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium py-2 px-8 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                {saving ? "Saving..." : editingId ? "Update Item" : "Save Item"}
              </button>
              {editingId && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ name: "", type: "ShopCompany" });
                  }}
                  className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-600 p-2 rounded-lg transition-colors"
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>
          </form>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:w-64">
              <label className="text-sm font-medium text-slate-600 block mb-2">Filter by Type</label>
              <select
                className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="ShopCompany">Shop / Company</option>
                <option value="Hotel">Hotel</option>
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search item name..."
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
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Item Name</th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Type</th>
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-4 font-bold text-slate-700 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 3 : 2} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <p>Loading items...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-slate-800 border-r border-slate-100">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 border-r border-slate-100">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                              item.type === "Hotel"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.type === "Hotel" ? "Hotel" : "Shop / Company"}
                          </span>
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit && (
                                <button
                                  onClick={() => startEdit(item)}
                                  disabled={saving}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  disabled={saving}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 3 : 2} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <Package size={32} className="text-slate-200" />
                          <p>No items found{typeFilter ? ` for type "${typeFilter}"` : ""}.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <div>Total: {filteredItems.length} items</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemMaster;
