import React, { useState, useEffect } from "react";
import { getDailyStockEvolution } from "../services/stock.service";

/**
 * Composant affichant l'évolution journalière du stock avec le détail :
 * Date, Stock Initial, Entrées, Sorties/Ventes, Stock Final
 */
function DailyStockEvolutionTable({ productId }) {
  const [evolutionData, setEvolutionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const fetchEvolution = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDailyStockEvolution(productId);
        setEvolutionData(data);
      } catch (err) {
        // En cas d'erreur de permission (ws_key etc.), on met des fausses données pour l'exemple
        console.warn("API indisponible, chargement des données factices", err);
        setEvolutionData(generateMockDailyEvolution());
        setError("L'API PrestaShop n'a probablement pas les permissions pour 'stock_movements' et/ou 'stock_availables'. Données simulées affichées.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvolution();
  }, [productId]);

  // Fonction générant des données factices en cas d'erreur (pour la démonstration UI)
  const generateMockDailyEvolution = () => {
    const today = new Date();
    let currentStock = Math.floor(Math.random() * 50) + 10;
    
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const inputs = Math.floor(Math.random() * 10);
      const outputs = Math.floor(Math.random() * 15);
      const finalStock = currentStock;
      const initialStock = finalStock - inputs + outputs;
      
      currentStock = initialStock; // rollback pour le jour d'avant

      return {
        date: d.toISOString().split("T")[0],
        initialStock,
        inputs,
        outputs,
        finalStock
      };
    });
  };

  if (!productId) return null;
  if (loading) return <div style={{ padding: "10px" }}>Calcul de l'évolution journalière...</div>;

  return (
    <div style={{ marginTop: "15px", backgroundColor: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd" }}>
      <h4 style={{ marginTop: 0, marginBottom: "15px", color: "#333" }}>Synthèse journalière du stock (Produit #{productId})</h4>
      
      {error && <div style={{ color: "#d9534f", marginBottom: "10px", fontSize: "0.9em" }}>⚠ {error}</div>}
      
      {evolutionData.length === 0 ? (
        <p>Aucune donnée de stock trouvée.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f1f1" }}>
              <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "left" }}>Date</th>
              <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "center" }}>Stock Initial</th>
              <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "center", color: "#28a745" }}>Entrées (+)</th>
              <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "center", color: "#dc3545" }}>Ventes/Sorties (-)</th>
              <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "center", fontWeight: "bold" }}>Stock Final</th>
            </tr>
          </thead>
          <tbody>
            {evolutionData.map((day, idx) => (
              <tr key={day.date} style={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#ffffff" }}>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee", fontWeight: "500" }}>
                  {new Date(day.date).toLocaleDateString("fr-FR")}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                  {day.initialStock}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "center", color: "#28a745" }}>
                  {day.inputs > 0 ? `+${day.inputs}` : "-"}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "center", color: "#dc3545" }}>
                  {day.outputs > 0 ? `-${day.outputs}` : "-"}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "center", fontWeight: "bold" }}>
                  {day.finalStock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DailyStockEvolutionTable;