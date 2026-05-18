import React, { useEffect, useState } from "react";
import {
  getOrdersSummaryByDay,
  getAbsoluteGlobalTotal,
  getCategoryStatistics
} from "../services/order.service";
import "./OrderDashboard.css";

const OrderDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [categoryStats, setCategoryStats] = useState([]);

  // 1. État pour le total de la période filtrée
  const [totalFiltered, setTotalFiltered] = useState({ amount: 0, count: 0 });

  // 2. État pour le total absolu (Toute la base)
  const [totalAbsolute, setTotalAbsolute] = useState({ amount: 0, count: 0 });

  const fetchStats = async (start = null, end = null) => {
    setLoading(true);
    try {
      // Récupération des données filtrées pour le tableau
      const summary = await getOrdersSummaryByDay(start, end);
      setData(summary);

      // calcule des stats par catégorie (pour la section dédiée)
      const catStats = await getCategoryStatistics();
      setCategoryStats(catStats);

      // Calcul du total pour la période affichée
      const filtered = summary.reduce(
        (acc, day) => ({
          amount: acc.amount + day.totalAmount,
          count: acc.count + day.count,
        }),
        { amount: 0, count: 0 },
      );
      setTotalFiltered(filtered);

      // Récupération du total ABSOLU (Toute la base)
      const absolute = await getAbsoluteGlobalTotal();
      setTotalAbsolute(absolute);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="dashboard-container">
      <h3>📈 Statistiques des ventes</h3>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Début</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          className="filter-button"
          onClick={() => fetchStats(startDate, endDate)}
        >
          Filtrer
        </button>
        <button
          className="filter-button reset-button"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            fetchStats(null, null);
          }}
        >
          Réinitialiser
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Nb Commandes</th>
                <th>Total Journalier</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="3">Aucune donnée</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.date}>
                    <td>{new Date(row.date).toLocaleDateString("fr-FR")}</td>
                    <td>{row.count}</td>
                    <td className="amount-cell">
                      {row.totalAmount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* SECTION DES TOTAUX */}
          {data.length > 0 && (
            <div className="totals-footer-container">
              {/* TOTAL FILTRÉ (Période sélectionnée) */}
              <div className="grand-total-footer">
                <div>
                  <h4>Total sur la période filtrée</h4>
                  <small>{totalFiltered.count} commande(s)</small>
                </div>
                <div className="grand-total-value">
                  {totalFiltered.amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </div>
              </div>

              {/* TOTAL ABSOLU (Toute la base de données) */}
              <div className="absolute-total-container">
                <div className="absolute-total-label">💰 Total Global</div>
                <div className="absolute-total-value">
                  {totalAbsolute.totalAmount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </div>
              </div>
            </div>
          )}

          {/* NOUVEAU TABLEAU : Statistiques par catégorie */}
          {categoryStats.length > 0 && (
            <div style={{ marginTop: "40px" }}>
              <h3>📊 Statistiques par Catégorie de produits</h3>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Ventes (Total HT)</th>
                    <th>Achat (Total HT)</th>
                    <th>Bénéfice (Marge)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((stat, idx) => (
                    <tr key={idx}>
                      <td>{stat.categoryName}</td>
                      <td className="amount-cell">
                        {stat.totalSalesHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </td>
                      <td className="amount-cell">
                        {stat.totalPurchaseHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </td>
                      <td className="amount-cell" style={{ color: stat.profit >= 0 ? "green" : "red", fontWeight: "bold" }}>
                        {stat.profit.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderDashboard;
