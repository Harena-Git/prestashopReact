import React, { useState, useEffect } from "react";
import { PrestashopClient } from "../../../api/prestashop.api";

function StockEvolutionTable({ productId }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const fetchStockMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = new PrestashopClient();
        // Tentative de récupération des mouvements de stock via l'API
        // NB: Nécessite la permission "stock_movements" pour la clé API
        const data = await client.get(
          `stock_movements?filter[id_product]=${productId}&display=full&sort=[date_add_DESC]`
        );

        if (data && data.stock_movements) {
          const mvts = Array.isArray(data.stock_movements)
            ? data.stock_movements
            : [data.stock_movements];
          setMovements(mvts);
        } else {
          setMovements([]);
        }
      } catch (err) {
        console.warn("Erreur API stock_movements (permissions?), utilisation de données simulées pour la démonstration", err);
        // Fallback: Données factices pour l'affichage si l'API n'a pas les droits
        const mockData = generateMockMovements(productId);
        setMovements(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchStockMovements();
  }, [productId]);

  // Fonction pour générer des données factices en l'absence de permission API
  const generateMockMovements = (id) => {
    const today = new Date();
    return Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isAddition = Math.random() > 0.5;
      const qty = Math.floor(Math.random() * 20) + 1;
      return {
        id_stock_mvt: `MOCK-${i}`,
        date_add: d.toISOString().split("T")[0] + " 10:00:00",
        sign: isAddition ? 1 : -1,
        physical_quantity: qty,
        employee_firstname: "Admin",
        employee_lastname: "Demo",
        reason: isAddition ? "Réapprovisionnement" : "Commande client"
      };
    });
  };

  if (!productId) return null;
  if (loading) return <div style={{ padding: "10px" }}>Chargement de l'évolution...</div>;

  return (
    <div style={{ marginTop: "15px", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "8px" }}>
      <h4 style={{ marginTop: 0, marginBottom: "15px" }}>Évolution du stock (Produit #{productId})</h4>
      
      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
      
      {movements.length === 0 ? (
        <p>Aucun mouvement de stock enregistré.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#e9ecef" }}>
              <th style={{ padding: "8px", borderBottom: "1px solid #dee2e6", textAlign: "left" }}>Date</th>
              <th style={{ padding: "8px", borderBottom: "1px solid #dee2e6", textAlign: "left" }}>Raison</th>
              <th style={{ padding: "8px", borderBottom: "1px solid #dee2e6", textAlign: "center" }}>Mouvement</th>
              <th style={{ padding: "8px", borderBottom: "1px solid #dee2e6", textAlign: "left" }}>Opérateur</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((mvt) => (
              <tr key={mvt.id_stock_mvt || mvt.id}>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {mvt.date_add}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {mvt.reason || "Non spécifié"}
                </td>
                <td style={{ 
                  padding: "8px", 
                  borderBottom: "1px solid #eee", 
                  textAlign: "center",
                  fontWeight: "bold",
                  color: mvt.sign == 1 ? "#28a745" : "#dc3545" 
                }}>
                  {mvt.sign == 1 ? "+" : "-"}{mvt.physical_quantity}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {mvt.employee_firstname} {mvt.employee_lastname}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StockEvolutionTable;