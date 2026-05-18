import { NavLink } from "react-router-dom";
import { SIDEBAR_PAGES } from "../constants/sidebarPages";

function Sidebar() {
  // Ity function ity no mamorona ny sisiny ankavia (Sidebar) misy ny menu
  console.log("Rendering Sidebar with pages:", SIDEBAR_PAGES);

  return (
    <aside
      style={{
        width: 260,
        borderRight: "1px solid #ddd",
        padding: 12,
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Navigation</h2>
      <p style={{ fontSize: "0.8rem", color: "#666" }}>Menu Public</p>

      <nav aria-label="Sidebar">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {/* 1. Sivanina (Filter) aloha ireo pejy tokony hiseho ihany */}
          {SIDEBAR_PAGES.filter((page) => page.showInSidebar === true).map(
            (page) => {
              // 2. Ity function kely ity no manova ny endriky ny bokotra raha voakitika izy
              const navStyle = ({ isActive }) => {
                return {
                  display: "block",
                  padding: "8px 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "black",
                  // Raha "Active" ny pejy dia asiana loko manga kely ny lamosiny
                  background: isActive ? "#eef3ff" : "transparent",
                  // Raha "Active" dia atao matavy ny soratra (600), raha tsia dia tsotra (400)
                  fontWeight: isActive ? 600 : 400,
                };
              };

              return (
                <li key={page.id}>
                  {/* Ny NavLink dia mampiasa an'ilay "navStyle" etsy ambony mba hiova endrika ho azy */}
                  <NavLink to={page.path} style={navStyle}>
                    {page.label}
                  </NavLink>
                </li>
              );
            },
          )}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
