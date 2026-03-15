import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";
import { API_BASE_URL } from "../../constants";
import { getApiErrorMessage } from "../utils/apiError";

type User = {
  id: number;
  name: string;
  email: string;
  mobileno: string;
  status: "active" | "inactive";
  password?: string;
};

type FieldErrors = {
  name?: string;
  email?: string;
  mobileno?: string;
  password?: string;
};

const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 120;
const PASSWORD_MAX_LENGTH = 72;
const PAGE_SIZE = 10;
const nameRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

const UserMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "master_user");
  const canCreate = isAdmin || hasPermission(authUser, "master_user");
  const canEdit = isAdmin || hasPermission(authUser, "master_user");
  const canDelete = isAdmin || hasPermission(authUser, "master_user");
  const canMutate = canCreate || canEdit;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobileno: "",
    status: "active" as "active" | "inactive",
    password: "",
  });

  const token = getCookie("auth_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [canView]);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users`, { headers });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to fetch users"));
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || "Could not load users");
    }
    setLoading(false);
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.mobileno.includes(searchTerm)
      ),
    [users, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const validateForm = () => {
    const nextErrors: FieldErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedMobile = formData.mobileno.trim();
    const password = formData.password;

    if (!trimmedName) {
      nextErrors.name = "Name is required.";
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      nextErrors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
    } else if (!nameRegex.test(trimmedName)) {
      nextErrors.name = "Name can contain letters, spaces, apostrophes, dots, and hyphens only.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      nextErrors.email = `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address (example: user@example.com).";
    }

    if (!trimmedMobile) {
      nextErrors.mobileno = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(trimmedMobile)) {
      nextErrors.mobileno = "Mobile number must be exactly 10 digits.";
    }

    if (!editingId && !password) {
      nextErrors.password = "Password is required for new users.";
    } else if (password) {
      if (password.length > PASSWORD_MAX_LENGTH) {
        nextErrors.password = `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
      } else if (!passwordRegex.test(password)) {
        nextErrors.password = "Password must be at least 6 characters and include at least one letter and one number.";
      }
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please correct the highlighted fields.");
      return null;
    }

    return {
      name: trimmedName,
      email: trimmedEmail.toLowerCase(),
      mobileno: trimmedMobile,
      password,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (editingId && !canEdit) {
      setError("You do not have permission to update users");
      return;
    }
    if (!editingId && !canCreate) {
      setError("You do not have permission to create users");
      return;
    }

    const validated = validateForm();
    if (!validated) return;

    setLoading(true);

    try {
      const payload = {
        name: validated.name,
        email: validated.email,
        mobileno: validated.mobileno,
        status: formData.status,
        ...(validated.password && { password: validated.password }),
      };

      if (editingId) {
        const res = await fetch(`${API_BASE_URL}/users/${editingId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "Failed to update user"));
        }
        setSuccess("User updated successfully!");
        setEditingId(null);
      } else {
        const res = await fetch(`${API_BASE_URL}/users`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "Failed to create user"));
        }
        setSuccess("User created successfully!");
      }

      setFieldErrors({});
      setFormData({ name: "", email: "", mobileno: "", status: "active", password: "" });
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }

    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      setError("You do not have permission to delete users");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to delete user"));
      }
      setSuccess("User deleted successfully!");
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Could not delete user");
    }
    setLoading(false);
  };

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    if (!canEdit) {
      setError("You do not have permission to update users");
      return;
    }
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Failed to update status"));
      }
      setSuccess(`User status changed to ${newStatus}!`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Could not update status");
    }

    setLoading(false);
  };

  const startEdit = (user: User) => {
    if (!canEdit) {
      setError("You do not have permission to edit users");
      return;
    }
    setFormData({
      name: user.name,
      email: user.email,
      mobileno: user.mobileno,
      status: user.status,
      password: "",
    });
    setFieldErrors({});
    setEditingId(user.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view User Master.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 text-white">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">User Master</h1>
              <p className="text-slate-500 text-sm">Manage your system users</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={20} />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {canMutate && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                {editingId ? "Edit User Details" : "Add New User"}
                {editingId && (
                  <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Editing Mode</span>
                )}
              </h2>
            </div>

            <form onSubmit={handleSave} noValidate className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={NAME_MAX_LENGTH}
                    placeholder="e.g. John Doe"
                    className={`w-full px-4 py-2 rounded-lg border transition-all outline-none ${fieldErrors.name ? "border-red-400 focus:ring-2 focus:ring-red-500" : "border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value.slice(0, NAME_MAX_LENGTH) });
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                  />
                  {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    maxLength={EMAIL_MAX_LENGTH}
                    placeholder="user@example.com"
                    className={`w-full px-4 py-2 rounded-lg border transition-all outline-none ${fieldErrors.email ? "border-red-400 focus:ring-2 focus:ring-red-500" : "border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value.slice(0, EMAIL_MAX_LENGTH) });
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    onBlur={() => {
                      const next = formData.email.trim();
                      if (next && !emailRegex.test(next)) {
                        setFieldErrors((prev) => ({ ...prev, email: "Enter a valid email address (example: user@example.com)." }));
                      }
                    }}
                  />
                  {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10 digit mobile"
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all outline-none ${fieldErrors.mobileno ? "border-red-400 focus:ring-2 focus:ring-red-500" : "border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}
                      value={formData.mobileno}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData({ ...formData, mobileno: digits });
                        if (fieldErrors.mobileno) setFieldErrors((prev) => ({ ...prev, mobileno: undefined }));
                      }}
                    />
                  </div>
                  {fieldErrors.mobileno && <p className="text-xs text-red-600">{fieldErrors.mobileno}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">
                    Password {!editingId && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    placeholder={editingId ? "Leave blank to keep current" : "Min 6 chars, letter + number"}
                    className={`w-full px-4 py-2 rounded-lg border transition-all outline-none ${fieldErrors.password ? "border-red-400 focus:ring-2 focus:ring-red-500" : "border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value.slice(0, PASSWORD_MAX_LENGTH) });
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                  />
                  <p className="text-xs text-slate-500">Password must be at least 6 characters and include at least one letter and one number.</p>
                  {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    value={formData.status}
                    disabled={!editingId}
                    title={editingId ? "Status can be changed while editing the user." : "Status is fixed to Active while creating a new user."}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {!editingId && <p className="text-xs text-slate-500">New users are created as Active. You can change status in edit mode.</p>}
                </div>

                <div className="flex items-end gap-2 lg:col-span-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-8 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : editingId ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                    {editingId ? "Update User" : "Save User"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setFieldErrors({});
                        setFormData({ name: "", email: "", mobileno: "", status: "active", password: "" });
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors"
                    >
                      <XCircle size={20} />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 self-start">Users Directory</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search name, email or mobile..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {!loading && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Name</th>
                        <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Email</th>
                        <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Mobile</th>
                        <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Status</th>
                        {(canEdit || canDelete) && (
                          <th className="px-6 py-4 font-bold text-slate-700 text-center">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedUsers.length > 0 ? (
                        paginatedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4 font-semibold text-slate-900 border-r border-slate-100">{user.name}</td>
                            <td className="px-6 py-4 text-slate-600 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-blue-500" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-blue-500" />
                                <span>{user.mobileno}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 border-r border-slate-100">
                              {canEdit ? (
                                <button
                                  onClick={() => handleStatusToggle(user.id, user.status)}
                                  disabled={loading}
                                  className={`text-xs font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors ${
                                    user.status === "active"
                                      ? "bg-green-100 text-green-700 hover:bg-yellow-100 hover:text-yellow-700"
                                      : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                                  }`}
                                >
                                  {user.status}
                                </button>
                              ) : (
                                <span
                                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                    user.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {user.status}
                                </span>
                              )}
                            </td>
                            {(canEdit || canDelete) && (
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canEdit && (
                                    <button
                                      onClick={() => startEdit(user)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDelete(user.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
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
                          <td colSpan={canEdit || canDelete ? 5 : 4} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                            <div className="flex flex-col items-center gap-2">
                              <Users size={32} className="text-slate-200" />
                              <p>No users found matching your search.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
                  <div>
                    Total: {filteredUsers.length} users
                    {filteredUsers.length > 0 && (
                      <span>
                        {" "}
                        | Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="font-medium text-slate-600">Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMaster;
