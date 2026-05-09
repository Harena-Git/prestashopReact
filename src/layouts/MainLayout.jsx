import { Outlet } from "react-router-dom";
import Sidebar from "../features/modules/components/Sidebar";

function MainLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;