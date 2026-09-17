import {
  Home,
  Truck,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { useState } from "react";

import "./Sidebar.css";

interface SidebarProps {
  isExpanded?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  {
    label: "Home",
    path: "/dashboard",
    icon: Home,
  },
  {
    label: "BAU",
    path: "/bau",
    icon: Truck,
  },
];

function Sidebar({
  isExpanded,
  onToggle,
}: SidebarProps) {
  /*
   * Estado interno temporário.
   *
   * Quando criarmos o Layout global, ele poderá
   * controlar o Sidebar através das props.
   */
  const [internalExpanded, setInternalExpanded] =
    useState(true);

  const expanded =
    isExpanded !== undefined
      ? isExpanded
      : internalExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }

    setInternalExpanded((current) => !current);
  };

  return (
    <aside
      className={`sidebar ${
        expanded ? "expanded" : "collapsed"
      }`}
    >

      {/* =====================================================
          LOGO
          ===================================================== */}

      <div className="sidebar-logo">

        <div className="sidebar-logo-icon">
          <BarChart3 size={28} />
        </div>

        <div className="sidebar-logo-text">
          <span>KPI Team</span>
          <span>Dashboard</span>
        </div>

      </div>

      {/* =====================================================
          BOTÃO DE EXPANDIR / RECOLHER
          ===================================================== */}

      <button
        type="button"
        className="sidebar-toggle"
        onClick={handleToggle}
        aria-label={
          expanded
            ? "Recolher menu"
            : "Expandir menu"
        }
        title={
          expanded
            ? "Recolher menu"
            : "Expandir menu"
        }
      >
        {expanded ? (
          <PanelLeftClose size={18} />
        ) : (
          <PanelLeftOpen size={18} />
        )}
      </button>

      {/* =====================================================
          MENU
          ===================================================== */}

      <nav className="sidebar-menu">

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${
                  isActive ? "active" : ""
                }`
              }
              title={
                expanded
                  ? undefined
                  : item.label
              }
            >

              <Icon size={20} />

              <span>
                {item.label}
              </span>

            </NavLink>
          );

        })}

      </nav>

      {/* =====================================================
          RODAPÉ
          ===================================================== */}

      <div className="sidebar-footer">

        <div className="shopee-logo">
          S
        </div>

        <span>
          Shopee
        </span>

      </div>

    </aside>
  );
}

export default Sidebar;