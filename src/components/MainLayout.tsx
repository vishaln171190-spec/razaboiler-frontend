import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronUp,
  faChevronDown,
  faTachometerAlt,
  faCalendarDay,
  faUsers,
  faBuilding,
  faUser,
  faCar,
  faBox,
  faChartBar,
  faShoppingCart,
  faRoute,
  faSignOutAlt
} from "@fortawesome/free-solid-svg-icons";
import { usePermissions } from '../utils/PermissionsContext';

type Props = {
  children: React.ReactNode;
  onLogout: () => void;
  onNavigate: (route: string) => void;
  active?: string;
  user?: any;
};

const MainLayout = ({ children, onLogout, onNavigate, active, user }: Props) => {
  const [dailyOpen, setDailyOpen] = useState(true);
  const [masterOpen, setMasterOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);

  const { permissions, roles } = usePermissions();

  // Helper to check permission
  const hasPermission = (perm: string) => permissions.includes(perm);

  // Helper to check role
  const hasRole = (role: string) => roles.includes(role);

  // Helper to check if a section has visible submenu
  const hasVisibleSubmenu = (section: string) =>
    menuConfig.some(m => m.section === section && hasPermission(m.permission));

  // Menu config
  const menuConfig = [
    {
      key: 'orders',
      label: 'Order',
      icon: faShoppingCart,
      permission: 'daily_order',
      section: 'daily',
    },
    {
      key: 'route-builder',
      label: 'Route',
      icon: faRoute,
      permission: 'daily_route',
      section: 'daily',
    },
    {
      key: 'sales',
      label: 'Sale',
      icon: faChartBar,
      permission: 'daily_sale',
      section: 'daily',
    },
    {
      key: 'purchase',
      label: 'Purchase',
      icon: faShoppingCart,
      permission: 'daily_purchase',
      section: 'daily',
    },
    {
      key: 'users',
      label: 'User',
      icon: faUser,
      permission: 'master_user',
      section: 'master',
    },
    {
      key: 'companies',
      label: 'Company',
      icon: faBuilding,
      permission: 'master_company',
      section: 'master',
    },
    {
      key: 'customers',
      label: 'Customer',
      icon: faUsers,
      permission: 'master_customer',
      section: 'master',
    },
    {
      key: 'vehicles',
      label: 'Vehicle',
      icon: faCar,
      permission: 'master_vehicle',
      section: 'master',
    },
    {
      key: 'items',
      label: 'Item',
      icon: faBox,
      permission: 'master_item',
      section: 'master',
    },
    {
      key: 'sales-reports',
      label: 'Sales Reports',
      icon: faChartBar,
      permission: 'report_sales',
      section: 'reports',
    },
    {
      key: 'purchase-reports',
      label: 'Purchase Reports',
      icon: faShoppingCart,
      permission: 'report_purchase',
      section: 'reports',
    },
  ];

  const sectionButtonClass =
    "w-full text-left px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between";

  const parentButtonClass = (isActive?: boolean) =>
    `w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-3 ${
      isActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:text-white hover:bg-white/5"
    }`;

  const childButtonClass = (isActive?: boolean) =>
    `w-full text-left px-3 py-2 rounded-xl text-sm pl-10 ${
      isActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:text-white hover:bg-white/5"
    }`;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-r border-slate-800/60 p-4 rounded-tr-3xl rounded-br-3xl shadow-2xl shadow-slate-900/30">
        <div className="mb-6 px-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 text-sm font-black">
              RB
            </span>
            RAZA BOILER
          </h2>
          <p className="text-sm text-slate-400 mt-1">Welcome, {user?.name || "User"}</p>
        </div>

        <nav className="space-y-1">
          <button onClick={() => onNavigate("home")} className={parentButtonClass(active === "home")}> 
            <FontAwesomeIcon icon={faTachometerAlt} className="text-lg" />
            Dashboard
          </button>

          {hasVisibleSubmenu('daily') && (
            <div className="mt-4">
              <button
                type="button"
                className={sectionButtonClass}
                onClick={() => setDailyOpen((v) => !v)}
                aria-expanded={dailyOpen}
              >
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendarDay} />
                  Daily Activity
                </span>
                <FontAwesomeIcon icon={dailyOpen ? faChevronUp : faChevronDown} className="text-base" />
              </button>
            </div>
          )}

          {dailyOpen && hasVisibleSubmenu('daily') && (
            <>
              {menuConfig.filter(m => m.section === 'daily' && hasPermission(m.permission)).map(m => (
                <button key={m.key} onClick={() => onNavigate(m.key)} className={childButtonClass(active === m.key)}>
                  <FontAwesomeIcon icon={m.icon} className="mr-2" />
                  {m.label}
                </button>
              ))}
            </>
          )}

          {hasVisibleSubmenu('master') && (
            <div className="mt-4">
              <button
                type="button"
                className={sectionButtonClass}
                onClick={() => setMasterOpen((v) => !v)}
                aria-expanded={masterOpen}
              >
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} />
                  Master
                </span>
                <FontAwesomeIcon icon={masterOpen ? faChevronUp : faChevronDown} className="text-base" />
              </button>
            </div>
          )}

          {masterOpen && hasVisibleSubmenu('master') && (
            <>
              {menuConfig.filter(m => m.section === 'master' && hasPermission(m.permission)).map(m => (
                <button key={m.key} onClick={() => onNavigate(m.key)} className={childButtonClass(active === m.key)}>
                  <FontAwesomeIcon icon={m.icon} className="mr-2" />
                  {m.label}
                </button>
              ))}
            </>
          )}

          {hasVisibleSubmenu('reports') && (
            <div className="mt-4">
              <button
                type="button"
                className={sectionButtonClass}
                onClick={() => setReportsOpen((v) => !v)}
                aria-expanded={reportsOpen}
              >
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartBar} />
                  Reports
                </span>
                <FontAwesomeIcon icon={reportsOpen ? faChevronUp : faChevronDown} className="text-base" />
              </button>
            </div>
          )}

          {reportsOpen && hasVisibleSubmenu('reports') && (
            <>
              {menuConfig.filter(m => m.section === 'reports' && hasPermission(m.permission)).map(m => (
                <button key={m.key} onClick={() => onNavigate(m.key)} className={childButtonClass(active === m.key)}>
                  <FontAwesomeIcon icon={m.icon} className="mr-2" />
                  {m.label}
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="mt-6 px-2">
          <button
            onClick={onLogout}
            className="w-full bg-white/10 text-white font-semibold py-2 rounded-xl hover:bg-white/20 border border-white/10 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default MainLayout;
