import React, { useEffect, useMemo, useState } from "react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";
import { API_BASE_URL } from "../../constants";
import { Calendar, Edit, Eye, EyeIcon } from "lucide-react";

type Customer = { id: number | string; name?: string; type?: "Hotel" | "Shop" };
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
  const canView = isAdmin || hasPermission(authUser, "daily_sale");
  const canCreate = isAdmin || hasPermission(authUser, "daily_sale");
  const canEdit = isAdmin || hasPermission(authUser, "daily_sale");
  const canDelete = isAdmin || hasPermission(authUser, "daily_sale");
  const canMutate = canCreate || canEdit;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [draftErrors, setDraftErrors] = useState<{ itemid?: string; itemqty?: string }>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerTab, setCustomerTab] = useState<"Hotel" | "Shop">("Hotel");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [viewEditReason, setViewEditReason] = useState("");
  const [formData, setFormData] = useState({
    customerid: "",
    saledate: new Date().toISOString().split("T")[0],
    salestatus: "open",
    created_by: "1",
  });

  // State for view modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewSaleItems, setViewSaleItems] = useState<SaleItem[]>([]);
  const [viewSaleTitle, setViewSaleTitle] = useState<string>("");
  const [viewSaleDate, setViewSaleDate] = useState<string>("");
  const [viewSaleTotal, setViewSaleTotal] = useState<number>(0);
  // Helper to compute total sale amount for view modal
  const computeViewTotal = (items: SaleItem[], editRows: { [idx: number]: { editMode: boolean; editWeight: number; editRate: number } }) => {
    return items.reduce((sum, it, idx) => {
      const rowEdit = editRows[idx];
      const weight = rowEdit?.editMode ? rowEdit.editWeight : it.itemweight ?? 0;
      const rate = rowEdit?.editMode ? rowEdit.editRate : it.salerate ?? 0;
      return sum + (Number(weight) * Number(rate));
    }, 0);
  };
  // Per-row edit state for view modal
  const [viewEditRows, setViewEditRows] = useState<{ [idx: number]: { editMode: boolean; editWeight: number; editRate: number } }>({});

  // Fetch sale items for draft table when customer, date, or status changes
  useEffect(() => {
    const fetchDraftSaleItems = async () => {
      if (!formData.customerid || !formData.saledate || !formData.salestatus) return;
      try {
        const params = new URLSearchParams({
          customerid: String(formData.customerid),
          saledate: formData.saledate,
          status: formData.salestatus,
        }).toString();
        const res = await fetch(`${API_BASE_URL}/sales/getsaleitems?${params}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to fetch sale items");
        const data = await res.json();
        // Map response to saleItems format
        const items = (data.data || data || []).map((it: any) => ({
          id: it.saleitemid,
          itemid: it.itemid,
          itemname: it.itemname,
          orderweight: it.orderedweight ?? 0,
          deliveryweight: it.deliveredweight ?? 0,
          deliveryrate: it.deliveryrate ?? 0,
          deliverystatus: it.deliverystatus ?? "pending",
        }));
        setSaleItems(items);
      } catch (err) {
        console.error(err);
        // Optionally show error toast
      }
    };
    fetchDraftSaleItems();
  }, [formData.customerid, formData.saledate, formData.salestatus]);

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
      name: c.customer_name || c.name || "",
      type:
        c.customer_typeid === 1 || c.customer_typeid === "1" || c.customer_type === "Hotel"
          ? "Hotel"
          : "Shop",
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

  const normalizeSaleItem = (it: any): SaleItem => ({
    id: it.id ?? it.saleitem_id ?? it.sale_item_id ?? it._id,
    saleid: it.saleid ?? it.sale_id ?? it.id ?? it.sale,
    itemid: it.itemid ?? it.item_id ?? it.id ?? it.item,
    itemweight: Number(it.itemweight ?? it.item_weight ?? it.weight ?? 0),
    itemqty: Number(it.itemqty ?? it.qty ?? it.quantity ?? 0),
    actualrate: Number(it.actualrate ?? it.actual_rate ?? 0),
    salerate: Number(it.salerate ?? it.sale_rate ?? 0),
    discounttype: it.discounttype ?? it.discount_type ?? "flat",
    discount: Number(it.discount ?? 0),
    totalsale: Number(it.totalsale ?? 0),
  });

  const fetchSales = async (date?: string) => {
    const res = await fetch(`${API_BASE_URL}/sales?saledate=${date || ""}`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map((s) => ({
      id: s.id ?? s.sale_id ?? s._id ?? Math.random().toString(36).slice(2),
      customerid: s.customerid ?? s.customer_id ?? s.customer ?? s.customerid_id ?? "",
      saledate: s.saledate ?? s.sale_date ?? s.date ?? "",
      total_sale: Number(s.total_sale ?? s.total ?? 0),
      salestatus: s.salestatus ?? s.status ?? "open",
    })) as Sale[];
  };

  const fetchSaleItems = async (saleId: string | number) => {
    const res = await fetch(`${API_BASE_URL}/saleitems/${saleId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map(normalizeSaleItem) as SaleItem[];
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, i, s] = await Promise.all([fetchCustomers(), fetchItems(), fetchSales()]);
      setCustomers(c);
      setItems(i);
      setSales(s);
    } catch (err) {
      console.error(err);
      showToast("Failed to load sale data", "error");
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

  useEffect(() => {
    if (editingId) return;
    setFormData((prev) => ({ ...prev, saledate: selectedDate }));
  }, [selectedDate, editingId]);

  useEffect(() => {
    const selected = customers.find((c) => String(c.id) === String(formData.customerid));
    if (selected) {
      setCustomerSearch(selected.name || "");
    }
  }, [formData.customerid, customers]);

  const computeTotalSale = (item: SaleItem) => {
    let total = (Number(item.itemqty) * Number(item.salerate));
    if (item.discounttype === "percent") {
      total -= total * (Number(item.discount) / 100);
    } else {
      total -= Number(item.discount);
    }
    return total;
  };

  const removeDraftItem = (id?: number | string) => {
    if (!id) return;
    setSaleItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
  };

  // Calculate total sale amount
  const totalSaleAmount = saleItems.reduce((sum, it) => sum + computeTotalSale(it), 0);

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
      showToast("Please fill in required fields", "error");
      return;
    }
    if (editingId && !editReason.trim()) {
      showToast("Reason is required while editing", "error");
      return;
    }
    if (saleItems.length === 0) {
      showToast("Please add at least one sale item", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerid: Number(formData.customerid),
        saledate: formData.saledate,
        salestatus: formData.salestatus,
        created_by: Number(formData.created_by || 1),
        items: saleItems.map((it) => ({
          itemid: Number(it.itemid),
          itemweight: Number(it.deliveryweight || 0),
          itemqty: Number(it.itemqty || 0),
          actualrate: Number(it.deliveryrate || 0),
          salerate: Number(it.salerate || 0),
          discounttype: it.discounttype ?? "flat",
          discount: Number(it.discount || 0),
          totalsale: computeTotalSale(it),
          created_by: Number(formData.created_by || 1),
        })),
      };

      const res = await fetch(`${API_BASE_URL}/sales${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast(editingId ? "Sale updated" : "Sale created", "success");
      setEditingId(null);
      setFormData({
        customerid: "",
        saledate: selectedDate,
        salestatus: "open",
        created_by: "1",
      });
      setSaleItems([]);
      setShowItemForm(false);
      setEditReason("");
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to save sale", "error");
    } finally {
      setSaving(false);
    }
  };

  const openViewModal = async (row: any) => {
    setViewSaleTitle(`Sale for ${customers.find(c => String(c.id) === String(row.customerid))?.name || `Customer ${row.customerid}`}`);
    setViewSaleDate(row.saledate?.split("T")[0] || "");
    setViewSaleTotal(row.total_sale ?? 0);
    const items = await fetchSaleItems(row.id);
    setViewSaleItems(items);
    setViewEditReason("");
    setViewModalOpen(true);
  };

  const formCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => {
      const typeMatch = (c.type || "Shop") === customerTab;
      const searchMatch = !q || (c.name || "").toLowerCase().includes(q);
      return typeMatch && searchMatch;
    });
  }, [customers, customerSearch, customerTab]);

  const filteredSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    return sales.filter((row) => {
      const sameDate = (row.saledate || "").split("T")[0] === selectedDate;
      if (!sameDate) return false;
      const customer = customers.find((c) => String(c.id) === String(row.customerid));
      const sameType = (customer?.type || "Shop") === customerTab;
      if (!sameType) return false;
      if (!q) return true;
      const name = (customer?.name || "").toLowerCase();
      const status = (row.salestatus || "").toLowerCase();
      const date = (row.saledate || "").split("T")[0].toLowerCase();
      return name.includes(q) || status.includes(q) || date.includes(q);
    });
  }, [sales, selectedDate, customerTab, saleSearch, customers]);

  const filteredSalesTotal = useMemo(
    () => filteredSales.reduce((sum, row: any) => sum + Number(row.total_sale || 0), 0),
    [filteredSales]
  );
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <span className="h-10 w-10 animate-spin rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">⏳</span>
          <p className="text-sm font-medium text-slate-500">Loading Sales...</p>
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
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${msg.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          <span className="font-medium">{msg.text}</span>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <span className="font-bold">S</span>
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
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={async (e) => {
                      const newDate = e.target.value;
                      setSelectedDate(newDate);
                      const nextSales = await fetchSales(newDate);
                      setSales(nextSales);
                    }}
                    className="h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {canMutate && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">{editingId ? "Update Sale" : "Create Sale"}</h2>
            </div>
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 p-1 w-fit">
                {(["Hotel", "Shop"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setCustomerTab(tab);
                      setFormData((prev) => ({ ...prev, customerid: "" }));
                    }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full ${
                      customerTab === tab ? "bg-emerald-600 text-white" : "text-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Customer</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomerSearch(value);
                    setFormData((prev) => ({ ...prev, customerid: "" }));
                    setShowCustomerDropdown(Boolean(value.trim()));
                  }}
                  onFocus={() => {
                    if (customerSearch.trim()) setShowCustomerDropdown(true);
                  }}
                  placeholder="Search customer..."
                  className="mb-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                />
                {showCustomerDropdown && customerSearch.trim() && (
                <div className="max-h-36 overflow-auto rounded-lg border border-slate-200">
                  {formCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">No customer found</p>
                  ) : (
                    formCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, customerid: String(c.id) }));
                          setCustomerSearch(c.name || "");
                          setShowCustomerDropdown(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 ${
                          String(formData.customerid) === String(c.id) ? "bg-emerald-100 text-emerald-700 font-semibold" : ""
                        }`}
                      >
                        {c.name || `Customer ${c.id}`}
                      </button>
                    ))
                  )}
                </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Sale Status</label>
                <select value={formData.salestatus} onChange={e => setFormData({ ...formData, salestatus: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {editingId && (
                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Reason For Edit</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Enter reason"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    required
                  />
                </div>
              )}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sale Items</p>
                  <button type="button" onClick={() => setShowItemForm((v) => !v)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">{showItemForm ? "Hide Add Item" : "Add Item"}</button>
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3 text-right">Order Weight</th>
                        <th className="px-4 py-3 text-right">Delivery Weight</th>
                        <th className="px-4 py-3 text-right">Sale Rate</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Delivery Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {saleItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">No items added yet.</td>
                        </tr>
                      ) : (
                        saleItems.map((it, idx) => {
                          const amount = Number(it.deliveryweight ?? 0) * Number(it.salerate ?? 0);
                          return (
                            <tr key={it.id ?? `${it.itemid}`}> 
                              <td className="px-4 py-3 font-semibold text-slate-700">{it.itemname ?? items.find(item => item.id === it.itemid)?.name ?? `Item ${it.itemid}`}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                <input type="number" value={it.orderweight ?? 0} onChange={e => setSaleItems(items => items.map((x, i) => i === idx ? { ...x, orderweight: Number(e.target.value) } : x))} className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right" />
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                <input type="number" value={it.deliveryweight ?? 0} onChange={e => setSaleItems(items => items.map((x, i) => i === idx ? { ...x, deliveryweight: Number(e.target.value) } : x))} className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right" />
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                <input type="number" value={it.salerate ?? 0} onChange={e => setSaleItems(items => items.map((x, i) => i === idx ? { ...x, salerate: Number(e.target.value) } : x))} className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right" />
                              </td>
                              <td className="px-4 py-3 text-right font-bold">{amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700">{it.deliverystatus}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button type="button" onClick={() => removeDraftItem(it.id)} className="text-xs font-bold text-red-600 hover:text-red-700">Remove</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {/* Total Amount Row */}
                    {saleItems.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right font-black uppercase text-[10px] text-slate-400">Total Amount</td>
                          <td className="px-4 py-3 text-right font-bold">
                            {saleItems.reduce((sum, it) => sum + (Number(it.deliveryweight ?? 0) * Number(it.salerate ?? 0)), 0).toFixed(2)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              <div className="md:col-span-3 flex items-center justify-end">
                <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400">
                  {saving ? "Saving..." : editingId ? "Update Sale" : "Save Sale"}
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50/80">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{customerTab} Sales</p>
            <input type="text" value={saleSearch} onChange={e => setSaleSearch(e.target.value)} placeholder="Filter by customer, status, or date" className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/80 uppercase text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Sale Status</th>
                  <th className="px-5 py-4">Sale Date</th>
                  <th className="px-5 text-right py-4">Sale Amount</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-24 text-center text-slate-400">No sales found.</td>
                  </tr>
                ) : (
                  filteredSales.map((row) => (
                    <tr key={row.id} className="group hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-800">{customers.find(c => String(c.id) === String(row.customerid))?.name || `Customer ${row.customerid}`}</td>
                      <td className="px-5 py-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">{row.salestatus || "open"}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-semibold">{row.saledate?.split("T")[0] || ""}</td>
                      <td className="px-5 py-3 text-right font-bold">{row.total_sale?.toFixed(2) || "0.00"}</td>
                      <td className="px-5 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openViewModal(row)} className="text-xs font-bold text-blue-600 hover:text-blue-700 ml-2"><EyeIcon className="w-4 h-4" /></button>
                      </td> 
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white shadow-2xl">
                <tr>
                  <td className="px-5 py-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Total Sale Amount</td>
                  <td colSpan={4} className="px-5 py-4 text-right font-bold">{filteredSalesTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
      {/* View Sale Items Modal */}
      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-2">{viewSaleTitle}</h3>
            <div className="mb-4 flex flex-col gap-1 text-sm text-slate-700">
              <div><span className="font-semibold">Sale Date:</span> {viewSaleDate}</div>
              <div><span className="font-semibold">Total Sale Amount:</span> {computeViewTotal(viewSaleItems, viewEditRows).toFixed(2)}</div>
              <input
                type="text"
                value={viewEditReason}
                onChange={(e) => setViewEditReason(e.target.value)}
                placeholder="Reason for edit"
                className="mt-2 rounded border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <table className="w-full text-left text-sm border-collapse mb-4">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3 text-right">Item Weight</th>
                  <th className="px-4 py-3 text-right">Sale Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewSaleItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">No items found.</td>
                  </tr>
                ) : (
                  viewSaleItems.map((it, idx) => {
                    const amount = Number(it.deliveryweight ?? 0) * Number(it.salerate ?? 0);
                    const rowState = viewEditRows[idx] || { editMode: false, editWeight: it.itemweight ?? 0, editRate: it.salerate ?? 0 };
                    const handleEdit = () => {
                      setViewEditRows(rows => ({
                        ...rows,
                        [idx]: {
                          editMode: true,
                          editWeight: it.itemweight ?? 0,
                          editRate: it.salerate ?? 0,
                        },
                      }));
                    };
                    const handleChangeWeight = (val: number) => {
                      setViewEditRows(rows => ({
                        ...rows,
                        [idx]: {
                          ...rows[idx],
                          editWeight: val,
                        },
                      }));
                    };
                    const handleChangeRate = (val: number) => {
                      setViewEditRows(rows => ({
                        ...rows,
                        [idx]: {
                          ...rows[idx],
                          editRate: val,
                        },
                      }));
                    };
                    const handleSave = async () => {
                      if (!viewEditReason.trim()) {
                        showToast("Reason is required while editing", "error");
                        return;
                      }
                      try {
                        const res = await fetch(`${API_BASE_URL}/saleitems/${it.id}`, {
                          method: "PUT",
                          headers: getAuthHeaders(),
                          body: JSON.stringify({
                            itemweight: rowState.editWeight,
                            salerate: rowState.editRate,
                          }),
                        });
                        if (!res.ok) throw new Error("Failed to update sale item");
                        setViewEditRows(rows => ({
                          ...rows,
                          [idx]: {
                            ...rows[idx],
                            editMode: false,
                          },
                        }));
                        setViewSaleItems(items => items.map((x, i) => i === idx ? { ...x, itemweight: rowState.editWeight, salerate: rowState.editRate } : x));
                        showToast("Sale item updated", "success");
                        setViewEditReason("");
                      } catch (err) {
                        showToast("Failed to update sale item", "error");
                      }
                    };
                    return (
                      <tr key={it.id ?? `${it.itemid}`}> 
                        <td className="px-4 py-3 font-semibold text-slate-700">{it.itemname ?? items.find(item => item.id === it.itemid)?.name ?? `Item ${it.itemid}`}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {rowState.editMode ? (
                            <input type="number" value={rowState.editWeight} onChange={e => handleChangeWeight(Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right" />
                          ) : (
                            it.itemweight ?? 0
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {rowState.editMode ? (
                            <input type="number" value={rowState.editRate} onChange={e => handleChangeRate(Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right" />
                          ) : (
                            it.salerate ?? 0
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{(rowState.editMode ? (Number(rowState.editWeight) * Number(rowState.editRate)) : (Number(it.itemweight ?? 0) * Number(it.salerate ?? 0))).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {rowState.editMode ? (
                            <button type="button" onClick={handleSave} className="px-3 py-1 rounded bg-emerald-600 text-white font-bold">Save</button>
                          ) : (
                            <button type="button" onClick={handleEdit} className="px-3 py-1 rounded bg-blue-600 text-white font-bold">Edit</button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="flex justify-end">
              <button type="button" onClick={() => setViewModalOpen(false)} className="px-4 py-2 rounded bg-slate-200 font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesMaster;








