import React, { useState, useEffect } from "react";
import { listAllProducts } from "../services/moduleListe";
import { updateStockWithMovement } from "../services/stock.service";
import StockEvolutionTable from "../components/StockEvolutionTable";

function StockManagementPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [addAmounts, setAddAmounts] = useState({});
  const [message, setMessage] = useState(null);
  const [expandedProductId, setExpandedProductId] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await listAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      setMessage({
        type: "error",
        text: "Erreur lors du chargement des produits.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAmountChange = (productId, value) => {
    setAddAmounts((prev) => ({ ...prev, [productId]: value }));
  };

  const handleUpdateStock = async (product) => {
    const amountToAdd = parseInt(addAmounts[product.id] || 0, 10);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      alert("Veuillez saisir une quantité positive à ajouter.");
      return;
    }

    setUpdatingId(product.id);
    setMessage(null);

    try {
      // Utilisation du nouveau service avec historique des mouvements
      const result = await updateStockWithMovement({
        productId: product.id,
        attributeId: 0,
        quantityChange: amountToAdd,
      });

      setMessage({
        type: "success",
        text: `Stock mis à jour pour "${product.name}" (+${amountToAdd}). Nouveau total: ${result.newStock}`,
      });

      // Mettre à jour la liste locale
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, quantity: result.newStock } : p,
        ),
      );
      setAddAmounts((prev) => ({ ...prev, [product.id]: "" }));
    } catch (error) {
      console.error("Erreur mise à jour stock:", error);
      setMessage({ type: "error", text: `Erreur: ${error.message}` });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Gestion des Stocks</h1>
      <p>Ajoutez des unités au stock existant de vos produits.</p>

      {message && (
        <div
          style={{
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px",
            backgroundColor: message.type === "success" ? "#d4edda" : "#f8d7da",
            color: message.type === "success" ? "#155724" : "#721c24",
            border: `1px solid ${message.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div>Chargement des produits...</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa", textAlign: "left" }}>
              <th
                style={{ padding: "12px", borderBottom: "2px solid #dee2e6" }}
              >
                Produit
              </th>
              <th
                style={{ padding: "12px", borderBottom: "2px solid #dee2e6" }}
              >
                Référence
              </th>
              <th
                style={{
                  padding: "12px",
                  borderBottom: "2px solid #dee2e6",
                  textAlign: "center",
                }}
              >
                Stock Actuel
              </th>
              <th
                style={{
                  padding: "12px",
                  borderBottom: "2px solid #dee2e6",
                  textAlign: "center",
                }}
              >
                Ajouter
              </th>
              <th
                style={{
                  padding: "12px",
                  borderBottom: "2px solid #dee2e6",
                  textAlign: "center",
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <React.Fragment key={product.id}>
                <tr key={`row-${product.id}`}>
                <td
                  style={{ padding: "12px", borderBottom: "1px solid #dee2e6" }}
                >
                  <strong>{product.name}</strong>
                </td>
                <td
                  style={{ padding: "12px", borderBottom: "1px solid #dee2e6" }}
                >
                  {product.reference}
                </td>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #dee2e6",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "12px",
                      backgroundColor:
                        product.quantity > 0 ? "#e2f3e5" : "#fde8e8",
                      color: product.quantity > 0 ? "#2e7d32" : "#c62828",
                      fontWeight: "bold",
                    }}
                  >
                    {product.quantity}
                  </span>
                </td>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #dee2e6",
                    textAlign: "center",
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    value={addAmounts[product.id] || ""}
                    onChange={(e) =>
                      handleAmountChange(product.id, e.target.value)
                    }
                    placeholder="Qté"
                    style={{
                      width: "80px",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </td>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #dee2e6",
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={() => handleUpdateStock(product)}
                    disabled={updatingId === product.id}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        updatingId === product.id ? "not-allowed" : "pointer",
                      marginBottom: "4px"
                    }}
                  >
                    {updatingId === product.id ? "..." : "Ajouter au stock"}
                  </button>
                  <br />
                  <button
                    onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85em"
                    }}
                  >
                    {expandedProductId === product.id ? "Cacher évol." : "Évolution"}
                  </button>
                </td>
              </tr>
              {expandedProductId === product.id && (
                <tr key={`evo-${product.id}`}>
                  <td colSpan="5" style={{ padding: "0 12px", borderBottom: "1px solid #dee2e6" }}>
                    <StockEvolutionTable productId={product.id} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StockManagementPage;
