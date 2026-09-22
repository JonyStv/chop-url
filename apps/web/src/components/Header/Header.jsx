import "./Header.css";
import Navigation from "./Navigation";
import { useState } from "react";
import { useWindowDimensions } from "../../hooks/useWindowDimensions.js";

function Header() {
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };
  console.log(width);
  return (
    <>
      <button
        type="button"
        className={`hamburger-btn ${isSidebarOpen ? "active" : ""}`}
        id="hamburgerBtn"
        aria-label="Abrir menú"
        onClick={toggleSidebar}
      >
        ☰
      </button>
      <div
        className={`sidebar-overlay ${isSidebarOpen && width < 1024 ? "active" : ""}`}
        id="sidebarOverlay"
        onClick={closeSidebar}
      />
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`} id="sidebar">
        <div className="sidebar-header">
          <svg
            className="sidebar-logo"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#007aff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 5l-10 14" />
          </svg>
          <h2 className="sidebar-title">ChopURL</h2>
        </div>
        <Navigation onNavigate={closeSidebar} />
      </aside>
    </>
  );
}

export default Header;
