import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, ClipboardEdit, PlusCircle, Trash2, Wallet } from "lucide-react";
import { API_BASE_URL } from "../../constants";
import { getAuthToken, getAuthUser, hasPermission, hasRole } from "../utils/auth";

type Payment = {
  id: number | string;
  usertype: "customer" | "company" | string;
  userid: number | string;
  name?: string;
  paymentamount: number;
  paymenttype: "paid" | "received" | string;
  paymentmode: "cash" | "online" | "cheque" | string;
  transaction_cheque_no?: string;
  paymentdate: string;
};

type Entity = {
  id: number | string;
  name?: string;
  customer_name?: string;
  company_name?: string;
};

const today = new Date().toISOString().split("T")[0];

const PaymentMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const hasAnyPaymentPermission = () =>
    ["daily_payment", "daily_payments", "daily_payment_master"].some((perm) => hasPermission(authUser, perm));
  const canView = isAdmin || hasAnyPaymentPermission();
  const canCreate = isAdmin || hasAnyPaymentPermission();
  const canEdit = isAdmin || hasAnyPaymentPermission();
  const canDelete = isAdmin || hasAnyPaymentPermission();
  const canMutate = canCreate || canEdit;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Entity[]>([]);
  const [companies, setCompanies] = useState<Entity[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [filters, setFilters] = useState({
    usertype: "all",
    paymenttype: "all",
    paymentmode: "all",
  });

  const [formData, setFormData] = useState({
    usertype: "customer",
    userid: "",
    paymentamount: "",
    paymenttype: "paid",
    paymentmode: "online",
    transaction_cheque_no: "",
    paymentdate: today,
    created_by: "1",
    updated_by: "1",
  });

  const showToast = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const extractList = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  };

  const extractItem = (payload: any): any => {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] ?? null;
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    if (payload?.result && !Array.isArray(payload.result)) return payload.result;
    return payload;
  };

  const getAuthHeaders = () => {
    const rawToken = getAuthToken();
    const token = typeof rawToken === "string" ? rawToken.replace(/^Bearer\s+/i, "").trim() : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const normalizePayment = (raw: any): Payment => ({
    id: raw.id ?? raw.payment_id ?? raw._id ?? Math.random().toString(36).slice(2),
    usertype: raw.usertype ?? raw.user_type ?? "customer",
    userid: raw.userid ?? raw.user_id ?? "",
    name:
      raw.name ??
      raw.customer_user?.name ??
      raw.company_user?.name ??
      raw.customer_master?.name ??
      raw.company_master?.name ??
      raw.customer_name ??
      raw.company_name ??
      "",
    paymentamount: Number(raw.paymentamount ?? raw.payment_amount ?? 0),
    paymenttype: raw.paymenttype ?? raw.payment_type ?? "paid",
    paymentmode: raw.paymentmode ?? raw.payment_mode ?? "online",
    transaction_cheque_no: raw.transaction_cheque_no ?? raw.transaction_no ?? "",
    paymentdate: raw.paymentdate ?? raw.payment_date ?? "",
  });

  const normalizeEntity = (raw: any): Entity => ({
    id: raw.id ?? raw.customer_id ?? raw.company_id ?? raw._id ?? Math.random().toString(36).slice(2),
    name: raw.name ?? raw.customer_name ?? raw.company_name ?? "",
    customer_name: raw.customer_name,
    company_name: raw.company_name,
  });

  const fetchCustomers = async () => {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch customers");
    const data = await res.json();
    const list = extractList(data);
    return list.map(normalizeEntity);
  };

  const fetchCompanies = async () => {
    const res = await fetch(`${API_BASE_URL}/company-master`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch companies");
    const data = await res.json();
    const list = extractList(data);
    return list.map(normalizeEntity);
  };

  const fetchPayments = async () => {
    const params = new URLSearchParams();
    if (selectedDate) params.set("paymentdate", selectedDate);
    if (filters.usertype !== "all") params.set("usertype", filters.usertype);
    if (filters.paymenttype !== "all") params.set("paymenttype", filters.paymenttype);
    if (filters.paymentmode !== "all") params.set("paymentmode", filters.paymentmode);
    if (nameFilter.trim()) params.set("name", nameFilter.trim());
    const query = params.toString();
    const res = await fetch(`${API_BASE_URL}/payments${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch payments");
    const data = await res.json();
    const list = extractList(data);
    return list.map(normalizePayment);
  };

  const fetchPaymentById = async (id: string | number) => {
    const res = await fetch(`${API_BASE_URL}/payments/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch payment details");
    const data = await res.json();
    return normalizePayment(extractItem(data));
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [p, c, co] = await Promise.all([fetchPayments(), fetchCustomers(), fetchCompanies()]);
      setPayments(p);
      setCustomers(c);
      setCompanies(co);
    } catch (err) {
      console.error(err);
      showToast("Failed to load payment data", "error");
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
  }, [canView, selectedDate, filters.usertype, filters.paymenttype, filters.paymentmode, nameFilter]);

  const getEntityName = (usertype: string, id: number | string, fallbackName?: string) => {
    const source = String(usertype).toLowerCase() === "company" ? companies : customers;
    const found = source.find((e) => String(e.id) === String(id));
    return found?.name || found?.customer_name || found?.company_name || fallbackName || `${usertype} ${id}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !canEdit) {
      showToast("You do not have permission to update payments", "error");
      return;
    }
    if (!editingId && !canCreate) {
      showToast("You do not have permission to create payments", "error");
      return;
    }
    if (!formData.userid || !formData.paymentamount || !formData.paymentdate) {
      showToast("Please fill in required fields", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        usertype: formData.usertype,
        userid: Number(formData.userid),
        paymentamount: Number(formData.paymentamount),
        paymenttype: formData.paymenttype,
        paymentmode: formData.paymentmode,
        transaction_cheque_no: formData.transaction_cheque_no || null,
        paymentdate: formData.paymentdate,
        created_by: Number(formData.created_by || 1),
        updated_by: Number(formData.updated_by || 1),
      };

      const res = await fetch(`${API_BASE_URL}/payments${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");

      showToast(editingId ? "Payment updated" : "Payment created", "success");
      setEditingId(null);
      setFormData({
        usertype: "customer",
        userid: "",
        paymentamount: "",
        paymenttype: "paid",
        paymentmode: "online",
        transaction_cheque_no: "",
        paymentdate: today,
        created_by: "1",
        updated_by: "1",
      });
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Failed to save payment", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!canDelete) {
      showToast("You do not have permission to delete payments", "error");
      return;
    }
    if (!window.confirm("Delete this payment entry?")) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Payment deleted", "success");
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (row: Payment) => {
    if (!canEdit) {
      showToast("You do not have permission to edit payments", "error");
      return;
    }
    setSaving(true);
    try {
      const detail = await fetchPaymentById(row.id);
      setEditingId(detail.id);
      setFormData({
        usertype: detail.usertype,
        userid: String(detail.userid),
        paymentamount: String(detail.paymentamount || ""),
        paymenttype: detail.paymenttype || "paid",
        paymentmode: detail.paymentmode || "online",
        transaction_cheque_no: detail.transaction_cheque_no || "",
        paymentdate: detail.paymentdate?.split("T")[0] || today,
        created_by: "1",
        updated_by: "1",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      showToast("Failed to load payment details", "error");
    } finally {
      setSaving(false);
    }
  };

  const formEntities = useMemo(
    () => (formData.usertype === "company" ? companies : customers),
    [formData.usertype, companies, customers]
  );

  const filteredPayments = useMemo(() => payments, [payments]);

  const totals = useMemo(
    () =>
      filteredPayments.reduce(
        (acc, row) => {
          const amount = Number(row.paymentamount || 0);
          if (String(row.paymenttype).toLowerCase() === "received") acc.received += amount;
          else acc.paid += amount;
          acc.total += amount;
          return acc;
        },
        { paid: 0, received: 0, total: 0 }
      ),
    [filteredPayments]
  );

 if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <span className="h-10 w-10 animate-spin rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">⏳</span>
          <p className="text-sm font-medium text-slate-500">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Payment Master.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {msg && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 ${
            msg.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {msg.type === "error" ? <AlertCircle size={18} /> : <PlusCircle size={18} />}
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Payment Master</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Activity</p>
            </div>
          </div>

          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear Date
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {canMutate && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">
                {editingId ? "Update Payment" : "Create Payment"}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">User Type</label>
                <select
                  value={formData.usertype}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      usertype: e.target.value,
                      userid: "",
                    }))
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="customer">Customer</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                  {formData.usertype === "customer" ? "Customer" : "Company"}
                </label>
                <select
                  value={formData.userid}
                  onChange={(e) => setFormData((prev) => ({ ...prev, userid: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                  required
                >
                  <option value="">Select</option>
                  {formEntities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name || e.customer_name || e.company_name || `${formData.usertype} ${e.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Payment Date</label>
                <input
                  type="date"
                  value={formData.paymentdate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentdate: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Amount</label>
                <input
                  type="number"
                  value={formData.paymentamount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentamount: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Payment Type</label>
                <select
                  value={formData.paymenttype}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymenttype: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="paid">Paid</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Payment Mode</label>
                <select
                  value={formData.paymentmode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentmode: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="online">Online</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">
                  Transaction / Cheque No
                </label>
                <input
                  type="text"
                  value={formData.transaction_cheque_no}
                  onChange={(e) => setFormData((prev) => ({ ...prev, transaction_cheque_no: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                />
              </div>
              <div className="md:col-span-3 flex items-center justify-between">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        usertype: "customer",
                        userid: "",
                        paymentamount: "",
                        paymenttype: "paid",
                        paymentmode: "online",
                        transaction_cheque_no: "",
                        paymentdate: today,
                        created_by: "1",
                        updated_by: "1",
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
                  className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400"
                >
                  {saving ? "Saving..." : editingId ? "Update Payment" : "Save Payment"}
                  <PlusCircle size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50/80">
            <select
              value={filters.usertype}
              onChange={(e) => setFilters((prev) => ({ ...prev, usertype: e.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">All User Types</option>
              <option value="customer">Customer</option>
              <option value="company">Company</option>
            </select>
            <select
              value={filters.paymenttype}
              onChange={(e) => setFilters((prev) => ({ ...prev, paymenttype: e.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">All Payment Types</option>
              <option value="paid">Paid</option>
              <option value="received">Received</option>
            </select>
            <select
              value={filters.paymentmode}
              onChange={(e) => setFilters((prev) => ({ ...prev, paymentmode: e.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">All Modes</option>
              <option value="online">Online</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filter by name"
              className="h-9 flex-1 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/80 uppercase text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Payment Type</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4">Transaction/Cheque</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  {(canEdit || canDelete) && <th className="px-5 py-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit || canDelete ? 8 : 7} className="py-24 text-center text-slate-400">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((row) => (
                    <tr key={row.id} className="group hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-3 font-semibold capitalize text-slate-700">{row.usertype}</td>
                      <td className="px-5 py-3 font-bold text-slate-800">
                        {getEntityName(row.usertype, row.userid, row.name)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700">
                          {row.paymenttype}
                        </span>
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-700">{row.paymentmode}</td>
                      <td className="px-5 py-3 text-slate-600">{row.transaction_cheque_no || "-"}</td>
                      <td className="px-5 py-3 text-slate-700 font-semibold">{row.paymentdate?.split("T")[0] || ""}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-black text-slate-900">
                        Rs. {Number(row.paymentamount || 0).toFixed(2)}
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
                  ))
                )}
              </tbody>
              {filteredPayments.length > 0 && (
                <tfoot className="bg-slate-900 text-white shadow-2xl">
                  <tr>
                    <td className="px-5 py-4 font-black uppercase tracking-widest text-[10px] text-slate-400">
                      Totals
                    </td>
                    <td colSpan={3}></td>
                    <td className="px-5 py-4 text-right text-xs font-semibold text-rose-300">
                      Paid: Rs. {totals.paid.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-semibold text-emerald-300">
                      Received: Rs. {totals.received.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-xl font-black text-emerald-400">
                      Rs. {totals.total.toFixed(2)}
                    </td>
                    {(canEdit || canDelete) && <td></td>}
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

export default PaymentMaster;
