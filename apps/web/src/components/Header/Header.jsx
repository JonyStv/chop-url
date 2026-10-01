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
        <a href="/" className="sidebar-header">
          <img
            src="./../../../public/logo.png"
            alt="Logo"
            className="sidebar-logo"
          />
        </a>
        <Navigation onNavigate={closeSidebar} />
      </aside>
    </>
  );
}

export default Header;
