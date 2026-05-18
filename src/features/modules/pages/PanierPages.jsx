import React, { useContext, useState } from "react";
import { ClientContext } from "../../../contexts/ClientContext";
import { validateOrderForProduct } from "../services/frontendOrderService";
import { useNavigate } from "react-router-dom";

export default function PanierPages() {
  const { currentClient, cart, removeFromCart } = useContext(ClientContext);
  const [validatingItems, setValidatingItems] = useState({});
  const [messages, setMessages] = useState({});
  const navigate = useNavigate();

  if (!currentClient) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Mon Panier</h2>
        <p>Veuillez vous connecter pour voir votre panier.</p>
        <button
          onClick={() => navigate("/customers")}
          style={{
            padding: "10px 15px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  const handleValidateOrder = async (produit) => {
    // Si l'utilisateur est anonyme (ID 1 ou flag isAnonymous), on le redirige vers la connexion
    if (currentClient.id === 1 || currentClient.isAnonymous) {
      alert("Vous devez être connecté pour valider un panier.");
      navigate("/customers");
      return;
    }

    setValidatingItems((prev) => ({ ...prev, [produit.id]: true }));
    setMessages((prev) => ({ ...prev, [produit.id]: null }));

    try {
      const orderId = await validateOrderForProduct(currentClient, produit);
      setMessages((prev) => ({
        ...prev,
        [produit.id]: {
          type: "success",
          text: `Commande validée avec succès ! (ID: ${orderId})`,
        },
      }));
      // On retire du panier
      removeFromCart(produit.id);
    } catch (error) {
      console.error(error);
      setMessages((prev) => ({
        ...prev,
        [produit.id]: { type: "error", text: `Erreur: ${error.message}` },
      }));
    } finally {
      setValidatingItems((prev) => ({ ...prev, [produit.id]: false }));
      // Faire disparaitre le message apres quelque secondes
      setTimeout(() => {
        setMessages((prev) => ({ ...prev, [produit.id]: null }));
      }, 5000);
    }
  };

  const clientCart = cart
    ? cart.filter((item) => item.clientId === currentClient.id)
    : [];

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div>
        <h2>
          Mon Panier - {currentClient.firstname} {currentClient.lastname}
        </h2>
        {clientCart.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {clientCart.map((produit, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ccc",
                  padding: "15px",
                  borderRadius: "8px",
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 10px 0" }}>
                    {produit.name || "Produit sans nom"}
                  </h3>
                  <p style={{ margin: "5px 0" }}>
                    <strong>ID Produit :</strong> {produit.id}
                  </p>
                  <p style={{ margin: "5px 0" }}>
                    <strong>Prix :</strong>{" "}
                    {produit.price
                      ? `${Number(produit.price).toFixed(2)} €`
                      : "Prix non disponible"}
                  </p>

                  {messages[produit.id] && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "8px",
                        borderRadius: "4px",
                        backgroundColor:
                          messages[produit.id].type === "success"
                            ? "#d4edda"
                            : "#f8d7da",
                        color:
                          messages[produit.id].type === "success"
                            ? "#155724"
                            : "#721c24",
                        fontSize: "0.9rem",
                      }}
                    >
                      {messages[produit.id].text}
                    </div>
                  )}
                </div>

                {/* <button
                  onClick={() => handleValidateOrder(produit)}
                  disabled={validatingItems[produit.id]}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: validatingItems[produit.id]
                      ? "#6c757d"
                      : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: validatingItems[produit.id]
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {validatingItems[produit.id]
                    ? "Validation en cours..."
                    : "Valider Commande"}
                </button> */}
              </div>
            ))}

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => navigate("/client/checkout")}
                style={{
                  padding: "15px 30px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                Passer à la caisse (Checkout)
              </button>
            </div>
          </div>
        ) : (
          <p>Votre panier est vide.</p>
        )}
      </div>
    </div>
  );
}
