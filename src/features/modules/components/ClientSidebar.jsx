import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { CLIENT_SIDEBAR_PAGES } from "../constants/clientSidebarPages";
import { ClientContext } from "../../../contexts/ClientContext";

function ClientSidebar() {
  const { currentClient } = useContext(ClientContext);

  const navStyle = ({ isActive }) => ({
    display: "block",
    padding: "8px 10px",
    borderRadius: 8,
    textDecoration: "none",
    color: "black",
    background: isActive ? "#eef3ff" : "transparent",
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 12, backgroundColor: "#f5f9ff" }}>
      <h2 style={{ marginTop: 0 }}>Client panel</h2>

      <div style={{ marginBottom: 16 }}>
        <strong>Client actif :</strong>
        <div style={{ marginTop: 6, fontSize: 14 }}>
          {currentClient ? `${currentClient.firstname} ${currentClient.lastname}` : "Aucun client"}
        </div>
      </div>

      <nav aria-label="Client Sidebar">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {CLIENT_SIDEBAR_PAGES.filter((page) => page.showInSidebar).map((page) => (
            <li key={page.id}>
              <NavLink to={page.path} style={navStyle}>
                {page.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default ClientSidebar;
