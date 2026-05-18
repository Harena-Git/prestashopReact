import React, { useContext, useState, useMemo } from "react";
import { ClientContext } from "../../../contexts/ClientContext";
import { validateFullOrder } from "../services/frontendOrderService";
import { useNavigate } from "react-router-dom";

export default function CheckoutPage() {
  const { currentClient, cart, setCart } = useContext(ClientContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtrer le panier pour le client actuel
  const clientCart = useMemo(() => {
    return cart ? cart.filter((item) => item.clientId === currentClient?.id) : [];
  }, [cart, currentClient]);

  // Calculer le total
  const total = useMemo(() => {
    return clientCart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [clientCart]);

  if (!currentClient || clientCart.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Votre panier est vide</h2>
        <button
          onClick={() => navigate("/client/products")}
          style={{ padding: "10px 20px", marginTop: "20px", cursor: "pointer" }}
        >
          Retour aux produits
        </button>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const orderId = await validateFullOrder(currentClient, clientCart);

      // Vider le panier du client dans le localStorage et le state
      const newGlobalCart = cart.filter(item => item.clientId !== currentClient.id);
      if (setCart) {
          setCart(newGlobalCart);
      }
      localStorage.setItem("cart", JSON.stringify(newGlobalCart));

      alert(`Commande #${orderId} validée avec succès !`);
      navigate("/client/orders");
    } catch (err) {
      console.error(err);
      setError(`Erreur lors de la validation : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Validation de la commande</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>
        {/* Liste des articles */}
        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", background: "#f9f9f9" }}>
          <h3>Récapitulatif des articles</h3>
          {clientCart.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <span>{item.name} (x1)</span>
              <span>{Number(item.price).toFixed(2)} €</span>
            </div>
          ))}

          <div style={{ marginTop: "20px" }}>
            <p><strong>Mode de livraison :</strong> Livraison Standard (Gratuit)</p>
            <p><strong>Mode de paiement :</strong> Paiement à la livraison</p>
          </div>
        </div>

        {/* Résumé du total */}
        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", background: "#fff", height: "fit-content" }}>
          <h3>Total</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "20px" }}>
            <span>Total à payer :</span>
            <span>{total.toFixed(2)} €</span>
          </div>

          {error && (
            <div style={{ color: "red", marginBottom: "15px", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleConfirmOrder}
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Traitement..." : "Confirmer la commande"}
          </button>

          <button
            onClick={() => navigate("/client/cart")}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "10px",
              backgroundColor: "transparent",
              color: "#666",
              border: "1px solid #ccc",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Retour au panier
          </button>
        </div>
      </div>
    </div>
  );
}
