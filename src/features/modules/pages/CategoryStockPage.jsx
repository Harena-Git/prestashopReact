import React, { useState, useCallback } from "react";
import { fetchCategoryStockData } from "../services/categoryStock.service";

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: { padding: "20px", fontFamily: "sans-serif" },

  header: { marginBottom: "24px" },
  title: { margin: "0 0 4px 0", fontSize: "1.6rem", fontWeight: 700 },
  subtitle: { margin: 0, color: "#666", fontSize: "0.9rem" },

  toolbar: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,.1)",
    flexWrap: "wrap",
  },

  btnPrimary: {
    padding: "9px 20px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,.1)",
    overflow: "hidden",
    marginBottom: "28px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #dee2e6",
  },
  cardTitle: { margin: 0, fontSize: "1rem", fontWeight: 700 },
  cardCount: { margin: 0, fontSize: "0.8rem", color: "#888" },

  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: {
    padding: "11px 14px",
    borderBottom: "2px solid #dee2e6",
    backgroundColor: "#f8f9fa",
    textAlign: "left",
    whiteSpace: "nowrap",
    fontWeight: 700,
    color: "#495057",
  },
  thNum: {
    padding: "11px 14px",
    borderBottom: "2px solid #dee2e6",
    backgroundColor: "#f8f9fa",
    textAlign: "right",
    whiteSpace: "nowrap",
    fontWeight: 700,
    color: "#495057",
  },
  td: {
    padding: "10px 14px",
    borderBottom: "1px solid #f0f0f0",
    verticalAlign: "middle",
  },
  tdNum: {
    padding: "10px 14px",
    borderBottom: "1px solid #f0f0f0",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
  },

  alert: (type) => ({
    padding: "14px 16px",
    borderRadius: "6px",
    marginBottom: "20px",
    backgroundColor: type === "error" ? "#f8d7da" : "#d1ecf1",
    color: type === "error" ? "#721c24" : "#0c5460",
    border: `1px solid ${type === "error" ? "#f5c6cb" : "#bee5eb"}`,
    fontSize: "0.9rem",
  }),

  spinner: { textAlign: "center", padding: "48px", color: "#666" },
  spinnerIcon: { fontSize: "2.2rem", marginBottom: "12px" },

  emptyRow: {
    textAlign: "center",
    padding: "28px",
    color: "#888",
    fontStyle: "italic",
  },

  // TotalRow
  totalRow: {
    backgroundColor: "#e8f4fd",
    fontWeight: 700,
  },
};

// ─── Badge disponibilité ──────────────────────────────────────────────────────

function AvailBadge({ qty }) {
  let bg, color;
  if (qty <= 0) {
    bg = "#f8d7da";
    color = "#721c24";
  } else if (qty <= 20) {
    bg = "#fff3cd";
    color = "#856404";
  } else {
    bg = "#d4edda";
    color = "#155724";
  }
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "0.8rem",
        fontWeight: 700,
        backgroundColor: bg,
        color,
      }}
    >
      {qty.toLocaleString("fr-FR")}
    </span>
  );
}

// ─── Légende des états ────────────────────────────────────────────────────────

function Legend() {
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        padding: "12px 16px",
        borderTop: "1px solid #f0f0f0",
        backgroundColor: "#fafafa",
        fontSize: "0.8rem",
        color: "#555",
      }}
    >
      <strong>Légende disponibilité :</strong>
      {[
        { bg: "#d4edda", color: "#155724", label: "> 20 — OK" },
        { bg: "#fff3cd", color: "#856404", label: "1–20 — Faible" },
        { bg: "#f8d7da", color: "#721c24", label: "≤ 0 — Rupture" },
      ].map(({ bg, color, label }) => (
        <span key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: bg,
              border: `1px solid ${color}`,
            }}
          />
          {label}
        </span>
      ))}
      <span style={{ marginLeft: "auto", color: "#888", fontStyle: "italic" }}>
        Qté réservée = commandes en cours (états : Paiement accepté, En préparation, Expédié)
      </span>
    </div>
  );
}

// ─── Tableau principal ────────────────────────────────────────────────────────

function StockTable({ data }) {
  if (!data.length) {
    return <p style={S.emptyRow}>Aucune donnée de stock disponible.</p>;
  }

  // Totaux
  const totals = data.reduce(
    (acc, row) => {
      acc.qtePhysique += row.qtePhysique;
      acc.qteReservee += row.qteReservee;
      acc.qteDisponible += row.qteDisponible;
      return acc;
    },
    { qtePhysique: 0, qteReservee: 0, qteDisponible: 0 },
  );

  return (
    <>
      <div style={S.tableWrapper}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Catégorie</th>
              <th style={S.thNum}>Qté physique</th>
              <th style={S.thNum}>Qté réservée</th>
              <th style={{ ...S.thNum, minWidth: "140px" }}>Qté disponible</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.categoryId}
                style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <td style={S.td}>
                  <strong>{row.categoryName}</strong>
                </td>
                <td style={S.tdNum}>{row.qtePhysique.toLocaleString("fr-FR")}</td>
                <td
                  style={{
                    ...S.tdNum,
                    color: row.qteReservee > 0 ? "#856404" : "#aaa",
                  }}
                >
                  {row.qteReservee > 0
                    ? `−${row.qteReservee.toLocaleString("fr-FR")}`
                    : "—"}
                </td>
                <td style={S.tdNum}>
                  <AvailBadge qty={row.qteDisponible} />
                </td>
              </tr>
            ))}

            {/* Ligne de total */}
            <tr style={S.totalRow}>
              <td style={{ ...S.td, fontWeight: 700 }}>TOTAL</td>
              <td style={S.tdNum}>{totals.qtePhysique.toLocaleString("fr-FR")}</td>
              <td style={{ ...S.tdNum, color: totals.qteReservee > 0 ? "#856404" : "#aaa" }}>
                {totals.qteReservee > 0
                  ? `−${totals.qteReservee.toLocaleString("fr-FR")}`
                  : "—"}
              </td>
              <td style={S.tdNum}>
                <AvailBadge qty={totals.qteDisponible} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Legend />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoryStockPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCategoryStockData();
      setData(result);
      setLoaded(true);
      setLastRefresh(new Date().toLocaleTimeString("fr-FR"));
    } catch (err) {
      console.error("[CategoryStock] Erreur chargement :", err);
      setError(`Erreur lors du chargement : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={S.page}>
      {/* En-tête */}
      <div style={S.header}>
        <h1 style={S.title}>Suivi de Stock par Catégorie</h1>
        <p style={S.subtitle}>
          Stock physique, réservé et disponible — reconstruit depuis l'API WebService PrestaShop.
        </p>
      </div>

      {/* Barre d'actions */}
      <div style={S.toolbar}>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            ...S.btnPrimary,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Chargement…" : loaded ? "🔄 Actualiser" : "📊 Charger les données"}
        </button>

        {lastRefresh && !loading && (
          <span style={{ fontSize: "0.8rem", color: "#888" }}>
            Dernière mise à jour : {lastRefresh}
          </span>
        )}

        {loaded && !loading && (
          <span style={{ fontSize: "0.85rem", color: "#555", marginLeft: "auto" }}>
            {data.length} catégorie{data.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Erreur */}
      {error && <div style={S.alert("error")}>{error}</div>}

      {/* État initial */}
      {!loaded && !loading && !error && (
        <div style={S.alert("info")}>
          Cliquez sur <strong>Charger les données</strong> pour calculer le stock par catégorie.
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div style={S.spinner}>
          <div style={S.spinnerIcon}>⏳</div>
          <p>Interrogation de l'API PrestaShop…</p>
          <p style={{ fontSize: "0.8rem", color: "#999" }}>
            Récupération des stocks, commandes, produits et catégories…
          </p>
        </div>
      )}

      {/* Données */}
      {loaded && !loading && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <h2 style={S.cardTitle}>Stock agrégé par catégorie</h2>
            <p style={S.cardCount}>
              {data.length} catégorie{data.length !== 1 ? "s" : ""}
            </p>
          </div>
          <StockTable data={data} />
        </div>
      )}
    </div>
  );
}
