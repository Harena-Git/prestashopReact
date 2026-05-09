import { NavLink } from "react-router-dom";
import { SIDEBAR_PAGES } from "../constants/sidebarPages";

function Sidebar() {
  return (
    <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Navigation</h2>

      <nav aria-label="Sidebar">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {SIDEBAR_PAGES.filter((page) => page.showInSidebar).map((page) => (
            <li key={page.id}>
              <NavLink to={page.path} style={({ isActive }) => ({ display: "block", padding: "8px 10px", borderRadius: 8, textDecoration: "none", background: isActive ? "#eef3ff" : "transparent", fontWeight: isActive ? 600 : 400, })} >
                {page.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;