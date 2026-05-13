import { listClientsService } from "../services/clientService";
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ClientContext } from "../../../contexts/ClientContext";

function ListLoginClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Mampiasa ny contexte mba hakana ilay fonction mpametraka ny client actif
  const { defineCurrentClient } = useContext(ClientContext);
  const navigate = useNavigate();

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await listClientsService();
        setClients(data);
      } catch (error) {
        console.error("Tsa misy kilian", error);
        setError("Diso chargement'ny kilian");
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  const handleClientClick = (client) => {
    // Solon'ny fampiasana localStorage tonga dia ampiasaina ity contexte ity
    defineCurrentClient(client);
    // Redirection vers la liste des produits
    navigate("/modules/list");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Liste des clients</h1>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {clients.map((client) => (
            <li 
              key={client.id} 
              onClick={() => handleClientClick(client)}
              style={{
                cursor: "pointer",
                padding: "10px",
                margin: "5px 0",
                backgroundColor: "#f5f5f5",
                borderRadius: "5px",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#e0e0e0'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            >
              👤 {client.firstname} {client.lastname} ({client.email})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ListLoginClients;