import { NavLink } from "react-router-dom";
import { ADMIN_PAGES } from "../constants/adminPages";

function AdminSidebar() {
  return (
    <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 12, backgroundColor: "#f8f9fa" }}>
      <h2 style={{ marginTop: 0, color: "#dc3545" }}>Admin Panel</h2>

      <nav aria-label="Admin Sidebar">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          
          {ADMIN_PAGES.filter((page) => page.showInSidebar === true).map((page) => {
            
            const navStyle = ({ isActive }) => {
              return {
                display: "block",
                padding: "8px 10px",
                borderRadius: 8,
                textDecoration: "none",
                color: "black",
                background: isActive ? "#ffe5e5" : "transparent",
                fontWeight: isActive ? 600 : 400,
              };
            };

            return (
              <li key={page.id}>
                <NavLink to={page.path} style={navStyle}>
                  {page.label}
                </NavLink>
              </li>
            );
          })}

        </ul>
      </nav>
    </aside>
  );
}

export default AdminSidebar;