import { Outlet } from "react-router-dom";
import ClientSidebar from "../features/modules/components/ClientSidebar";

function ClientLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ClientSidebar />
      <main style={{ flex: 1, padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default ClientLayout;
