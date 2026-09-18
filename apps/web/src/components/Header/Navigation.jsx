import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Navigation.css";
import NavigationItem from "./NavigationItem";
import { useAuthStore } from "../../store/authStore";

function Navigation({ onNavigate }) {
  const navigate = useNavigate();
  const handleNavigate = () => {
    onNavigate?.();
  };
  const { user, isAuthenticated, logout } = useAuthStore();
  const handleLogout = async () => {
    await logout();
    navigate("/identify");
  };

  return (
    <div className="sidebar-nav-section">
      <nav className="sidebar-nav" aria-label="Navegación principal">
        <hr className="sidebar-divider" />
        <NavLink to="/" onClick={handleNavigate}>
          <NavigationItem
            id="dashboardLink"
            svgPath="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1 M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1 M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1 M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"
            label="Panel de Control"
          />
        </NavLink>
        <NavLink to="/links" onClick={handleNavigate}>
          <NavigationItem
            id="linksLink"
            svgPath="M9 15l6 -6 M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464 M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"
            label="Enlaces"
          />
        </NavLink>
        <NavLink to="/analytics" onClick={handleNavigate}>
          <NavigationItem
            id="analyticsLink"
            svgPath="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M4 20h14"
            label="Analíticas"
          />
        </NavLink>
        {isAuthenticated && (
          <NavLink to="/settings" onClick={handleNavigate}>
            <NavigationItem
              id="settingsLink"
              svgPath="M10.325,4.317c.426,-1.756,2.924,-1.756,3.35,0a1.724,1.724,0,0,0,2.573,1.066c1.543,-.94,3.31,.826,2.37,2.37a1.724,1.724,0,0,0,1.065,2.572c1.756,.426,1.756,2.924,0,3.35a1.724,1.724,0,0,0,-1.066,2.573c.94,1.543,-.826,3.31,-2.37,2.37a1.724,1.724,0,0,0,-2.572,1.065c-.426,1.756,-2.924,1.756,-3.35,0a1.724,1.724,0,0,0,-2.573,-1.066c-1.543,.94,-3.31,-.826,-2.37,-2.37a1.724,1.724,0,0,0,-1.065,-2.572c-1.756,-.426,-1.756,-2.924,0,-3.35a1.724,1.724,0,0,0,1.066,-2.573c-.94,-1.543,.826,-3.31,2.37,-2.37c1,.608,2.296,.07,2.572,-1.065z M9,12a3,3,0,1,0,6,0a3,3,0,0,0,-6,0"
              label="Ajustes"
            />
          </NavLink>
        )}
      </nav>

      <div className="user-buttons">
        <hr className="sidebar-divider" />
        {!isAuthenticated ? (
          <NavLink to="/identify" onClick={handleNavigate}>
            <NavigationItem
              id="identifyLink"
              href=""
              svgPath="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"
              label="Identificar"
            />
          </NavLink>
        ) : (
          <>
            <p className="user-name">{user?.nombre || user?.email}</p>
            <button className="logout-button" onClick={handleLogout}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#607d8b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <p>Logout</p>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Navigation;
