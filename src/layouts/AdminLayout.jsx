import { Outlet } from "react-router-dom";
import AdminSidebar from "../features/modules/components/AdminSidebar";

function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;