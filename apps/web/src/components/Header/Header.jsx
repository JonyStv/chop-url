import "./Header.css";
import Navigation from "./Navigation";
import { useState } from "react";

function Header() {
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
        className={`sidebar-overlay ${isSidebarOpen ? "active" : ""}`}
        id="sidebarOverlay"
        onClick={closeSidebar}
      />
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`} id="sidebar">
        <h2 className="sidebar-logo">Chop/URL</h2>
        <Navigation onNavigate={closeSidebar} />
      </aside>
    </>
  );
}

export default Header;
