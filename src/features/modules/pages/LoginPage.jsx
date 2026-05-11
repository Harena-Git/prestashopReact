import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (login(email, password)) {
        //  <==> render
      navigate("/admin");
    } else {
      setError("Email ou mot de passe incorrect");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="email">Email : </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="faniriantsoaharena@gmail.com"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box"
            }}
            required
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="password">Mot de passe : </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Entrez votre mot de passe"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box"
            }}
            required
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button 
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}

export default LoginPage;