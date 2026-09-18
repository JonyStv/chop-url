import { Outlet } from "react-router-dom";
import Header from "../components/Header/Header";
import "./Layout.css";

function Layout() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
