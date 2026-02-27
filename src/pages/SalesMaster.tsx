import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  ClipboardEdit,
  Loader2,
  PlusCircle,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";

const API_BASE_URL = "http://127.0.0.1:8000/api";

type Customer = { id: number | string; name?: string };
type Item = { id: number | string; name?: string };

type Sale = {
  id: number | string;
  customerid: number | string;
  saledate: string;
  salestatus?: string;
};

type SaleItem = {
  id?: number | string;
  saleid: number | string;
  itemid: number | string;
  itemweight: number;
  itemqty: number;
  actualrate: number;
  salerate: number;
  discounttype?: string;
  discount?: number;
  totalsale?: number;
};

const SalesMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "view");
  const canCreate = isAdmin || hasPermission(authUser, "create");
  const canEdit = isAdmin || hasPermission(authUser, "edit");
  const canDelete = isAdmin || hasPermission(authUser, "delete");
  const canMutate = canCreate || canEdit;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showItemForm, setShowItemForm] = useState(false);
  const [draftItems, setDraftItems] = useState<SaleItem[]>([]);

  const [formData, setFormData] = useState({
    customerid: "",
    saledate: new Date().toISOString().split("T")[0],
    salestatus: "open",
    created_by: "1",
  });

  const [draftItem, setDraftItem] = useState({
    itemid: "",
    itemweight: "",
    itemqty: "",
    actualrate: "",
    salerate: "",
    discounttype: "flat",
    discount: "",
  });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewSaleId, setViewSaleId] = useState<string | number | null>(null);
  const [viewItems, setViewItems] = useState<SaleItem[]>([]);
  const [viewSavingId, setViewSavingId] = useState<string | number | null>(null);

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

  const fetchCustomers = async () => {
    const res = await fetch(`${API_BASE_URL}/customers`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map((c) => ({
      id: c.id ?? c.customer_id ?? c._id ?? Math.random().toString(36).slice(2),
      name: c.customer_name || c.customername || c.name || "",
    })) as Customer[];
  };

  const fetchItems = async () => {
    const res = await fetch(`${API_BASE_URL}/items`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map((it) => ({
      id: it.id ?? it.item_id ?? it._id ?? Math.random().toString(36).slice(2),
      name: it.itemname || it.name || "",
    })) as Item[];
  };

  const normalizeSale = (raw: any): Sale => ({
    id: raw.id ?? raw.saleid ?? raw._id ?? Math.random().toString(36).slice(2),
    customerid: raw.customerid ?? raw.customer_id ?? raw.customer ?? "",
    saledate: raw.saledate ?? raw.sale_date ?? raw.date ?? "",
    salestatus: raw.salestatus ?? raw.status ?? "open",
  });

  const normalizeSaleItem = (it: any): SaleItem => ({
    id: it.id ?? it.saleitem_id ?? it.sale_item_id ?? it._id,
    saleid: it.saleid ?? it.sale_id ?? it.sale ?? 0,
    itemid: it.itemid ?? it.item_id ?? 0,
    itemweight: Number(it.itemweight ?? it.item_weight ?? 0),
    itemqty: Number(it.itemqty ?? it.item_qty ?? 0),
    actualrate: Number(it.actualrate ?? it.actual_rate ?? 0),
    salerate: Number(it.salerate ?? it.sale_rate ?? 0),
    discounttype: it.discounttype ?? it.discount_type ?? "flat",
    discount: Number(it.discount ?? 0),
    totalsale: Number(it.totalsale ?? it.total_sale ?? 0),
  });

  const fetchSales = async () => {
    const res = await fetch(`${API_BASE_URL}/sales`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map(normalizeSale) as Sale[];
  };

  const fetchSaleItems = async () => {
    const res = await fetch(`${API_BASE_URL}/saleitems`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map(normalizeSaleItem) as SaleItem[];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, i, s, si] = await Promise.all([fetchCustomers(), fetchItems(), fetchSales(), fetchSaleItems()]);
      setCustomers(c);
      setItems(i);
      setSales(s);
      setSaleItems(si);
    } catch (err) {
      console.error(err);
      showToast("Failed to load sales data", "error");
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

  const computeTotalSale = (item: {
    itemweight: number | string;
    itemqty: number | string;
    salerate: number | string;
    discounttype?: string;
    discount?: number | string;
  }) => {
    const weight = Number(item.itemweight || 0);
    const qty = Number(item.itemqty || 0);
    const rate = Number(item.salerate || 0);
    const base = weight > 0 ? weight * rate : qty * rate;
    const discount = Number(item.discount || 0);
    if (item.discounttype === "percent") {
      return base - base * (discount / 100);
    }
    return base - discount;
  };

  const addDraftItem = () => {
    if (!draftItem.itemid) {
      showToast("Select item", "error");
      return;
    }
    const row: SaleItem = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      saleid: Number(editingId || 0),
      itemid: Number(draftItem.itemid),
      itemweight: Number(draftItem.itemweight || 0),
      itemqty: Number(draftItem.itemqty || 0),
      actualrate: Number(draftItem.actualrate || 0),
      salerate: Number(draftItem.salerate || 0),
      discounttype: draftItem.discounttype,
      discount: Number(draftItem.discount || 0),
      totalsale: computeTotalSale(draftItem),
    };
    setDraftItems((prev) => [...prev, row]);
    setDraftItem({
      itemid: "",
      itemweight: "",
      itemqty: "",
      actualrate: "",
      salerate: "",
      discounttype: "flat",
      discount: "",
    });
  };

  const removeDraftItem = (id?: number | string) => {
    if (!id) return;
    setDraftItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !canEdit) {
      showToast("You do not have permission to update sales", "error");
      return;
    }
    if (!editingId && !canCreate) {
      showToast("You do not have permission to create sales", "error");
      return;
    }
    if (!formData.customerid || !formData.saledate) {
      showToast("Please fill required fields", "error");
      return;
    }
    if (draftItems.length === 0) {
      showToast("Please add at least one sale item", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerid: Number(formData.customerid),
        saledate: formData.saledate,
        salestatus: formData.salestatus,
      };
      let saleId = editingId;
      if (editingId) {
        const res = await fetch(`${API_BASE_URL}/sales/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update sale failed");
      } else {
        const res = await fetch(`${API_BASE_URL}/sales`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create sale failed");
        const data = await res.json();
        saleId = data.data?.id ?? data.id ?? data.saleid ?? data.data?.saleid;
      }

      if (!saleId) throw new Error("Sale ID not returned");

      for (const it of draftItems) {
        const itemPayload = {
          saleid: Number(saleId),
          itemid: Number(it.itemid),
          itemweight: Number(it.itemweight || 0),
          itemqty: Number(it.itemqty || 0),
          actualrate: Number(it.actualrate || 0),
          salerate: Number(it.salerate || 0),
          discounttype: it.discounttype || "flat",
          discount: Number(it.discount || 0),
          totalsale: Number(it.totalsale ?? computeTotalSale(it)),
        };
        if (it.id && String(it.id).startsWith("tmp-")) {
          const res = await fetch(`${API_BASE_URL}/saleitems`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(itemPayload),
          });
          if (!res.ok) throw new Error("Create sale item failed");
        } else if (it.id) {
          const res = await fetch(`${API_BASE_URL}/saleitems/${it.id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(itemPayload),
          });
          if (!res.ok) throw new Error("Update sale item failed");
        }
      }

      showToast(editingId ? "Sale updated" : "Sale created", "success");
      setEditingId(null);
      setDraftItems([]);
      setShowItemForm(false);
      setFormData({
        customerid: "",
        saledate: new Date().toISOString().split("T")[0],
        salestatus: "open",
        created_by: "1",
      });
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to save sale", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!canDelete) {
      showToast("You do not have permission to delete sales", "error");
      return;
    }
    if (!window.confirm("Delete this sale?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Sale deleted", "success");
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: Sale) => {
    if (!canEdit) {
      showToast("You do not have permission to edit sales", "error");
      return;
    }
    setEditingId(row.id);
    setFormData({
      customerid: String(row.customerid),
      saledate: row.saledate?.split("T")[0] || "",
      salestatus: row.salestatus || "open",
      created_by: "1",
    });
    const list = saleItems.filter((it) => String(it.saleid) === String(row.id));
    setDraftItems(list);
    setShowItemForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openViewItems = (saleId: number | string) => {
    setViewOpen(true);
    setViewSaleId(saleId);
    setViewItems(saleItems.filter((it) => String(it.saleid) === String(saleId)));
  };

  const closeViewItems = () => {
    setViewOpen(false);
    setViewSaleId(null);
    setViewItems([]);
  };

  const updateViewItem = async (it: SaleItem) => {
    if (!it.id) return;
    setViewSavingId(it.id);
    try {
      const payload = {
        saleid: Number(it.saleid),
        itemid: Number(it.itemid),
        itemweight: Number(it.itemweight || 0),
        itemqty: Number(it.itemqty || 0),
        actualrate: Number(it.actualrate || 0),
        salerate: Number(it.salerate || 0),
        discounttype: it.discounttype || "flat",
        discount: Number(it.discount || 0),
        totalsale: Number(it.totalsale ?? computeTotalSale(it)),
      };
      const res = await fetch(`${API_BASE_URL}/saleitems/${it.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      showToast("Sale item updated", "success");
      await loadAll();
      setViewItems((prev) => prev.map((x) => (x.id === it.id ? { ...it } : x)));
    } catch (err) {
      console.error(err);
      showToast("Failed to update item", "error");
    } finally {
      setViewSavingId(null);
    }
  };

  const deleteViewItem = async (id?: number | string) => {
    if (!id) return;
    if (!window.confirm("Delete this sale item?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/saleitems/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Sale item deleted", "success");
      setViewItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete item", "error");
    }
  };

  const getCustomerName = (id: number | string) => {
    const c = customers.find((x) => String(x.id) === String(id));
    return c?.name || `Customer ${id}`;
  };

  const getItemName = (id: number | string) => {
    const it = items.find((x) => String(x.id) === String(id));
    return it?.name || `Item ${id}`;
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const dateMatch = s.saledate?.split("T")[0] === selectedDate;
      const statusMatch = !statusFilter || s.salestatus === statusFilter;
      const customerMatch = !customerFilter || String(s.customerid) === String(customerFilter);
      const q = searchTerm.toLowerCase();
      const name = getCustomerName(s.customerid).toLowerCase();
      const searchMatch = !q || name.includes(q);
      return dateMatch && statusMatch && customerMatch && searchMatch;
    });
  }, [sales, selectedDate, statusFilter, customerFilter, searchTerm, customers]);

  const dayTotals = useMemo(() => {
    return filteredSales.reduce(
      (acc, s) => {
        const list = saleItems.filter((it) => String(it.saleid) === String(s.id));
        acc.totalItems += list.length;
        const weight = list.reduce((sum, it) => sum + Number(it.itemweight || 0), 0);
        const value = list.reduce((sum, it) => sum + Number(it.totalsale || 0), 0);
        acc.totalWeight += weight;
        acc.totalValue += value;
        return acc;
      },
      { totalItems: 0, totalWeight: 0, totalValue: 0 }
    );
  }, [filteredSales, saleItems]);

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
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Sales Master.</div>;
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
              <ShoppingCart size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Sales Master</h1>
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
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Today's Sales</p>
                <p className="text-sm font-black text-blue-900 md:text-lg tabular-nums">
                  ₹{dayTotals.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] font-bold text-blue-700">
                  {dayTotals.totalItems} Items • {dayTotals.totalWeight.toFixed(2)} Kg
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {canMutate && (
          <><div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">
                {editingId ? "Update Sale" : "Create Sale"}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                  Customer
                </label>
                <select
                  value={formData.customerid}
                  onChange={(e) => setFormData({ ...formData, customerid: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || `Customer ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                  Sale Date
                </label>
                <input
                  type="date"
                  value={formData.saledate}
                  onChange={(e) => setFormData({ ...formData, saledate: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                  required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                  Sale Status
                </label>
                <select
                  value={formData.salestatus}
                  onChange={(e) => setFormData({ ...formData, salestatus: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="open">Open</option>
                  <option value="close">Close</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-center justify-between">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        customerid: "",
                        saledate: new Date().toISOString().split("T")[0],
                        salestatus: "open",
                        created_by: "1",
                      });
                      setDraftItems([]);
                      setShowItemForm(false);
                    } }
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
                  {saving ? "Saving..." : editingId ? "Update Sale" : "Save Sale"}
                  <PlusCircle size={18} />
                </button>
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sale Items</p>
                  <button
                    type="button"
                    onClick={() => setShowItemForm((v) => !v)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    {showItemForm ? "Hide Add Item" : "Add Item"}
                  </button>
                </div>
              </div>

              {showItemForm && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Item
                    </label>
                    <select
                      value={draftItem.itemid}
                      onChange={(e) => setDraftItem({ ...draftItem, itemid: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    >
                      <option value="">Select Item</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name || `Item ${it.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Qty
                    </label>
                    <input
                      type="number"
                      value={draftItem.itemqty}
                      onChange={(e) => setDraftItem({ ...draftItem, itemqty: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Weight (Kg)
                    </label>
                    <input
                      type="number"
                      value={draftItem.itemweight}
                      onChange={(e) => setDraftItem({ ...draftItem, itemweight: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Actual Rate
                    </label>
                    <input
                      type="number"
                      value={draftItem.actualrate}
                      onChange={(e) => setDraftItem({ ...draftItem, actualrate: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Sale Rate
                    </label>
                    <input
                      type="number"
                      value={draftItem.salerate}
                      onChange={(e) => setDraftItem({ ...draftItem, salerate: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Discount Type
                    </label>
                    <select
                      value={draftItem.discounttype}
                      onChange={(e) => setDraftItem({ ...draftItem, discounttype: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    >
                      <option value="flat">Flat</option>
                      <option value="percent">Percent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                      Discount
                    </label>
                    <input
                      type="number"
                      value={draftItem.discount}
                      onChange={(e) => setDraftItem({ ...draftItem, discount: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="md:col-span-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={addDraftItem}
                      className="px-6 py-2 rounded-lg font-bold text-white shadow-md bg-emerald-600 hover:bg-emerald-700"
                    >
                      Add Sale Item
                    </button>
                  </div>
                </>
              )}

              <div className="md:col-span-3">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Weight</th>
                        <th className="px-4 py-3 text-right">Sale Rate</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {draftItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No items added yet.
                          </td>
                        </tr>
                      ) : (
                        draftItems.map((it) => (
                          <tr key={it.id ?? `${it.itemid}`}>
                            <td className="px-4 py-3 font-semibold text-slate-700">{getItemName(it.itemid)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">{it.itemqty}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                              {Number(it.itemweight || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                              ₹{Number(it.salerate || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                              ₹{Number(it.totalsale || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeDraftItem(it.id)}
                                className="text-xs font-bold text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </form>
          </div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
              <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Customer</label>
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  >
                    <option value="">All</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || `Customer ${c.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search customer..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm" />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("");
                      setCustomerFilter("");
                      setSearchTerm("");
                    } }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50/80 uppercase text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4 text-right">Items</th>
                      <th className="px-5 py-4 text-right">Total</th>
                      {(canEdit || canDelete) && <th className="px-5 py-4 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit || canDelete ? 6 : 5} className="py-24 text-center text-slate-400">
                          No sales found for {selectedDate}.
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((row) => {
                        const list = saleItems.filter((it) => String(it.saleid) === String(row.id));
                        const total = list.reduce((sum, it) => sum + Number(it.totalsale || 0), 0);
                        return (
                          <tr key={row.id} className="group hover:bg-blue-50/30 transition-colors">
                            <td className="px-5 py-3 font-bold text-slate-800">{getCustomerName(row.customerid)}</td>
                            <td className="px-5 py-3">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700">
                                {row.salestatus || "open"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-700 font-semibold">
                              {row.saledate?.split("T")[0] || ""}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">{list.length}</td>
                            <td className="px-5 py-3 text-right tabular-nums font-bold text-slate-900">
                              ₹{total.toFixed(2)}
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
                </table>
              </div>
            </div></>
        )}
      </main>

      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Sale Items</h3>
                <p className="text-xs text-slate-400">Sale ID: {viewSaleId}</p>
              </div>
              <button onClick={closeViewItems} className="text-sm font-bold text-slate-500">
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Weight</th>
                    <th className="px-4 py-3 text-right">Sale Rate</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    {(canEdit || canDelete) && <th className="px-4 py-3 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewItems.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 7 : 6} className="py-10 text-center text-slate-400">
                        No items found for this sale.
                      </td>
                    </tr>
                  ) : (
                    viewItems.map((it, idx) => (
                      <tr key={it.id ?? `${it.itemid}-${idx}`}>
                        <td className="px-4 py-3 font-semibold text-slate-700">{getItemName(it.itemid)}</td>
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              value={it.itemqty}
                              onChange={(e) =>
                                setViewItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, itemqty: Number(e.target.value) } : x))
                                )
                              }
                              className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right"
                            />
                          ) : (
                            <span className="tabular-nums">{it.itemqty}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              value={it.itemweight}
                              onChange={(e) =>
                                setViewItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, itemweight: Number(e.target.value) } : x))
                                )
                              }
                              className="w-24 px-2 py-1 border border-slate-200 rounded-md text-sm text-right"
                            />
                          ) : (
                            <span className="tabular-nums">{it.itemweight}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              value={it.salerate}
                              onChange={(e) =>
                                setViewItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, salerate: Number(e.target.value) } : x))
                                )
                              }
                              className="w-24 px-2 py-1 border border-slate-200 rounded-md text-sm text-right"
                            />
                          ) : (
                            <span className="tabular-nums">{it.salerate}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              value={it.discount ?? 0}
                              onChange={(e) =>
                                setViewItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, discount: Number(e.target.value) } : x))
                                )
                              }
                              className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right"
                            />
                          ) : (
                            <span className="tabular-nums">{it.discount ?? 0}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          ₹{computeTotalSale(it).toFixed(2)}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {canEdit && (
                                <button
                                  onClick={() =>
                                    updateViewItem({
                                      ...it,
                                      totalsale: computeTotalSale(it),
                                    })
                                  }
                                  disabled={viewSavingId === it.id}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                                >
                                  {viewSavingId === it.id ? "Saving..." : "Save"}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => deleteViewItem(it.id)}
                                  className="text-xs font-bold text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesMaster;
