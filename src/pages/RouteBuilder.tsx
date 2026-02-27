import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardList, Plus, Route, Store, Truck, UserCircle, XCircle } from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";

const API_BASE_URL = "http://127.0.0.1:8000/api";

type Vehicle = { id: number | string; vehicalid?: string; rcnumber?: string; vehicalmodel?: string };
type User = { id: number | string; name?: string; username?: string };
type Customer = {
  id: number | string;
  customer_name?: string;
  customername?: string;
  customer_typeid?: number | string;
  customer_type?: string;
  type?: "Hotel" | "Shop";
};
type Item = { id: number | string; itemname?: string; name?: string };

type RouteRow = {
  id: number | string;
  vehicleid: number | string;
  driverid: number | string;
  deliverydate: string;
  status?: string;
  type?: string;
};

type RouteStop = {
  id: number | string;
  routeid: number | string;
  customerid: number | string;
  itemid: number | string;
  itemqty: number | string;
  itemweight: number | string;
  rateofsale: number | string;
};

type Props = {
  user?: any;
};

const RouteBuilder = ({ user }: Props) => {
  const authUser = user || getAuthUser();
  const isAdmin = hasRole(authUser, "admin");
  const canView = isAdmin || hasPermission(authUser, "daily_route");
  const canCreate = isAdmin || hasPermission(authUser, "daily_route");
  const canDelete = isAdmin || hasPermission(authUser, "daily_route");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customerTab, setCustomerTab] = useState<"Hotel" | "Shop">("Hotel");
  const [routeDateFilter, setRouteDateFilter] = useState("");
  const [stopSearch, setStopSearch] = useState("");
  const [fixedRoute, setFixedRoute] = useState<RouteRow | null>(null);

  const [routeForm, setRouteForm] = useState({
    vehicleid: "",
    driverid: "",
    type: "fixed",
    deliverydate: new Date().toISOString().split("T")[0],
    status: "intransit",
    created_by: "1",
  });

  const [stopForm, setStopForm] = useState({
    customerid: "",
    itemid: "",
    itemqty: "",
    itemweight: "",
    rateofsale: "",
    created_by: "1",
  });


  const getAuthHeaders = (options?: { json?: boolean }) => {
    const token = getCookie("auth_token");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options?.json !== false) headers["Content-Type"] = "application/json";
    return headers;
  };

  const fetchVehicles = async () => {
    const res = await fetch(`${API_BASE_URL}/vehicles`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as Vehicle[];
  };

  const fetchDrivers = async () => {
    const res = await fetch(`${API_BASE_URL}/users`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as User[];
  };

  const fetchCustomers = async () => {
    const res = await fetch(`${API_BASE_URL}/customers`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    const list = (data.data || data || []) as any[];
    return list.map((c) => {
      const type =
        c.customer_typeid === 1 || c.customer_type === "Hotel" || c.customer_typeid === "1"
          ? "Hotel"
          : "Shop";
      const name = c.customer_name || c.customername || c.name || "";
      return {
        id: c.id ?? c.customer_id ?? c._id ?? Math.random().toString(36).slice(2),
        customer_name: name,
        customername: name,
        customer_typeid: c.customer_typeid,
        customer_type: c.customer_type,
        type,
      } as Customer;
    });
  };

  const fetchItems = async () => {
    const res = await fetch(`${API_BASE_URL}/items`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as Item[];
  };

  const fetchRoutes = async () => {
    const res = await fetch(`${API_BASE_URL}/route-builder`, { method: "GET", headers: getAuthHeaders() });
    const data = await res.json();
    return (data.data || data || []) as RouteRow[];
  };

  const fetchStops = async (routeId: string | number) => {
    const res = await fetch(`${API_BASE_URL}/route-stops/index/${routeId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return (data.data || data || []) as RouteStop[];
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [v, d, c, i, r] = await Promise.all([
          fetchVehicles(),
          fetchDrivers(),
          fetchCustomers(),
          fetchItems(),
          fetchRoutes(),
        ]);
        setVehicles(v);
        setDrivers(d);
        setCustomers(c);
        setItems(i);
        setRoutes(r);
        if (r.length > 0) setActiveRouteId(r[0].id);
      } catch (err) {
        console.error(err);
        setError("Failed to load route builder data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canView]);

  useEffect(() => {
    const defaultType = customerTab === "Hotel" ? "fixed" : "variable";
    setRouteForm((prev) => ({
      ...prev,
      type: defaultType,
    }));
    setStopForm((prev) => ({ ...prev, customerid: "" }));
  }, [customerTab]);

  useEffect(() => {
    if (routeForm.type !== "fixed") return;
    if (!routeForm.vehicleid && vehicles.length > 0) {
      setRouteForm((prev) => ({ ...prev, vehicleid: String(vehicles[0].id) }));
    }
    if (!routeForm.driverid && drivers.length > 0) {
      setRouteForm((prev) => ({ ...prev, driverid: String(drivers[0].id) }));
    }
  }, [routeForm.type, routeForm.vehicleid, routeForm.driverid, vehicles, drivers]);

  const fetchFixedRoute = async () => {
    if (routeForm.type !== "fixed") {
      setFixedRoute(null);
      return;
    }
    if (!routeForm.vehicleid || !routeForm.driverid) {
      setFixedRoute(null);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("vehicleid", String(routeForm.vehicleid));
      params.set("driverid", String(routeForm.driverid));
      params.set("type", "fixed");
      if (routeForm.deliverydate) {
        params.set("deliverydate", routeForm.deliverydate.split("T")[0]);
      }
      let res = await fetch(`${API_BASE_URL}/route-builder/filter?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/route-builder/filter`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            vehicleid: Number(routeForm.vehicleid),
            driverid: Number(routeForm.driverid),
            type: "fixed",
            deliverydate: routeForm.deliverydate?.split("T")[0],
          }),
        });
      }
      if (!res.ok) {
        setFixedRoute(null);
        return;
      }
      const data = await res.json();
      const list = (data.data || data || []) as any[];
      const route = Array.isArray(list) ? list[0] : list;
      const normalized: RouteRow | null = route
        ? {
            id: route.id ?? route.routeid ?? route.route_id ?? route._id,
            vehicleid: route.vehicleid ?? route.vehicle_id ?? "",
            driverid: route.driverid ?? route.driver_id ?? "",
            deliverydate: route.deliverydate ?? route.delivery_date ?? "",
            status: route.status,
            type: route.type ?? "fixed",
          }
        : null;
      setFixedRoute(normalized?.id ? normalized : null);
    } catch (err) {
      console.error(err);
      setFixedRoute(null);
    }
  };

  useEffect(() => {
    fetchFixedRoute();
  }, [routeForm.type, routeForm.vehicleid, routeForm.driverid, routeForm.deliverydate]);

  useEffect(() => {
    if (routeForm.type !== "fixed") {
      setFixedRoute(null);
      return;
    }
    if (fixedRoute) {
      setActiveRouteId(fixedRoute.id);
    } else {
      setActiveRouteId(null);
      setStops([]);
    }
    setStopForm({ customerid: "", itemid: "", itemqty: "", itemweight: "", rateofsale: "", created_by: "1" });
  }, [routeForm.type, fixedRoute]);

  useEffect(() => {
    if (routeForm.type !== "fixed") return;
    if (!fixedRoute) return;
    if (stops.length === 0) return;
    const first = stops[0];
    setStopForm((prev) => ({
      ...prev,
      customerid: String(first.customerid || ""),
      itemid: String(first.itemid || ""),
    }));
  }, [routeForm.type, fixedRoute, stops]);

  useEffect(() => {
    if (routeForm.type !== "variable") return;
    setStopForm((prev) => ({ ...prev, customerid: "", itemid: "" }));
  }, [routeForm.type]);

  useEffect(() => {
    if (!activeRouteId) {
      setStops([]);
      return;
    }
    const loadStops = async () => {
      try {
        const s = await fetchStops(activeRouteId);
        setStops(s);
      } catch (err) {
        console.error(err);
      }
    };
    loadStops();
  }, [activeRouteId]);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setError("You do not have permission to create routes.");
      return;
    }
    if (!routeForm.deliverydate) {
      setError("Please select delivery date.");
      return;
    }
    if (routeForm.type === "variable" && (!routeForm.vehicleid || !routeForm.driverid)) {
      setError("Please select vehicle and driver for variable routes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const vehicleIdToSend =
        routeForm.type === "fixed"
          ? Number(routeForm.vehicleid || vehicles[0]?.id || 0)
          : Number(routeForm.vehicleid || 0);
      const driverIdToSend =
        routeForm.type === "fixed"
          ? Number(routeForm.driverid || drivers[0]?.id || 0)
          : Number(routeForm.driverid || 0);
      if (!vehicleIdToSend || !driverIdToSend) {
        setError("Vehicle/Driver not available for this route.");
        setSaving(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/route-builder`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          vehicleid: vehicleIdToSend,
          driverid: driverIdToSend,
          type: routeForm.type,
          deliverydate: routeForm.deliverydate,
          status: routeForm.status,
          created_by: Number(routeForm.created_by),
        }),
      });
      if (!res.ok) throw new Error("Create route failed");
      const data = await res.json();
      const newRoute = data.data || data;
      const newId = newRoute?.id ?? newRoute?.routeid;
      await refreshRoutes(newId);
    } catch (err) {
      console.error(err);
      setError("Failed to create route.");
    } finally {
      setSaving(false);
    }
  };

  const refreshRoutes = async (selectId?: string | number) => {
    const r = await fetchRoutes();
    setRoutes(r);
    if (selectId) {
      setActiveRouteId(selectId);
      return;
    }
    if (r.length > 0) setActiveRouteId(r[0].id);
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      setError("You do not have permission to add stops.");
      return;
    }
    if (!activeRouteId) {
      setError("Please create a route header first.");
      return;
    }
    if (!stopForm.customerid || !stopForm.itemid || !stopForm.itemqty) {
      setError(`Please select ${customerTab === "Hotel" ? "hotel" : "shop"}, item and quantity.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        routeid: Number(activeRouteId),
        customerid: Number(stopForm.customerid),
        itemid: Number(stopForm.itemid),
        itemqty: Number(stopForm.itemqty),
        itemweight: Number(stopForm.itemweight || 0),
        rateofsale: Number(stopForm.rateofsale || 0),
        created_by: Number(stopForm.created_by),
      };
      const res = await fetch(`${API_BASE_URL}/route-stops`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save stop failed");
      setStopForm({ customerid: "", itemid: "", itemqty: "", itemweight: "", rateofsale: "", created_by: "1" });
      const s = await fetchStops(activeRouteId);
      setStops(s);
    } catch (err) {
      console.error(err);
      setError("Failed to save shop stop.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStop = async (id: string | number) => {
    if (!canDelete) {
      setError("You do not have permission to delete stops.");
      return;
    }
    if (!window.confirm("Delete this stop?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/route-stops/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      if (activeRouteId) {
        const s = await fetchStops(activeRouteId);
        setStops(s);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete stop.");
    } finally {
      setSaving(false);
    }
  };

  const routeStopsTotal = useMemo(() => {
    return stops.reduce(
      (acc, s) => {
        const weight = Number(s.itemweight || 0);
        const rate = Number(s.rateofsale || 0);
        acc.totalWeight += weight;
        acc.totalValue += weight * rate;
        return acc;
      },
      { totalWeight: 0, totalValue: 0 }
    );
  }, [stops]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => (c.type ? c.type === customerTab : true));
  }, [customers, customerTab]);

  const filteredRoutes = useMemo(() => {
    if (!routeDateFilter) return routes;
    return routes.filter((r) => r.deliverydate?.split("T")[0] === routeDateFilter);
  }, [routes, routeDateFilter]);

  const filteredStops = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    if (!q) return stops;
    return stops.filter((stop) => {
      const customer = customers.find((c) => String(c.id) === String(stop.customerid));
      const item = items.find((i) => String(i.id) === String(stop.itemid));
      const customerName = (customer?.customer_name || customer?.customername || "").toLowerCase();
      const itemName = (item?.itemname || item?.name || "").toLowerCase();
      return customerName.includes(q) || itemName.includes(q) || String(stop.itemqty || "").includes(q);
    });
  }, [stops, stopSearch, customers, items]);

  const filteredStopsTotal = useMemo(() => {
    return filteredStops.reduce(
      (acc, s) => {
        const weight = Number(s.itemweight || 0);
        const rate = Number(s.rateofsale || 0);
        acc.totalWeight += weight;
        acc.totalValue += weight * rate;
        return acc;
      },
      { totalWeight: 0, totalValue: 0 }
    );
  }, [filteredStops]);

  const stopTableCols = canDelete ? 7 : 6;

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
        You do not have permission to view Route Builder.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">Loading route builder...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Route size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Route Builder</h1>
            <p className="text-sm text-slate-500">Plan delivery routes and shop stops</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm w-fit">
          {(["Hotel", "Shop"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCustomerTab(tab)}
              className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
                customerTab === tab ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {canCreate && (
            <>
              {/* Route Header */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <ClipboardList size={14} /> Route Header
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Route Type</label>
                <select
                  value={routeForm.type}
                  onChange={(e) => setRouteForm({ ...routeForm, type: e.target.value as "fixed" | "variable" })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                >
                  <option value="fixed">Fixed</option>
                  <option value="variable">Variable</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  {routeForm.type === "fixed" ? "Vehicle (Auto)" : "Select Vehicle"}
                </label>
                <select
                  value={routeForm.vehicleid}
                  onChange={(e) => setRouteForm({ ...routeForm, vehicleid: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicalid || v.rcnumber || v.vehicalmodel || `Vehicle ${v.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  {routeForm.type === "fixed" ? "Driver (Auto)" : "Select Driver"}
                </label>
                <select
                  value={routeForm.driverid}
                  onChange={(e) => setRouteForm({ ...routeForm, driverid: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.username || `User ${d.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Delivery Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    value={routeForm.deliverydate}
                    onChange={(e) => setRouteForm({ ...routeForm, deliverydate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canCreate || saving}
                className="w-full mt-2 bg-slate-900 text-white font-bold py-3 rounded-full shadow-lg transition-all hover:bg-slate-800 disabled:bg-slate-400"
              >
                {saving ? "Saving..." : "Log Wholesale Trip"}
              </button>
            </form>

            <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-4">
              <UserCircle size={14} /> Active Route: {activeRouteId ? `#${activeRouteId}` : "None"}
            </div>
          </div>

              {/* Shop Stop Builder */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 p-6 space-y-6">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <Plus size={14} /> {customerTab} Stop Builder
            </div>

            {routeForm.type === "fixed" && fixedRoute && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                Fixed route found for this vehicle/driver/date. Stops loaded below.
              </div>
            )}

            <form onSubmit={handleSaveStop} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  {customerTab === "Hotel" ? "Select Hotel" : "Select Shop"}
                </label>
                <select
                  value={stopForm.customerid}
                  onChange={(e) => setStopForm({ ...stopForm, customerid: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  disabled={routeForm.type === "fixed" && !!fixedRoute}
                >
                  <option value="">{customerTab === "Hotel" ? "Select Hotel" : "Select Shop"}</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name || c.customername || `Customer ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Item</label>
                <select
                  value={stopForm.itemid}
                  onChange={(e) => setStopForm({ ...stopForm, itemid: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  disabled={routeForm.type === "fixed" && !!fixedRoute}
                >
                  <option value="">Select Item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemname || i.name || `Item ${i.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Qty (Birds)</label>
                <input
                  type="number"
                  value={stopForm.itemqty}
                  onChange={(e) => setStopForm({ ...stopForm, itemqty: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Weight (Kg)</label>
                <input
                  type="number"
                  value={stopForm.itemweight}
                  onChange={(e) => setStopForm({ ...stopForm, itemweight: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Sale Rate (₹)</label>
                <input
                  type="number"
                  value={stopForm.rateofsale}
                  onChange={(e) => setStopForm({ ...stopForm, rateofsale: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  placeholder="0"
                />
              </div>

              <button
                type="submit"
                disabled={!canCreate || saving}
                className="md:col-span-2 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-full shadow-lg transition-all disabled:bg-slate-400"
              >
                Add Stop To Truck
              </button>
            </form>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6">
              {filteredStops.length === 0 ? (
                <div className="text-center text-xs font-bold text-slate-300 tracking-widest uppercase">
                  No shop stops defined for current trip
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStops.map((stop) => {
                    const customer = customers.find((c) => String(c.id) === String(stop.customerid));
                    const item = items.find((i) => String(i.id) === String(stop.itemid));
                    return (
                      <div key={stop.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white border border-slate-200">
                            <Store size={16} className="text-slate-500" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">
                              {customer?.customer_name || customer?.customername || `Customer ${stop.customerid}`}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-400">
                              {item?.itemname || item?.name || "Item"} • Qty {stop.itemqty} • {stop.itemweight} Kg
                            </div>
                          </div>
                        </div>
                        {canDelete && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteStop(stop.id)}
                              disabled={saving}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredStops.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Truck size={14} /> Total Weight: {filteredStopsTotal.totalWeight.toFixed(2)} Kg
                </div>
                <div className="text-slate-800 font-bold">
                  Total Value: ₹{filteredStopsTotal.totalValue.toFixed(0)}
                </div>
              </div>
            )}
              </div>
            </>
          )}
        </div>

        {/* Stop Details Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ClipboardList size={18} className="text-slate-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Stop Details</h3>
          </div>
          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Route</label>
              <select
                value={activeRouteId ?? ""}
                onChange={(e) => setActiveRouteId(e.target.value || null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
              >
                <option value="">Select Route</option>
                {filteredRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} • {r.deliverydate?.split("T")[0] || ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Route Date</label>
              <input
                type="date"
                value={routeDateFilter}
                onChange={(e) => {
                  const next = e.target.value;
                  setRouteDateFilter(next);
                  const nextRoutes = routes.filter((r) =>
                    next ? r.deliverydate?.split("T")[0] === next : true
                  );
                  if (nextRoutes.length > 0) {
                    setActiveRouteId(nextRoutes[0].id);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Search Stops</label>
              <input
                type="text"
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
                placeholder="Search customer or item..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                  <th className="px-6 py-4 border-b border-slate-100">Shop</th>
                  <th className="px-6 py-4 border-b border-slate-100">Item</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Qty (Birds)</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Weight (Kg)</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Rate (₹)</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Total Amount</th>
                  {canDelete && <th className="px-6 py-4 border-b border-slate-100 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStops.length === 0 ? (
                  <tr>
                    <td colSpan={stopTableCols} className="px-6 py-12 text-center text-slate-400">
                      No stops added for the active route.
                    </td>
                  </tr>
                ) : (
                  filteredStops.map((stop) => {
                    const customer = customers.find((c) => String(c.id) === String(stop.customerid));
                    const item = items.find((i) => String(i.id) === String(stop.itemid));
                    const weight = Number(stop.itemweight || 0);
                    const rate = Number(stop.rateofsale || 0);
                    const total = weight * rate;
                    return (
                      <tr key={stop.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {customer?.customer_name || customer?.customername || `Customer ${stop.customerid}`}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{item?.itemname || item?.name || "Item"}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-600">{stop.itemqty}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-600">{weight.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-600">₹{rate.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-bold text-slate-900">
                          ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {canDelete && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDeleteStop(stop.id)}
                                disabled={saving}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredStops.length > 0 && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-slate-400">
                      Total For Active Route
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-bold">
                      {filteredStopsTotal.totalWeight.toFixed(2)} Kg
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-black text-emerald-400">
                      ₹{filteredStopsTotal.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    {canDelete && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteBuilder;

