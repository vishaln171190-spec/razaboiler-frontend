import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Search,
  MapPin,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";

type Company = {
  id: number;
  name: string;
  gstin: string;
  pocName: string;
  pocPhone: string;
  email: string;
  location: string;
};

const API_BASE_URL = "http://127.0.0.1:8000/api";

const CompanyMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "master_company");
  const canCreate = isAdmin || hasPermission(authUser, "master_company");
  const canEdit = isAdmin || hasPermission(authUser, "master_company");
  const canDelete = isAdmin || hasPermission(authUser, "master_company");
  const canMutate = canCreate || canEdit;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    pocName: "",
    pocPhone: "",
    email: "",
    location: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Get auth token from cookie
  const getAuthHeaders = () => {
    const token = getCookie("auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch companies on component mount
  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchCompanies();
  }, [canView]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/company-master`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();
      
      // Map API response to Company type
      const mappedCompanies = (data.data || data).map((company: any) => ({
        id: company.id,
        name: company.company_name || "",
        gstin: company.company_gst_number || "",
        pocName: company.company_owner_name || "",
        pocPhone: company.company_mobile || "",
        email: company.company_email || "",
        location: company.company_location || "",
      }));

      setCompanies(mappedCompanies);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !canEdit) {
      setError("You do not have permission to update companies.");
      return;
    }
    if (!editingId && !canCreate) {
      setError("You do not have permission to create companies.");
      return;
    }
    if (!formData.name) return;

    setSaveLoading(true);
    setError("");

    try {
      const payload = {
        company_name: formData.name,
        company_mobile: formData.pocPhone,
        company_email: formData.email,
        company_owner_name: formData.pocName,
        company_location: formData.location,
        company_gst_number: formData.gstin.toUpperCase(),
        totalpurchaseinkg: "0",
        totalbuisness: "0",
        totalbalance: "0",
        status: "active",
      };

      if (editingId) {
        // Update company — use PUT method for updates
        const response = await fetch(`${API_BASE_URL}/company-master/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to update company");
        }

        setCompanies(
          companies.map((c) =>
            c.id === editingId
              ? {
                  ...c,
                  ...formData,
                  gstin: formData.gstin.toUpperCase(),
                }
              : c
          )
        );
        setEditingId(null);
      } else {
        // Create new company
        const response = await fetch(`${API_BASE_URL}/company-master`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to create company");
        }

        const data = await response.json();
        const newCompany: Company = {
          id: data.data?.id || Math.max(...companies.map((c) => c.id), 0) + 1,
          ...formData,
          gstin: formData.gstin.toUpperCase(),
        };

        setCompanies([...companies, newCompany]);
      }

      setFormData({ name: "", gstin: "", pocName: "", pocPhone: "", email: "", location: "" });
    } catch (err) {
      console.error("Error saving company:", err);
      setError("Failed to save company. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      setError("You do not have permission to delete companies.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this company?")) return;

    setSaveLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/company-master/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete company");
      }

      setCompanies(companies.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting company:", err);
      setError("Failed to delete company. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const startEdit = (company: Company) => {
    if (!canEdit) {
      setError("You do not have permission to edit companies.");
      return;
    }
    setFormData({
      name: company.name,
      gstin: company.gstin,
      pocName: company.pocName,
      pocPhone: company.pocPhone,
      email: company.email,
      location: company.location,
    });
    setEditingId(company.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Company Master.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 text-white">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Company Master</h1>
              <p className="text-slate-500 text-sm">Manage your suppliers and vendors list</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            {loading ? "Loading..." : "Connected"}
          </div>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* SECTION A: Create Company Form */}
        {canMutate && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              {editingId ? "Edit Company Details" : "Add New Company"}
              {editingId && (
                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Editing Mode
                </span>
              )}
            </h2>
          </div>

          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Corp"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* GST Number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">GST Number</label>
                <input
                  type="text"
                  placeholder="27AAAAA0000A1Z5"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none uppercase"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>

              {/* Location Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Location</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="City, State"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* POC Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">POC Name</label>
                <input
                  type="text"
                  placeholder="Person of Contact"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={formData.pocName}
                  onChange={(e) => setFormData({ ...formData, pocName: e.target.value })}
                />
              </div>

              {/* POC Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">POC Phone</label>
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  placeholder="10 digit mobile"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={formData.pocPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, pocPhone: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>

              {/* Email ID */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Email ID</label>
                <input
                  type="email"
                  placeholder="contact@company.com"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Action Button */}
              <div className="flex items-end gap-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={saveLoading || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2 px-8 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                  {saveLoading ? "Saving..." : editingId ? "Update Company" : "Save Company"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    disabled={saveLoading}
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        name: "",
                        gstin: "",
                        pocName: "",
                        pocPhone: "",
                        email: "",
                        location: "",
                      });
                    }}
                    className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-600 p-2 rounded-lg transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                )}
              </div>
            </div>
          </form>
          </div>
        )}

        {/* SECTION B: Company Directory */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 self-start">Company Directory</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search name, GST or location..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">
                      Company Name
                    </th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">
                      Location
                    </th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">
                      GSTIN
                    </th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">
                      POC Name
                    </th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">
                      Contact Details
                    </th>
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-4 font-bold text-slate-700 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 6 : 5} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p>Loading companies...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCompanies.length > 0 ? (
                    filteredCompanies.map((company) => (
                      <tr key={company.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-slate-900 border-r border-slate-100">
                          {company.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600 border-r border-slate-100 italic">
                          {company.location || "-"}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 border-r border-slate-100">
                          {company.gstin || (
                            <span className="text-slate-300 italic text-xs">No GST</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 border-r border-slate-100">
                          {company.pocName || "-"}
                        </td>
                        <td className="px-6 py-4 border-r border-slate-100">
                          <div className="space-y-1">
                            {company.pocPhone && (
                              <div className="flex items-center gap-2 text-slate-600 text-xs">
                                <Phone size={10} className="text-blue-500" />
                                <span>{company.pocPhone}</span>
                              </div>
                            )}
                            {company.email && (
                              <div className="flex items-center gap-2 text-slate-600 text-xs">
                                <Mail size={10} className="text-blue-500" />
                                <span className="truncate max-w-[120px]">{company.email}</span>
                              </div>
                            )}
                            {!company.pocPhone && !company.email && <span className="text-slate-300">-</span>}
                          </div>
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit && (
                                <button
                                  onClick={() => startEdit(company)}
                                  disabled={saveLoading}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(company.id)}
                                  disabled={saveLoading}
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
                      <td colSpan={canEdit || canDelete ? 6 : 5} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 size={32} className="text-slate-200" />
                          <p>No records found matching your search.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <div>Total: {filteredCompanies.length} companies</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500" : "bg-green-500"}`}></div> {loading ? "Syncing" : "Connected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyMaster;
