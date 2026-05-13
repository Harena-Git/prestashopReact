import React, { useContext } from "react";
import { ClientContext } from "../../../contexts/ClientContext";

export default function PanierPages() {
  const { currentClient, cart } = useContext(ClientContext);

  if (!currentClient) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Mon Panier</h2>
        <p>Veuillez vous connecter pour voir votre panier.</p>
      </div>
    );
  }

  const clientCart = cart ? cart.filter((item) => item.clientId === currentClient.id) : [];

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2>Mon Panier - {currentClient.firstname} {currentClient.lastname}</h2>
        {clientCart.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
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
                  alignItems: "center"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 10px 0" }}>{produit.name || "Produit sans nom"}</h3>
                  <p style={{ margin: "5px 0" }}>
                    <strong>ID Produit :</strong> {produit.id}
                  </p>
                  <p style={{ margin: "5px 0" }}>
                    <strong>Prix :</strong> {produit.price ? `${Number(produit.price).toFixed(2)} €` : "Prix non disponible"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Votre panier est vide.</p>
        )}
      </div>
    </div>
  );
}