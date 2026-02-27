import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  IndianRupee,
  Loader2,
  PlusCircle,
  ShoppingBag,
  Trash2,
  ClipboardEdit,
} from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";

const API_BASE_URL = "http://127.0.0.1:8000/api";

type Company = { id: number | string; company_name?: string };
type Purchase = {
  id: number | string;
  companyid: number | string;
  purchasedate: string;
  purchaseqty: number;
  parchaseweight: number;
  rateofpurchase: number;
  status?: string;
};

const PurchaseMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "daily_purchase");
  const canCreate = isAdmin || hasPermission(authUser, "daily_purchase");
  const canEdit = isAdmin || hasPermission(authUser, "daily_purchase");
  const canDelete = isAdmin || hasPermission(authUser, "daily_purchase");
  const canMutate = canCreate || canEdit;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    companyid: "",
    purchasedate: new Date().toISOString().split("T")[0],
    purchaseqty: "",
    parchaseweight: "",
    rateofpurchase: "",
    status: "open",
    created_by: "1",
  });

  const showToast = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const getAuthHeaders = (options?: { json?: boolean }) => {
    const token = getCookie("auth_token");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options?.json !== false) headers["Content-Type"] = "application/json";
    return headers;
  };

  const fetchCompanies = async () => {
    const res = await fetch(`${API_BASE_URL}/company-master`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as Company[];
  };

  const fetchPurchases = async () => {
    const res = await fetch(`${API_BASE_URL}/purchasemaster`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as Purchase[];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, p] = await Promise.all([fetchCompanies(), fetchPurchases()]);
      setCompanies(c);
      setPurchases(p);
    } catch (err) {
      console.error(err);
      showToast("Failed to load purchase data", "error");
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
      showToast("You do not have permission to update purchases", "error");
      return;
    }
    if (!editingId && !canCreate) {
      showToast("You do not have permission to create purchases", "error");
      return;
    }
    if (!formData.companyid || !formData.purchasedate || !formData.purchaseqty || !formData.rateofpurchase) {
      showToast("Please fill in required fields", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload = {
          purchasedate: formData.purchasedate,
          purchaseqty: Number(formData.purchaseqty),
          parchaseweight: Number(formData.parchaseweight || 0),
          rateofpurchase: Number(formData.rateofpurchase),
          status: formData.status,
        };
        const res = await fetch(`${API_BASE_URL}/purchasemaster/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update failed");
        showToast("Purchase updated", "success");
      } else {
        const body = new FormData();
        body.append("companyid", String(formData.companyid));
        body.append("purchasedate", formData.purchasedate);
        body.append("purchaseqty", String(formData.purchaseqty));
        body.append("parchaseweight", String(formData.parchaseweight || 0));
        body.append("rateofpurchase", String(formData.rateofpurchase));
        body.append("status", formData.status);
        body.append("created_by", String(formData.created_by || "1"));
        const res = await fetch(`${API_BASE_URL}/purchasemaster`, {
          method: "POST",
          headers: getAuthHeaders({ json: false }),
          body,
        });
        if (!res.ok) throw new Error("Create failed");
        showToast("Purchase created", "success");
      }
      setEditingId(null);
      setFormData({
        companyid: "",
        purchasedate: new Date().toISOString().split("T")[0],
        purchaseqty: "",
        parchaseweight: "",
        rateofpurchase: "",
        status: "open",
        created_by: "1",
      });
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to save purchase", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!canDelete) {
      showToast("You do not have permission to delete purchases", "error");
      return;
    }
    if (!window.confirm("Delete this purchase entry?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/purchasemaster/${id}`, {
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

  const startEdit = (row: Purchase) => {
    if (!canEdit) {
      showToast("You do not have permission to edit purchases", "error");
      return;
    }
    setEditingId(row.id);
    setFormData({
      companyid: String(row.companyid),
      purchasedate: row.purchasedate?.split("T")[0] || "",
      purchaseqty: String(row.purchaseqty || ""),
      parchaseweight: String(row.parchaseweight || ""),
      rateofpurchase: String(row.rateofpurchase || ""),
      status: row.status || "open",
      created_by: "1",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = purchases.filter((p) => p.purchasedate === selectedDate);

  const dayTotals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        const weight = Number(row.parchaseweight || 0);
        const rate = Number(row.rateofpurchase || 0);
        acc.totalWeight += weight;
        acc.totalValue += weight * rate;
        return acc;
      },
      { totalWeight: 0, totalValue: 0 }
    );
  }, [filtered]);

  const getCompanyName = (id: number | string) => {
    const c = companies.find((x) => String(x.id) === String(id));
    return c?.company_name || `Company ${id}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Loading Ledger...</p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Purchase Master.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Purchase Master</h1>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Ledger</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 md:gap-6">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 ring-1 ring-blue-200/50">
              <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                <IndianRupee size={16} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Today's Purchase</p>
                <p className="text-sm font-black text-blue-900 md:text-lg tabular-nums">
                  ₹{dayTotals.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {canMutate && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">
              {editingId ? "Update Purchase" : "Create Purchase"}
            </h2>
          </div>
          <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                Company
              </label>
              <select
                value={formData.companyid}
                onChange={(e) => setFormData({ ...formData, companyid: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                required
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || `Company ${c.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchasedate}
                onChange={(e) => setFormData({ ...formData, purchasedate: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                Qty (Birds)
              </label>
              <input
                type="number"
                value={formData.purchaseqty}
                onChange={(e) => setFormData({ ...formData, purchaseqty: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                Weight (Kg)
              </label>
              <input
                type="number"
                value={formData.parchaseweight}
                onChange={(e) => setFormData({ ...formData, parchaseweight: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                Rate (₹/Kg)
              </label>
              <input
                type="number"
                value={formData.rateofpurchase}
                onChange={(e) => setFormData({ ...formData, rateofpurchase: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="md:col-span-3 flex items-center justify-between">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      companyid: "",
                      purchasedate: new Date().toISOString().split("T")[0],
                      purchaseqty: "",
                      parchaseweight: "",
                      rateofpurchase: "",
                      status: "open",
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
                className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400"
              >
                {saving ? "Saving..." : editingId ? "Update Purchase" : "Save Purchase"}
                <PlusCircle size={18} />
              </button>
            </div>
          </form>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/80 uppercase text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4 text-right">Qty (Birds)</th>
                  <th className="px-5 py-4 text-right">Weight (Kg)</th>
                  <th className="px-5 py-4 text-right w-40">Rate (₹/Kg)</th>
                  <th className="px-5 py-4 text-right">Total Amount</th>
                  {(canEdit || canDelete) && <th className="px-5 py-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit || canDelete ? 6 : 5} className="py-24 text-center text-slate-400">
                      No purchase entries logged for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const weight = Number(row.parchaseweight || 0);
                    const rate = Number(row.rateofpurchase || 0);
                    const total = weight * rate;
                    return (
                      <tr key={row.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-800">{getCompanyName(row.companyid)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{row.purchaseqty || 0}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{weight.toFixed(2)} Kg</td>
                        <td className="px-5 py-3 text-right tabular-nums text-blue-700 font-bold">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-black text-slate-900 text-base">
                          ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {canEdit && (
                                <button
                                  onClick={() => startEdit(row)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <ClipboardEdit size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-slate-900 text-white shadow-2xl">
                  <tr>
                    <td colSpan={canEdit || canDelete ? 3 : 2} className="px-5 py-4 font-black uppercase tracking-widest text-[10px] text-slate-400">
                      Total for {selectedDate}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums font-bold">
                      {dayTotals.totalWeight.toFixed(2)} Kg
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-xl font-black text-blue-400">
                      ₹{dayTotals.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    {(canEdit || canDelete) && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-500">
          <div className="rounded-full bg-blue-100 p-2 text-blue-600">
            <AlertCircle size={16} />
          </div>
          <p className="leading-relaxed">
            Use the form to create or update purchase entries. Entries are filtered by the selected date above.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PurchaseMaster;
