import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, CalendarDays, Calendar, CalendarIcon } from "lucide-react";
import { usePermissions } from "../utils/PermissionsContext";
import { API_BASE_URL } from "../../constants";

const roleCanView = ["admin", "owner", "accountant"];

const statConfig = {
  sales: {
    label: "Sales",
    icon: <DollarSign className="w-7 h-7" />,
    colors: ["bg-blue-100", "bg-blue-200", "bg-blue-300", "bg-blue-400"],
  },
  purchases: {
    label: "Purchases",
    icon: <ShoppingCart className="w-7 h-7" />,
    colors: ["bg-green-100", "bg-green-200", "bg-green-300", "bg-green-400"],
  },
};

const timeConfig = [
  { key: "today", label: "Today", icon: <CalendarDays className="w-5 h-5" /> },
  { key: "yesterday", label: "Yesterday", icon: <CalendarDays className="w-5 h-5" /> },
  { key: "last_week", label: "Last Week", icon: <Calendar className="w-5 h-5" /> },
  { key: "last_month", label: "Last Month", icon: <CalendarIcon className="w-5 h-5" /> },
];

const Dashboard = () => {
  const { roles } = usePermissions();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/dashboard/stats`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats.");
        setLoading(false);
      });
  }, []);

  const canView = roles && roles.some((r) => roleCanView.includes(r));

  if (!canView) {
    return <div className="p-8 text-center text-lg text-gray-500">You do not have permission to view dashboard stats.</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard Stats</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-100 border border-red-400 text-red-700">{error}</div>}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(statConfig).map(([type, config]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                {config.icon}
                <span className="text-lg font-semibold">{config.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {timeConfig.map((t, idx) => (
                  <div key={t.key} className={`rounded-xl p-4 flex flex-col items-center justify-center shadow ${config.colors[idx]}`}> 
                    <div className="mb-1">{t.icon}</div>
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xl font-bold mt-1">{stats[type][t.key]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
