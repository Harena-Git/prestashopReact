import { useState, useEffect } from "react";
import { listAllProducts } from "../services/moduleListe";
import { updateResource, PrestashopClient } from "../../../api/prestashop.api";

function StockManagementPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [addAmounts, setAddAmounts] = useState({});
  const [message, setMessage] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await listAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
      setMessage({ type: "error", text: "Erreur lors du chargement des produits." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAmountChange = (productId, value) => {
    setAddAmounts(prev => ({ ...prev, [productId]: value }));
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
      const client = new PrestashopClient();

      // 1. Trouver l'ID du stock_available pour ce produit
      const stockData = await client.get(`stock_availables?filter[id_product]=${product.id}&filter[id_product_attribute]=0`);
      const stocks = Array.isArray(stockData.stock_availables) ? stockData.stock_availables : [stockData.stock_availables];

      if (!stocks[0] || !stocks[0].id) {
        throw new Error("Enregistrement de stock introuvable pour ce produit.");
      }

      const stockId = stocks[0].id;
      const currentQty = parseInt(stocks[0].quantity, 10) || 0;
      const newQty = currentQty + amountToAdd;

      // 2. Mettre à jour via PUT
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_available>
    <id>${stockId}</id>
    <id_product>${product.id}</id_product>
    <id_product_attribute>0</id_product_attribute>
    <id_shop>1</id_shop>
    <id_shop_group>0</id_shop_group>
    <quantity>${newQty}</quantity>
    <depends_on_stock>0</depends_on_stock>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>`;

      await updateResource("stock_availables", xml);

      setMessage({ type: "success", text: `Stock mis à jour pour "${product.name}" (+${amountToAdd}). Nouveau total: ${newQty}` });

      // Mettre à jour la liste locale
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: newQty } : p));
      setAddAmounts(prev => ({ ...prev, [product.id]: "" }));

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
        <div style={{
          padding: "15px",
          borderRadius: "6px",
          marginBottom: "20px",
          backgroundColor: message.type === "success" ? "#d4edda" : "#f8d7da",
          color: message.type === "success" ? "#155724" : "#721c24",
          border: `1px solid ${message.type === "success" ? "#c3e6cb" : "#f5c6cb"}`
        }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div>Chargement des produits...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa", textAlign: "left" }}>
              <th style={{ padding: "12px", borderBottom: "2px solid #dee2e6" }}>Produit</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #dee2e6" }}>Référence</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #dee2e6", textAlign: "center" }}>Stock Actuel</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #dee2e6", textAlign: "center" }}>Ajouter</th>
              <th style={{ padding: "12px", borderBottom: "2px solid #dee2e6", textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6" }}>
                  <strong>{product.name}</strong>
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6" }}>{product.reference}</td>
                <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6", textAlign: "center" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    backgroundColor: product.quantity > 0 ? "#e2f3e5" : "#fde8e8",
                    color: product.quantity > 0 ? "#2e7d32" : "#c62828",
                    fontWeight: "bold"
                  }}>
                    {product.quantity}
                  </span>
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6", textAlign: "center" }}>
                  <input
                    type="number"
                    min="1"
                    value={addAmounts[product.id] || ""}
                    onChange={(e) => handleAmountChange(product.id, e.target.value)}
                    placeholder="Qté"
                    style={{ width: "80px", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6", textAlign: "center" }}>
                  <button
                    onClick={() => handleUpdateStock(product)}
                    disabled={updatingId === product.id}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: updatingId === product.id ? "not-allowed" : "pointer"
                    }}
                  >
                    {updatingId === product.id ? "..." : "Ajouter au stock"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StockManagementPage;
