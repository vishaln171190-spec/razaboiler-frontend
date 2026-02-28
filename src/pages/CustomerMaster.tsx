import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Building,
  Store,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  User,
  Trash2,
  Edit2,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { getCookie } from '../utils/cookieHelper';
import { getAuthUser, hasPermission, hasRole } from '../utils/auth';

type Customer = {
  id: number | string;
  type: 'Hotel' | 'Shop' | string;
  name: string;
  poc: string;
  phone: string;
  email?: string;
  location: string;
};
import { API_BASE_URL } from "../../constants";

export default function CustomerMaster(): JSX.Element {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, 'admin');
  const canView = isAdmin || hasPermission(authUser, 'master_customer');
  const canCreate = isAdmin || hasPermission(authUser, 'master_customer');
  const canEdit = isAdmin || hasPermission(authUser, 'master_customer');
  const canDelete = isAdmin || hasPermission(authUser, 'master_customer');
  const canMutate = canCreate || canEdit;

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterType, setFilterType] = useState<'All' | 'Hotel' | 'Shop'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ type: 'Hotel', name: '', poc: '', phone: '', email: '', location: '' });
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Use cookie-based auth token if present
  const getAuthHeaders = () => {
    const token = getCookie('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchCustomers();
  }, [canView]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/customers`, { method: 'GET', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      // Accept either data.data or data as array
      const list = (data.data || data || []) as any[];
      const mapped = list.map((c) => ({
        id: c.id ?? c.customer_id ?? c._id ?? Math.random().toString(36).slice(2),
        type: c.customer_typeid === 1 || c.customer_type === 'Hotel' ? 'Hotel' : 'Shop',
        name: c.customer_name || c.name || '',
        poc: c.customer_owner_name || c.poc || '',
        phone: c.customer_mobile || c.phone || '',
        email: c.customer_email || c.email || '',
        location: c.customer_location || c.location || '',
      }));
      // sort by name
      mapped.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(mapped as Customer[]);
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to load customers.' });
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (type: string, text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !canEdit) {
      showStatus('error', 'You do not have permission to update customers.');
      return;
    }
    if (!editingId && !canCreate) {
      showStatus('error', 'You do not have permission to create customers.');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length !== 10) {
      showStatus('error', 'Phone number must be exactly 10 digits.');
      return;
    }

    setSaving(true);
    try {
      // map type to type id expected by API
      const typeId = formData.type === 'Hotel' ? 1 : 2;
      const payload = {
        customer_name: formData.name,
        customer_typeid: String(typeId),
        customer_mobile: formData.phone,
        customer_email: formData.email || '',
        customer_owner_name: formData.poc,
        customer_alternate_number: '',
        customer_location: formData.location,
        totalsaleinkg: '0',
        totalbuisness: '0',
        totalbalance: '0',
        status: 'active',
      };

      if (editingId) {
        const res = await fetch(`${API_BASE_URL}/customers/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Update failed');
        showStatus('success', 'Customer updated successfully!');
        // update local state
        setCustomers((prev) => prev.map((c) => (String(c.id) === String(editingId) ? { ...c, ...formData } : c)));
        setEditingId(null);
      } else {
        const res = await fetch(`${API_BASE_URL}/customers`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        const data = await res.json();
        // try to extract new id
        const newId = data.data?.id ?? data.id ?? Math.random().toString(36).slice(2);
        const newCustomer: Customer = { id: newId, ...formData } as Customer;
        setCustomers((p) => [...p, newCustomer]);
        showStatus('success', 'Customer added successfully!');
      }

      setFormData({ type: 'Hotel', name: '', poc: '', phone: '', email: '', location: '' });
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    if (!canEdit) {
      showStatus('error', 'You do not have permission to edit customers.');
      return;
    }
    setEditingId(customer.id);
    setFormData({ type: customer.type || 'Hotel', name: customer.name || '', poc: customer.poc || '', phone: customer.phone || '', email: customer.email || '', location: customer.location || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number | string) => {
    if (!canDelete) {
      showStatus('error', 'You do not have permission to delete customers.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      setCustomers((p) => p.filter((c) => String(c.id) !== String(id)));
      showStatus('success', 'Customer deleted.');
    } catch (err) {
      console.error(err);
      showStatus('error', 'Delete failed.');
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesType = filterType === 'All' || c.type === filterType;
      const q = searchQuery.toLowerCase();
      const matchesSearch = (c.name || '').toLowerCase().includes(q) || (c.poc || '').toLowerCase().includes(q) || (c.location || '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [customers, filterType, searchQuery]);

  if (!canView) return <div className="p-8 text-center text-slate-500">You do not have permission to view Customer Master.</div>;
  if (loading) return <div className="p-8 text-center text-slate-500">Loading Customer Master...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="flex h-full min-h-screen">
            <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Customer Master</h1>
              <p className="text-slate-500 font-medium">Manage your database of Hotels and Shops</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 shadow-sm text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Role: Owner
            </div>
          </header>

          {statusMsg.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {statusMsg.type === 'success' ? <Check size={20} /> : <X size={20} />}
              <span className="font-medium">{statusMsg.text}</span>
            </div>
          )}

          {canMutate && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Plus size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? 'Edit Customer Details' : 'Register New Customer'}</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer Type</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'Hotel' })} className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 transition-all duration-200 ${formData.type === 'Hotel' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md ring-4 ring-blue-50' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100'}`}>
                    <Building size={22} />
                    <span className="font-bold">Hotel</span>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'Shop' })} className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 transition-all duration-200 ${formData.type === 'Shop' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md ring-4 ring-blue-50' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100'}`}>
                    <Store size={22} />
                    <span className="font-bold">Shop</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
                  <div className="relative group">
                    <Building className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input required name="name" value={formData.name} onChange={handleInputChange} placeholder='e.g., Hotel/Shop Radhika' className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-medium placeholder:text-slate-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">POC Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input required name="poc" value={formData.poc} onChange={handleInputChange} placeholder='Contact Person Name' className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-medium placeholder:text-slate-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input required type="tel" maxLength={10} name="phone" value={formData.phone} onChange={handleInputChange} placeholder='10-digit Mobile' className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-medium placeholder:text-slate-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email ID (Optional)</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder='customer@email.com' className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-medium placeholder:text-slate-300" />
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Location / Area</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input required name="location" value={formData.location} onChange={handleInputChange} placeholder='e.g., Nashik Road, City Center' className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-medium placeholder:text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2">
                  <Plus size={20} />
                  {editingId ? 'Update Information' : 'Save Customer'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setFormData({ type: 'Hotel', name: '', poc: '', phone: '', email: '', location: '' }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 px-10 rounded-xl transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            </section>
          )}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12">
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Filter size={18} className="text-slate-400" />
                </div>
                <div className="flex p-1 bg-slate-100/80 rounded-xl">
                  {['All', 'Hotel', 'Shop'].map((t) => (
                    <button key={t} onClick={() => setFilterType(t as any)} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${filterType === t ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                      {t === 'All' ? 'All' : (t === 'Hotel' ? 'Hotels' : 'Shops')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input type="text" placeholder="Quick search database..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-4 focus:ring-blue-50/50 focus:bg-white focus:border-blue-400 outline-none transition-all font-medium" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Name</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">POC Name</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Info</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</th>
                    {(canEdit || canDelete) && (
                      <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${c.type === 'Hotel' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {c.type === 'Hotel' ? <Building size={12} strokeWidth={2.5} /> : <Store size={12} strokeWidth={2.5} />}
                            {c.type}
                          </span>
                        </td>
                        <td className="px-8 py-6"><div className="font-extrabold text-slate-800 text-lg tracking-tight">{c.name}</div></td>
                        <td className="px-8 py-6 text-slate-600 font-bold">{c.poc}</td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1"><Phone size={14} className="text-blue-400" />{c.phone}</div>
                          {c.email && (<div className="text-xs text-slate-400 flex items-center gap-2 font-medium"><Mail size={14} />{c.email}</div>)}
                        </td>
                        <td className="px-8 py-6 text-slate-600"><div className="flex items-center gap-2 font-semibold"><MapPin size={16} className="text-rose-400" />{c.location}</div></td>
                        {(canEdit || canDelete) && (
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-3 md:opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                              {canEdit && (
                                <button onClick={() => handleEdit(c)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all hover:shadow-sm active:scale-90" title="Edit Entry"><Edit2 size={18} /></button>
                              )}
                              {canDelete && (
                                <button onClick={() => handleDelete(c.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all hover:shadow-sm active:scale-90" title="Delete Entry"><Trash2 size={18} /></button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 6 : 5} className="px-8 py-20 text-center text-slate-400 bg-slate-50/30">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-white rounded-full shadow-sm border border-slate-100"><Search size={48} className="text-slate-200" strokeWidth={1} /></div>
                          <div className="space-y-1"><p className="font-bold text-slate-600">No customers found</p><p className="text-sm text-slate-400">Try adjusting your filters or search terms.</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Database Status: Connected</span>
              <span>Showing {filteredCustomers.length} of {customers.length} records</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
