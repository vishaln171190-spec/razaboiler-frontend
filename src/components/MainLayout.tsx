import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
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

import '../../globalSidebar.css';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { permissions, roles } = usePermissions();

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const hasPermission = (perm: string) => permissions.includes(perm);
  const hasRole = (role: string) => roles.includes(role);
  const hasVisibleSubmenu = (section: string) =>
    menuConfig.some(m => m.section === section && hasPermission(m.permission));

  const menuConfig = [
    { key: 'orders', label: 'Order', icon: faShoppingCart, permission: 'daily_order', section: 'daily' },
    { key: 'route-builder', label: 'Route', icon: faRoute, permission: 'daily_route', section: 'daily' },
    { key: 'sales', label: 'Sale', icon: faChartBar, permission: 'daily_sale', section: 'daily' },
    { key: 'purchase', label: 'Purchase', icon: faShoppingCart, permission: 'daily_purchase', section: 'daily' },
    { key: 'users', label: 'User', icon: faUser, permission: 'master_user', section: 'master' },
    { key: 'companies', label: 'Company', icon: faBuilding, permission: 'master_company', section: 'master' },
    { key: 'customers', label: 'Customer', icon: faUsers, permission: 'master_customer', section: 'master' },
    { key: 'vehicles', label: 'Vehicle', icon: faCar, permission: 'master_vehicle', section: 'master' },
    { key: 'items', label: 'Item', icon: faBox, permission: 'master_item', section: 'master' },
    { key: 'sales-reports', label: 'Sales Reports', icon: faChartBar, permission: 'report_sales', section: 'reports' },
    { key: 'purchase-reports', label: 'Purchase Reports', icon: faShoppingCart, permission: 'report_purchase', section: 'reports' },
  ];

  // Sidebar JSX
  const sidebarContent = (
    <aside
      className={`rb-sidebar${sidebarOpen ? " open" : ""}`}
      aria-label="Sidebar"
      aria-hidden={!sidebarOpen && window.innerWidth <= 768}
    >
      <div className="rb-sidebar-header">
        <span className="rb-sidebar-logo">RB</span>
        <span className="rb-sidebar-title">RAZA BOILER</span>
      </div>
      <p className="rb-sidebar-welcome">Welcome, {user?.name || "User"}</p>
      <nav>
        <button
          onClick={() => { onNavigate("home"); if (window.innerWidth <= 768) setSidebarOpen(false); }}
          className={`rb-sidebar-link${active === "home" ? " active" : ""}`}
        >
          <FontAwesomeIcon icon={faTachometerAlt} className="rb-sidebar-icon" />
          Dashboard
        </button>

        {/* Daily Section */}
        {hasVisibleSubmenu('daily') && (
          <div className="rb-sidebar-section">
            <button
              type="button"
              className="rb-sidebar-section-btn"
              onClick={() => setDailyOpen((v) => !v)}
              aria-expanded={dailyOpen}
              aria-controls="daily-menu"
            >
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarDay} />
                Daily Activity
              </span>
              <FontAwesomeIcon icon={dailyOpen ? faChevronUp : faChevronDown} />
            </button>
            {dailyOpen && (
              <div id="daily-menu">
                {menuConfig.filter(m => m.section === 'daily' && hasPermission(m.permission)).map(m => (
                  <button
                    key={m.key}
                    onClick={() => { onNavigate(m.key); if (window.innerWidth <= 768) setSidebarOpen(false); }}
                    className={`rb-sidebar-link child${active === m.key ? " active" : ""}`}
                  >
                    <FontAwesomeIcon icon={m.icon} className="rb-sidebar-icon" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Master Section */}
        {hasVisibleSubmenu('master') && (
          <div className="rb-sidebar-section">
            <button
              type="button"
              className="rb-sidebar-section-btn"
              onClick={() => setMasterOpen((v) => !v)}
              aria-expanded={masterOpen}
              aria-controls="master-menu"
            >
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} />
                Master
              </span>
              <FontAwesomeIcon icon={masterOpen ? faChevronUp : faChevronDown} />
            </button>
            {masterOpen && (
              <div id="master-menu">
                {menuConfig.filter(m => m.section === 'master' && hasPermission(m.permission)).map(m => (
                  <button
                    key={m.key}
                    onClick={() => { onNavigate(m.key); if (window.innerWidth <= 768) setSidebarOpen(false); }}
                    className={`rb-sidebar-link child${active === m.key ? " active" : ""}`}
                  >
                    <FontAwesomeIcon icon={m.icon} className="rb-sidebar-icon" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Section */}
        {hasVisibleSubmenu('reports') && (
          <div className="rb-sidebar-section">
            <button
              type="button"
              className="rb-sidebar-section-btn"
              onClick={() => setReportsOpen((v) => !v)}
              aria-expanded={reportsOpen}
              aria-controls="reports-menu"
            >
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faChartBar} />
                Reports
              </span>
              <FontAwesomeIcon icon={reportsOpen ? faChevronUp : faChevronDown} />
            </button>
            {reportsOpen && (
              <div id="reports-menu">
                {menuConfig.filter(m => m.section === 'reports' && hasPermission(m.permission)).map(m => (
                  <button
                    key={m.key}
                    onClick={() => { onNavigate(m.key); if (window.innerWidth <= 768) setSidebarOpen(false); }}
                    className={`rb-sidebar-link child${active === m.key ? " active" : ""}`}
                  >
                    <FontAwesomeIcon icon={m.icon} className="rb-sidebar-icon" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
      <button
        onClick={onLogout}
        className="rb-sidebar-logout"
      >
        <FontAwesomeIcon icon={faSignOutAlt} />
        Logout
      </button>
    </aside>
  );

  // Overlay for mobile
  const overlay = (
    <div
      className={`rb-sidebar-overlay${sidebarOpen ? " open" : ""}`}
      onClick={() => setSidebarOpen(false)}
      aria-hidden={!sidebarOpen}
      tabIndex={-1}
    />
  );

  // Header with hamburger
  const header = (
    <header className="rb-header">
      <button
        className="rb-hamburger"
        aria-label="Open sidebar"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(true)}
      >
        <FontAwesomeIcon icon={faBars} size="lg" />
      </button>
      <span className="rb-header-title">RAZA BOILER</span>
      <span className="rb-header-user">{user?.name || "User"}</span>
    </header>
  );

  return (
    <div className="rb-layout">
      {header}
      {/* Desktop sidebar always visible, mobile sidebar slides in */}
      {sidebarContent}
      {overlay}
      <main className="rb-main-content">{children}</main>
    </div>
  );
};

export default MainLayout;
