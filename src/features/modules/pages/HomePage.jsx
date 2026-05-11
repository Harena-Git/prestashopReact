// page de l'accueil
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>Bienvenue</h1>
      <p>Cliquez sur le bouton ci-dessous pour accéder à l'espace admin</p>
      <button 
        onClick={() => navigate("/login")}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px"
        }}
      >
        Admin
      </button>
    </div>
  );
}

export default HomePage;