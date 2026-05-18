import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import { ADMIN_PAGES } from "../constants/adminPages";

function AdminPage() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const quickLinks = ADMIN_PAGES.filter((p) => p.showInSidebar);

  return (
    <div style={{ padding: "40px", maxWidth: "720px" }}>
      <h1>Administration</h1>
      <p>Vous êtes connecté. Choisissez une section :</p>

      <ul style={{ listStyle: "none", padding: 0, margin: "24px 0" }}>
        {quickLinks.map((page) => (
          <li key={page.id} style={{ marginBottom: "12px" }}>
            <Link
              to={page.path}
              style={{
                display: "block",
                padding: "14px 18px",
                backgroundColor: page.id === "stock-management" ? "#e7f1ff" : "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                textDecoration: "none",
                color: "#212529",
                fontWeight: page.id === "stock-management" ? 600 : 400,
              }}
            >
              {page.label}
              {page.id === "stock-management" && (
                <span style={{ display: "block", fontSize: "0.85em", color: "#6c757d", marginTop: "4px" }}>
                  Tableau d'évolution journalier du stock par produit
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Déconnexion
      </button>
    </div>
  );
}

export default AdminPage;
