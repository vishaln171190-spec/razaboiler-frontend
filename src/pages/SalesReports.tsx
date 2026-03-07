import React, { useState } from 'react';
import { Calendar } from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";
import { API_BASE_URL } from "../../constants";
const SalesReports: React.FC = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "report_sales");
  // States for filters
  const [customer, setCustomer] = useState('');
  const [itemType, setItemType] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemTypes, setItemTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth header helper
  const getAuthHeaders = () => {
    const token = getCookie("auth_token");
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, { method: 'GET', headers: getAuthHeaders() });
      const data = await res.json();
      const list = (data.data || data || []);
      setCustomers(list.map((c: any) => ({
        id: c.id ?? c.customer_id ?? c._id ?? Math.random().toString(36).slice(2),
        name: c.customer_name || c.customername || c.name || '',
      })));
    } catch (err) {
      setError("Failed to load customers");
    }
  };

  // Fetch items
  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/items`, { method: 'GET', headers: getAuthHeaders() });
      const data = await res.json();
      const list = (data.data || data || []);
      setItemTypes(list.map((i: any) => ({
        id: i.id ?? i.item_id ?? i._id ?? Math.random().toString(36).slice(2),
        name: i.itemname || i.name || '',
      })));
    } catch (err) {
      setError("Failed to load items");
    }
  };

  // Load dropdowns on mount
  React.useEffect(() => {
    Promise.all([fetchCustomers(), fetchItems()]).finally(() => setLoading(false));
  }, []);

  // Date range calculation
  const getDateRange = () => {
    const today = new Date();
    let start_date = '', end_date = '';
    switch (dateFilter) {
      case 'today':
        start_date = end_date = today.toISOString().slice(0, 10);
        break;
      case 'yesterday':
        const yest = new Date(today);
        yest.setDate(today.getDate() - 1);
        start_date = end_date = yest.toISOString().slice(0, 10);
        break;
      case 'thisweek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start_date = weekStart.toISOString().slice(0, 10);
        end_date = today.toISOString().slice(0, 10);
        break;
      case 'thismonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start_date = monthStart.toISOString().slice(0, 10);
        end_date = today.toISOString().slice(0, 10);
        break;
      case 'customdate':
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
    const url = `${API_BASE_URL}/reports/sales?customerid=${customer}&start_date=${start_date}&end_date=${end_date}&itemid=${itemType}`;
    try {
      const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch report');
      const data = await res.json();
      // Normalize data for table
      const rows = (data.data || data || []).map((row: any) => ({
        customername: row.customername || row.customer_name || row.customer || '',
        item: row.itemname || row.item || row.name || '',
        weight: row.sale_weight || row.weight || 0,
        rate: row.sale_rate || row.rate || 0,
        total: row.total_amount || row.total || (row.sale_weight * row.sale_rate) || 0,
      }));
      setReportData(rows);
    } catch (err) {
      setError("Failed to fetch report");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportExcel = () => {
    if (!reportData.length) {
      alert('No data to export!');
      return;
    }
    // Convert to CSV
    const csvRows = [
      ['Customer', 'Item', 'Sale Weight', 'Sale Rate', 'Total Amount'],
      ...reportData.map((row: any) => [row.customername, row.item, row.weight, row.rate, row.total]),
    ];
    const csvContent = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate total amount
  const totalAmount = reportData.reduce((sum, row) => sum + Number(row.total), 0);

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Sales Reports.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <span className="h-10 w-10 animate-spin rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">⏳</span>
          <p className="text-sm font-medium text-slate-500">Loading Sales Report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <span className="font-bold">SR</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Sales Reports</h1>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Report</p>
              </div>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3 md:gap-6">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
              {/* Date filter UI */}
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer"
              >
                <option value='today'>Today</option>
                <option value='yesterday'>Yesterday</option>
                <option value='thisweek'>This Week</option>
                <option value='thismonth'>This Month</option>
                <option value='customdate'>Custom Date</option>
              </select>
              {dateFilter === 'customdate' && (
                <div className="flex gap-2 mt-2">
                  <input type='date' value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer" />
                  <input type='date' value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">{error}</div>
        )}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Filters</h2>
          </div>
          <div className="px-6 py-4 flex flex-wrap gap-4">
            <select value={customer} onChange={e => setCustomer(e.target.value)} className="w-64 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option value=''>Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={itemType} onChange={e => setItemType(e.target.value)} className="w-64 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option value=''>Select Item Type</option>
              {itemTypes.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <button onClick={getReport} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400">
              {loading ? 'Loading...' : 'Get Report'}
            </button>
            <button onClick={exportExcel} className="px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400">
              Export
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 mt-6">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Sales Report</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/80 uppercase text-[10px] font-black tracking-widest text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Sale Weight</th>
                  <th className="px-6 py-4">Sale Rate</th>
                  <th className="px-6 py-4">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No sales found.</td>
                  </tr>
                ) : (
                  reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-700">{row.customername}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{row.item}</td>
                      <td className="px-6 py-4 text-slate-600">{row.weight}</td>
                      <td className="px-6 py-4 text-slate-600">{row.rate}</td>
                      <td className="px-6 py-4 text-slate-900 font-bold">{row.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportData.length > 0 && (
                <tfoot className="bg-slate-900 text-white shadow-2xl">
                  <tr>
                    <td className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Total Amount</td>
                    <td colSpan={4} className="px-6 py-4 text-right font-bold">{totalAmount.toFixed(2)}</td>
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

export default SalesReports;
