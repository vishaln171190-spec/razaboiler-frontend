import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardList, Plus, Route, Store, Truck, UserCircle, XCircle } from "lucide-react";
import { getCookie } from "../utils/cookieHelper";
import { getAuthUser, hasPermission, hasRole } from "../utils/auth";
import { API_BASE_URL } from "../../constants";

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
    // --- POPUP STATE HOOKS ---
    // Add Stops popup state
    const [addStopOpen, setAddStopOpen] = useState(false);
    const [addStopRoute, setAddStopRoute] = useState<RouteRow | null>(null);
    const [addStopForm, setAddStopForm] = useState({
      customerid: "",
      itemid: "",
      itemqty: "",
      itemweight: "",
      rateofsale: "",
      created_by: "1",
    });
    const [addStopSaving, setAddStopSaving] = useState(false);

    // View Stops popup state
    const [viewStopsOpen, setViewStopsOpen] = useState(false);
    const [viewStopsRoute, setViewStopsRoute] = useState<RouteRow | null>(null);
    const [viewStopsStops, setViewStopsStops] = useState<RouteStop[]>([]);
    const [viewStopsLoading, setViewStopsLoading] = useState(false);
    const [viewStopsEdit, setViewStopsEdit] = useState<{ [stopId: string]: Partial<RouteStop> }>({});
    const [viewStopsSaving, setViewStopsSaving] = useState<{ [stopId: string]: boolean }>({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    // --- POPUP HANDLERS ---
    // Handler to open Add Stops popup
    const openAddStop = (route: RouteRow) => {
      setAddStopRoute(route);
      setAddStopForm({
        customerid: "",
        itemid: "",
        itemqty: "",
        itemweight: "",
        rateofsale: "",
        created_by: "1",
      });
      setAddStopOpen(true);
    };
    const closeAddStop = () => {
      setAddStopOpen(false);
      setAddStopRoute(null);
    };

    // Handler to add a stop
    const handleAddStop = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!addStopRoute) return;
      setAddStopSaving(true);
      try {
        const payload = {
          routeid: Number(addStopRoute.id),
          customerid: Number(addStopForm.customerid),
          itemid: Number(addStopForm.itemid),
          itemqty: Number(addStopForm.itemqty),
          itemweight: Number(addStopForm.itemweight || 0),
          rateofsale: Number(addStopForm.rateofsale || 0),
          created_by: Number(addStopForm.created_by),
        };
        const res = await fetch(`${API_BASE_URL}/route-stops`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to add stop");
        closeAddStop();
        // Optionally refresh stops for the route
        if (activeRouteId === addStopRoute.id) {
          const s = await fetchStops(addStopRoute.id);
          setStops(s);
        }
      } catch (err) {
        setError("Failed to add stop");
      } finally {
        setAddStopSaving(false);
      }
    };

    // Handler to delete a route
    const handleDeleteRoute = async (id: string | number) => {
      if (!canDelete) {
        setError("You do not have permission to delete routes.");
        return;
      }
      if (!window.confirm("Delete this route?")) return;
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE_URL}/route-builder/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Delete failed");
        // Refresh routes
        const r = await fetchRoutes();
        setRoutes(r);
        if (activeRouteId === id) setActiveRouteId(null);
      } catch (err) {
        setError("Failed to delete route.");
      } finally {
        setSaving(false);
      }
    };

    // Handler to open View Stops popup
    const openViewStops = async (route: RouteRow) => {
      setViewStopsRoute(route);
      setViewStopsOpen(true);
      setViewStopsLoading(true);
      try {
        const stops = await fetchStops(route.id);
        setViewStopsStops(stops);
        setViewStopsEdit({});
      } catch (err) {
        setError("Failed to load stops");
      } finally {
        setViewStopsLoading(false);
      }
    };
    const closeViewStops = () => {
      setViewStopsOpen(false);
      setViewStopsRoute(null);
      setViewStopsStops([]);
      setViewStopsEdit({});
    };

    // Handler to edit a stop in the popup
    const handleEditViewStop = (stopId: string | number, field: keyof RouteStop, value: string) => {
      setViewStopsEdit((prev) => ({
        ...prev,
        [stopId]: { ...prev[stopId], [field]: value },
      }));
    };

    // Handler to save a stop in the popup
    const handleSaveViewStop = async (stop: RouteStop) => {
      setViewStopsSaving((prev) => ({ ...prev, [stop.id]: true }));
      try {
        const payload = {
          ...stop,
          ...viewStopsEdit[stop.id],
        };
        const res = await fetch(`${API_BASE_URL}/route-stops/${stop.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update stop");
        // Refresh stops
        const stops = await fetchStops(stop.routeid);
        setViewStopsStops(stops);
        setViewStopsEdit((prev) => ({ ...prev, [stop.id]: {} }));
      } catch (err) {
        setError("Failed to update stop");
      } finally {
        setViewStopsSaving((prev) => ({ ...prev, [stop.id]: false }));
      }
    };

    // Handler to delete a stop in the popup
    const handleDeleteViewStop = async (stop: RouteStop) => {
      if (!window.confirm("Delete this stop?")) return;
      setViewStopsSaving((prev) => ({ ...prev, [stop.id]: true }));
      try {
        const res = await fetch(`${API_BASE_URL}/route-stops/${stop.id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to delete stop");
        // Refresh stops
        const stops = await fetchStops(stop.routeid);
        setViewStopsStops(stops);
        setViewStopsEdit((prev) => ({ ...prev, [stop.id]: {} }));
      } catch (err) {
        setError("Failed to delete stop");
      } finally {
        setViewStopsSaving((prev) => ({ ...prev, [stop.id]: false }));
      }
    };
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
    routename: "",
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


  // Fetch routes by type (fixed/variable) initially fixed for hotels and variable for shops and deliverydate filter initially set to today to show today's routes
  const fetchRoutes = async (type?: string, date?: string) => {
    let url = `${API_BASE_URL}/route-builder/filter`;
    if (type) {
      url += `?type=${encodeURIComponent(type)}`;
    }
    if (date) {
      url += `${url.includes("?") ? "&" : "?"}deliverydate=${encodeURIComponent(date)}`;
    }
    const res = await fetch(url, { method: "GET", headers: getAuthHeaders() });
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
          routename: routeForm.routename,
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
          <div className="flex flex-1 items-center justify-end gap-3 md:gap-6">
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={async (e) => {
                    const newDate = e.target.value;
                    setSelectedDate(newDate);
                    let typeFilter = customerTab === "Hotel" ? "fixed" : "variable";
                    let filteredRoutes = await fetchRoutes(typeFilter, newDate);
                    setRoutes(filteredRoutes);
                      if (filteredRoutes.length > 0) {
                        setActiveRouteId(filteredRoutes[0].id);
                      } else {
                        setActiveRouteId(null);
                      }
                  }}
                  className="h-10 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                />
              </div>
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
              onClick={async () => {
                setCustomerTab(tab);
                // Fetch filtered routes by type
                const type = tab === "Hotel" ? "fixed" : "variable";
                const filteredRoutes = await fetchRoutes(type);
                setRoutes(filteredRoutes);
                if (filteredRoutes.length > 0) {
                  setActiveRouteId(filteredRoutes[0].id);
                } else {
                  setActiveRouteId(null);
                }
              }}
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
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Route Name</label>
                    <input
                      type="text"
                      value={routeForm.routename}
                      onChange={(e) => setRouteForm({ ...routeForm, routename: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                      placeholder="Enter route name"
                      required
                    />
                  </div>
                  <div className="hidden">
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

              {/* Route Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                  <ClipboardList size={18} className="text-slate-500" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Routes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                        <th className="px-6 py-4 border-b border-slate-100">Route Name</th>
                        <th className="px-6 py-4 border-b border-slate-100">Vehicle</th>
                        <th className="px-6 py-4 border-b border-slate-100">Date</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                            No routes found.
                          </td>
                        </tr>
                      ) : (
                        routes.map((route) => (
                          <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-700">{route.routename || route.route_name || route.name || `Route ${route.id}`}</td>
                            <td className="px-6 py-4 text-slate-600">{(() => { const v = vehicles.find((x) => String(x.id) === String(route.vehicleid)); return v?.vehicalid || v?.rcnumber || v?.vehicalmodel || `Vehicle ${route.vehicleid}`; })()}</td>
                            <td className="px-6 py-4 text-slate-600">{route.deliverydate?.split("T")[0]}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs hover:bg-blue-200"
                                  onClick={() => openAddStop(route)}
                                >
                                  Add Stops
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-200"
                                  onClick={() => openViewStops(route)}
                                >
                                  View Stops
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg bg-red-100 text-red-700 font-bold text-xs hover:bg-red-200"
                                  onClick={() => handleDeleteRoute(route.id)}
                                  disabled={saving}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                          {/* Add Stops Popup */}
                          {addStopOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                              <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                                  <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Add Stop</h3>
                                    <p className="text-xs text-slate-400">Route: {addStopRoute?.routename || addStopRoute?.route_name || addStopRoute?.name || addStopRoute?.id}</p>
                                  </div>
                                  <button onClick={closeAddStop} className="text-sm font-bold text-slate-500">Close</button>
                                </div>
                                <form onSubmit={handleAddStop} className="p-6 space-y-4">
                                  <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Customer</label>
                                    <select
                                      value={addStopForm.customerid}
                                      onChange={e => setAddStopForm(f => ({ ...f, customerid: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                                      required
                                    >
                                      <option value="">Select Customer</option>
                                      {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.customer_name || c.customername || `Customer ${c.id}`}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Item</label>
                                    <select
                                      value={addStopForm.itemid}
                                      onChange={e => setAddStopForm(f => ({ ...f, itemid: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                                      required
                                    >
                                      <option value="">Select Item</option>
                                      {items.map((i) => (
                                        <option key={i.id} value={i.id}>{i.itemname || i.name || `Item ${i.id}`}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Qty (Birds)</label>
                                    <input
                                      type="number"
                                      value={addStopForm.itemqty}
                                      onChange={e => setAddStopForm(f => ({ ...f, itemqty: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Weight (Kg)</label>
                                    <input
                                      type="number"
                                      value={addStopForm.itemweight}
                                      onChange={e => setAddStopForm(f => ({ ...f, itemweight: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Sale Rate (₹)</label>
                                    <input
                                      type="number"
                                      value={addStopForm.rateofsale}
                                      onChange={e => setAddStopForm(f => ({ ...f, rateofsale: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={addStopSaving}
                                    className="w-full mt-2 bg-blue-600 text-white font-bold py-3 rounded-full shadow-lg transition-all hover:bg-blue-700 disabled:bg-slate-400"
                                  >
                                    {addStopSaving ? "Saving..." : "Add Stop"}
                                  </button>
                                </form>
                              </div>
                            </div>
                          )}

                          {/* View Stops Popup */}
                          {viewStopsOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                              <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                                  <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Stops for Route</h3>
                                    <p className="text-xs text-slate-400">
                                      Route: {viewStopsRoute?.routename || viewStopsRoute?.route_name || viewStopsRoute?.name || viewStopsRoute?.id}
                                    </p>
                                  </div>
                                  <button onClick={closeViewStops} className="text-sm font-bold text-slate-500">Close</button>
                                </div>
                                <div className="p-6">
                                  {viewStopsLoading ? (
                                    <div className="text-center text-slate-400">Loading stops...</div>
                                  ) : viewStopsStops.length === 0 ? (
                                    <div className="text-center text-slate-400">No stops for this route.</div>
                                  ) : (
                                    <table className="w-full text-left border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-slate-50/70 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                                          <th className="px-3 py-2">Shop</th>
                                          <th className="px-3 py-2">Item</th>
                                          <th className="px-3 py-2 text-right">Qty</th>
                                          <th className="px-3 py-2 text-right">Weight</th>
                                          <th className="px-3 py-2 text-right">Rate</th>
                                          <th className="px-3 py-2 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {viewStopsStops.map((stop) => {
                                          const customer = customers.find((c) => String(c.id) === String(stop.customerid));
                                          const item = items.find((i) => String(i.id) === String(stop.itemid));
                                          const edit = viewStopsEdit[stop.id] || {};
                                          return (
                                            <tr key={stop.id}>
                                              <td className="px-3 py-2">{customer?.customer_name || customer?.customername || `Customer ${stop.customerid}`}</td>
                                              <td className="px-3 py-2">{item?.itemname || item?.name || `Item ${stop.itemid}`}</td>
                                              <td className="px-3 py-2 text-right">
                                                <input
                                                  type="number"
                                                  value={edit.itemqty ?? stop.itemqty}
                                                  onChange={e => handleEditViewStop(stop.id, "itemqty", e.target.value)}
                                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                                                />
                                              </td>
                                              <td className="px-3 py-2 text-right">
                                                <input
                                                  type="number"
                                                  value={edit.itemweight ?? stop.itemweight}
                                                  onChange={e => handleEditViewStop(stop.id, "itemweight", e.target.value)}
                                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                                                />
                                              </td>
                                              <td className="px-3 py-2 text-right">
                                                <input
                                                  type="number"
                                                  value={edit.rateofsale ?? stop.rateofsale}
                                                  onChange={e => handleEditViewStop(stop.id, "rateofsale", e.target.value)}
                                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                                                />
                                              </td>
                                              <td className="px-3 py-2 text-right">
                                                <button
                                                  className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-200 mr-2"
                                                  onClick={() => handleSaveViewStop(stop)}
                                                  disabled={!!viewStopsSaving[stop.id]}
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs hover:bg-red-200"
                                                  onClick={() => handleDeleteViewStop(stop)}
                                                  disabled={!!viewStopsSaving[stop.id]}
                                                >
                                                  Delete
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stop Details Table */}
        <div style={{ display: "none" }} className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
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

