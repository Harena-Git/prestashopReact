import React, { useState, useEffect, useCallback } from "react";
import { getDailyStockEvolution } from "../services/stock.service";

/**
 * Tableau d'évolution journalière : Date, Stock initial, Entrées, Sorties, Stock final.
 * @param {number} productId
 * @param {number} [refreshKey] - Incrémenter pour recharger après une mise à jour de stock
 */
function DailyStockEvolutionTable({ productId, refreshKey = 0 }) {
  const [evolutionData, setEvolutionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvolution = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getDailyStockEvolution(productId);
      setEvolutionData(data);
    } catch (err) {
      console.error("Erreur chargement évolution stock:", err);
      setEvolutionData([]);
      setError(
        err.message ||
          "Impossible de charger l'évolution. Vérifiez que la clé API a accès à stock_movements et stock_availables.",
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadEvolution();
  }, [loadEvolution, refreshKey]);

  if (!productId) return null;

  if (loading) {
    return <div style={{ padding: "10px" }}>Calcul de l'évolution journalière...</div>;
  }

  return (
    <div
      style={{
        marginTop: "15px",
        backgroundColor: "#fff",
        padding: "15px",
        borderRadius: "8px",
        border: "1px solid #ddd",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <h4 style={{ margin: 0, color: "#333" }}>
          Évolution journalière du stock (Produit #{productId})
        </h4>
        <button
          type="button"
          onClick={loadEvolution}
          style={{
            padding: "6px 12px",
            fontSize: "0.85rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "#f8f9fa",
            cursor: "pointer",
          }}
        >
          Actualiser
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "#721c24",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "10px",
            fontSize: "0.9em",
          }}
        >
          {error}
        </div>
      )}

      {!error && evolutionData.length === 0 ? (
        <p>Aucune donnée de stock trouvée.</p>
      ) : (
        !error && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f1f1f1" }}>
                <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "left" }}>
                  Date
                </th>
                <th style={{ padding: "10px", borderBottom: "2px solid #ccc", textAlign: "center" }}>
                  Stock initial
                </th>
                <th
                  style={{
                    padding: "10px",
                    borderBottom: "2px solid #ccc",
                    textAlign: "center",
                    color: "#28a745",
                  }}
                >
                  Entrées (+)
                </th>
                <th
                  style={{
                    padding: "10px",
                    borderBottom: "2px solid #ccc",
                    textAlign: "center",
                    color: "#dc3545",
                  }}
                >
                  Ventes / sorties (-)
                </th>
                <th
                  style={{
                    padding: "10px",
                    borderBottom: "2px solid #ccc",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Stock final
                </th>
              </tr>
            </thead>
            <tbody>
              {evolutionData.map((day, idx) => (
                <tr
                  key={`${day.date}-${idx}`}
                  style={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#ffffff" }}
                >
                  <td style={{ padding: "10px", borderBottom: "1px solid #eee", fontWeight: "500" }}>
                    {new Date(day.date + "T12:00:00").toLocaleDateString("fr-FR")}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "center" }}>
                    {day.initialStock}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #eee",
                      textAlign: "center",
                      color: "#28a745",
                    }}
                  >
                    {day.inputs > 0 ? `+${day.inputs}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #eee",
                      textAlign: "center",
                      color: "#dc3545",
                    }}
                  >
                    {day.outputs > 0 ? `-${day.outputs}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #eee",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {day.finalStock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export default DailyStockEvolutionTable;
