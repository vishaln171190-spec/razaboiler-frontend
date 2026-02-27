import React, { useState, useEffect } from 'react';
import {
  Truck,
  Car,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getCookie } from '../utils/cookieHelper';
import { getAuthUser, hasPermission, hasRole } from '../utils/auth';

type Vehicle = {
  id: string | number;
  vehicleId: string;
  vehicleNumber: string;
  model: string;
  type: string;
  ownerName?: string;
  ownerAddress?: string;
  dateOfJoining?: string;
  contactPersonName?: string;
  contactPersonNumber?: string;
  createdBy?: string | number;
};

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type VehicleType = {
  id: string | number;
  vehicletype: string;
};

const VehicleMaster = () => {
  const authUser = getAuthUser();
  const isAdmin = hasRole(authUser, 'admin');
  const canView = isAdmin || hasPermission(authUser, 'master_vehicle');
  const canCreate = isAdmin || hasPermission(authUser, 'master_vehicle');
  const canEdit = isAdmin || hasPermission(authUser, 'master_vehicle');
  const canDelete = isAdmin || hasPermission(authUser, 'master_vehicle');
  const canMutate = canCreate || canEdit;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    vehicleId: '',
    vehicleNumber: '',
    model: '',
    type: 'Heavy',
    ownerName: '',
    ownerAddress: '',
    dateOfJoining: '',
    contactPersonName: '',
    contactPersonNumber: '',
    createdBy: '1',
  });
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const normalizeDate = (value?: string) => {
    if (!value) return '';
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get auth token from cookie
  const getAuthHeaders = (options?: { json?: boolean }) => {
    const token = getCookie('auth_token');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (options?.json !== false) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // Fetch vehicles and types on component mount
  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchVehicleTypes();
    fetchVehicles();
  }, [canView]);

  const fetchVehicleTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicle-types`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const types = (data.data || data).map((type: any) => ({
          id: type.id,
          vehicletype: type.vehicletype,
        }));
        setVehicleTypes(types);
      }
    } catch (err) {
      console.error('Error fetching vehicle types:', err);
    }
  };

const fetchVehicles = async () => {
  try {
    setLoading(true);
    setError('');

    // Fetch all vehicles
    const response = await fetch(`${API_BASE_URL}/vehicles`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vehicles');
    }

    const data = await response.json();
    const vehicles = data.data || data;

    // Map vehicles and fetch type names
    const mappedVehicles = await Promise.all(
      vehicles.map(async (vehicle: any) => {
        // Determine the type ID (assuming 'type' is the ID here)
        const typeId = vehicle.vehicletype || vehicle.type || '1'; // fallback to 1 if missing

        // Fetch vehicle type name
        let typeName = 'Unknown';
        try {
          const typeResponse = await fetch(`${API_BASE_URL}/vehicle-types/${typeId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          console.log(`Fetching type for vehicle ${vehicle.id} with type ID ${typeId}:`, typeResponse);
          if (typeResponse.ok) {
            const typeData = await typeResponse.json();
            typeName = typeData.vehicletype || 'Unknown';
          }
        } catch (err) {
          console.warn(`Failed to fetch type for vehicle ${vehicle.id}`, err);
        }

        return {
          id: vehicle.id || vehicle.vehicle_id || Math.random().toString(),
          vehicleId: vehicle.vehicalid || vehicle.vehicleId || vehicle.vehicle_id || '',
          vehicleNumber: vehicle.rcnumber || vehicle.vehicleNumber || vehicle.rc_number || '',
          model: vehicle.vehicalmodel || vehicle.model || vehicle.vehicle_model || '',
          type: typeName, // use fetched type name
          ownerName: vehicle.ownername || vehicle.owner_name || '',
          ownerAddress: vehicle.owneraddress || vehicle.owner_address || '',
          dateOfJoining: normalizeDate(vehicle.dateofjoining || vehicle.date_of_joining || ''),
          contactPersonName: vehicle.contactpersonname || vehicle.contact_person_name || '',
          contactPersonNumber: vehicle.contactperson_number || vehicle.contact_person_number || '',
          createdBy: vehicle.created_by || vehicle.createdBy || '',
        };
      })
    );

    console.log('Fetched vehicles with type names:', mappedVehicles);
    setVehicles(mappedVehicles);

  } catch (err) {
    console.error('Error fetching vehicles:', err);
    setError('Failed to load vehicles');
  } finally {
    setLoading(false);
  }
};


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !canEdit) {
      setError('You do not have permission to update vehicles.');
      return;
    }
    if (!editingId && !canCreate) {
      setError('You do not have permission to create vehicles.');
      return;
    }
    if (!formData.vehicleId || !formData.vehicleNumber || !formData.model) {
      setError('Please provide ID, Number and Model');
      return;
    }

    setSaveLoading(true);
    setError('');

    try {
      const selectedType = vehicleTypes.find((vt) => vt.vehicletype === formData.type);
      const vehicletypeValue = selectedType ? String(selectedType.id) : formData.type;
      const payload = {
        vehicletype: vehicletypeValue,
        vehicalid: formData.vehicleId.toUpperCase(),
        rcnumber: formData.vehicleNumber.toUpperCase(),
        vehicalmodel: formData.model,
        ownername: formData.ownerName,
        owneraddress: formData.ownerAddress,
        dateofjoining: normalizeDate(formData.dateOfJoining),
        contactpersonname: formData.contactPersonName,
        contactperson_number: formData.contactPersonNumber,
        created_by: formData.createdBy,
      };

      if (editingId) {
        // Update vehicle
        const response = await fetch(`${API_BASE_URL}/vehicles/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update vehicle');
        }

        setEditingId(null);
        setFormData({ vehicleId: '', vehicleNumber: '', model: '', type: vehicleTypes[0]?.vehicletype || 'Heavy', ownerName: '', ownerAddress: '', dateOfJoining: '', contactPersonName: '', contactPersonNumber: '', createdBy: '1' });
        await fetchVehicles();
      } else {
        // Create new vehicle
        const body = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            body.append(key, String(value));
          }
        });

        const response = await fetch(`${API_BASE_URL}/vehicles/add`, {
          method: 'POST',
          headers: getAuthHeaders({ json: false }),
          body,
        });

        if (!response.ok) {
          throw new Error('Failed to create vehicle');
        }

        setFormData({ vehicleId: '', vehicleNumber: '', model: '', type: vehicleTypes[0]?.vehicletype || 'Heavy', ownerName: '', ownerAddress: '', dateOfJoining: '', contactPersonName: '', contactPersonNumber: '', createdBy: '1' });
        await fetchVehicles();
      }
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError('Failed to save vehicle. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!canDelete) {
      setError('You do not have permission to delete vehicles.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    setSaveLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete vehicle');
      }

      await fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Failed to delete vehicle. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    if (!canEdit) {
      setError('You do not have permission to edit vehicles.');
      return;
    }
    setFormData({
      vehicleId: vehicle.vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      model: vehicle.model,
      type: vehicle.type,
      ownerName: vehicle.ownerName || '',
      ownerAddress: vehicle.ownerAddress || '',
      dateOfJoining: normalizeDate(vehicle.dateOfJoining || ''),
      contactPersonName: vehicle.contactPersonName || '',
      contactPersonNumber: vehicle.contactPersonNumber || '',
      createdBy: vehicle.createdBy?.toString() || '1',
    });
    setEditingId(vehicle.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      (typeFilter === '' || v.type === typeFilter) &&
      (`${v.vehicleId} ${v.vehicleNumber} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!canView) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view Vehicle Master.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200 text-white">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vehicle Master</h1>
              <p className="text-slate-500 text-sm">Manage your fleet and vehicle inventory</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            {loading ? 'Loading...' : 'Connected'}
          </div>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* SECTION A: Add Vehicle Form */}
        {canMutate && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              {editingId ? 'Edit Vehicle Details' : 'Add New Vehicle'}
              {editingId && (
                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Editing Mode
                </span>
              )}
            </h2>
          </div>

          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Vehicle ID */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">
                  Vehicle ID <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="V-001"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none uppercase"
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                />
              </div>

              {/* Vehicle Number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="MH-15-AB-1234"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none uppercase"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                />
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Tata Ace"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Type</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="">Select Type</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.vehicletype}>
                      {vt.vehicletype}
                    </option>
                  ))}
                </select>
              </div>

              {/* Owner Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Owner Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                />
              </div>

              {/* Owner Address */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Owner Address</label>
                <input
                  type="text"
                  placeholder="123 Street, City"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={formData.ownerAddress}
                  onChange={(e) => setFormData({ ...formData, ownerAddress: e.target.value })}
                />
              </div>

              {/* Date of Joining */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Date of Joining</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={formData.dateOfJoining}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfJoining: normalizeDate(e.target.value) })
                  }
                />
              </div>

              {/* Contact Person Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                />
              </div>

              {/* Contact Person Number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Contact Person Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={formData.contactPersonNumber}
                  onChange={(e) => setFormData({ ...formData, contactPersonNumber: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={saveLoading || loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium py-2 px-8 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                  {saveLoading ? 'Saving...' : editingId ? 'Update Vehicle' : 'Save Vehicle'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    disabled={saveLoading}
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ vehicleId: '', vehicleNumber: '', model: '', type: vehicleTypes[0]?.vehicletype || 'Heavy', ownerName: '', ownerAddress: '', dateOfJoining: '', contactPersonName: '', contactPersonNumber: '', createdBy: '1' });
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

        {/* SECTION B: Fleet Directory */}
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
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.vehicletype}>
                    {vt.vehicletype}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search ID, number or model..."
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
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">ID</th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Vehicle No</th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Model</th>
                    <th className="px-6 py-4 font-bold text-slate-700 border-r border-slate-200">Type</th>
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-4 font-bold text-slate-700 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit || canDelete ? 5 : 4} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <p>Loading vehicles...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVehicles.length > 0 ? (
                    filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-indigo-600 font-mono border-r border-slate-100">
                          {vehicle.vehicleId || '---'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 border-r border-slate-100 uppercase">
                          {vehicle.vehicleNumber}
                        </td>
                        <td className="px-6 py-4 text-slate-600 border-r border-slate-100">{vehicle.model}</td>
                        <td className="px-6 py-4 border-r border-slate-100">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                              vehicle.type === 'Heavy'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {vehicle.type}
                          </span>
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit && (
                                <button
                                  onClick={() => startEdit(vehicle)}
                                  disabled={saveLoading}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(vehicle.id)}
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
                      <td colSpan={canEdit || canDelete ? 5 : 4} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-2">
                          <Truck size={32} className="text-slate-200" />
                          <p>No vehicles found{typeFilter ? ` for type "${typeFilter}"` : ''}.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <div>Total: {filteredVehicles.length} vehicles</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>{' '}
                  {loading ? 'Syncing' : 'Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleMaster;
