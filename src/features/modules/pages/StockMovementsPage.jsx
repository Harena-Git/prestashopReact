import React, { useState, useCallback } from "react";
import {
  fetchAllMovements,
  fetchCurrentStock,
  buildDailySummary,
} from "../services/stockMovements.service";

// ─── Styles partagés ────────────────────────────────────────────────────────────

const styles = {
  page: { padding: "20px", fontFamily: "sans-serif" },
  header: { marginBottom: "24px" },
  title: { margin: "0 0 4px 0", fontSize: "1.6rem" },
  subtitle: { margin: 0, color: "#666", fontSize: "0.9rem" },

  filterBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  label: { fontWeight: 600, fontSize: "0.85rem", color: "#444" },
  input: {
    padding: "7px 10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "0.9rem",
  },
  btnPrimary: {
    padding: "8px 18px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  btnSecondary: {
    padding: "8px 14px",
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },

  section: {
    marginBottom: "28px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #dee2e6",
    cursor: "pointer",
    userSelect: "none",
  },
  sectionTitle: { margin: 0, fontSize: "1rem", fontWeight: 700 },
  sectionCount: {
    marginLeft: "8px",
    fontSize: "0.8rem",
    color: "#888",
    fontWeight: 400,
  },
  tableWrapper: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  th: {
    padding: "10px 12px",
    borderBottom: "2px solid #dee2e6",
    backgroundColor: "#f8f9fa",
    textAlign: "left",
    whiteSpace: "nowrap",
    fontWeight: 600,
    color: "#495057",
  },
  td: {
    padding: "9px 12px",
    borderBottom: "1px solid #f0f0f0",
    verticalAlign: "middle",
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

  emptyRow: {
    textAlign: "center",
    padding: "24px",
    color: "#888",
    fontStyle: "italic",
  },
};

// ─── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    OK: { bg: "#d4edda", color: "#155724" },
    Faible: { bg: "#fff3cd", color: "#856404" },
    Rupture: { bg: "#f8d7da", color: "#721c24" },
  };
  const c = colors[status] || { bg: "#e9ecef", color: "#495057" };
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: "12px",
        fontSize: "0.78rem",
        fontWeight: 700,
        backgroundColor: c.bg,
        color: c.color,
      }}
    >
      {status}
    </span>
  );
}

function MovementBadge({ type }) {
  const colors = {
    Vente: { bg: "#f8d7da", color: "#721c24" },
    Retour: { bg: "#d4edda", color: "#155724" },
    Ajustement: { bg: "#d1ecf1", color: "#0c5460" },
  };
  const c = colors[type] || { bg: "#e9ecef", color: "#495057" };
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: "12px",
        fontSize: "0.78rem",
        fontWeight: 700,
        backgroundColor: c.bg,
        color: c.color,
      }}
    >
      {type}
    </span>
  );
}

function QtyDisplay({ quantity }) {
  const isPositive = quantity >= 0;
  return (
    <span
      style={{
        fontWeight: 700,
        color: isPositive ? "#155724" : "#721c24",
      }}
    >
      {isPositive ? `+${quantity}` : quantity}
    </span>
  );
}

// ─── Section collapsible ────────────────────────────────────────────────────────

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader} onClick={() => setOpen((o) => !o)}>
        <h2 style={styles.sectionTitle}>
          {title}
          {count !== undefined && (
            <span style={styles.sectionCount}>({count} ligne{count !== 1 ? "s" : ""})</span>
          )}
        </h2>
        <span style={{ fontSize: "1.1rem", color: "#666" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={styles.tableWrapper}>{children}</div>}
    </div>
  );
}

// ─── Table : Mouvements journaliers ────────────────────────────────────────────

function MovementsTable({ data }) {
  if (!data.length) {
    return <p style={styles.emptyRow}>Aucun mouvement trouvé pour cette période.</p>;
  }
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {[
            "Date",
            "Référence",
            "Produit",
            "Déclinaison",
            "Type",
            "Quantité",
            "Stock Avant",
            "Stock Après",
            "ID Commande",
            "Statut",
          ].map((h) => (
            <th key={h} style={styles.th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((m, i) => (
          <tr
            key={i}
            style={{
              backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa",
            }}
          >
            <td style={styles.td}>{m.date}</td>
            <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.8rem" }}>
              {m.reference || "—"}
            </td>
            <td style={styles.td}>{m.productName}</td>
            <td style={{ ...styles.td, color: "#666" }}>{m.variant}</td>
            <td style={styles.td}>
              <MovementBadge type={m.type} />
            </td>
            <td style={{ ...styles.td, textAlign: "center" }}>
              <QtyDisplay quantity={m.quantity} />
            </td>
            <td style={{ ...styles.td, textAlign: "center", color: "#555" }}>
              {m.stockBefore !== null ? m.stockBefore : "—"}
            </td>
            <td style={{ ...styles.td, textAlign: "center", color: "#555" }}>
              {m.stockAfter !== null ? m.stockAfter : "—"}
            </td>
            <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.8rem" }}>
              {m.orderId ? `#${m.orderId}` : "—"}
            </td>
            <td style={styles.td}>{m.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Table : Stock actuel ───────────────────────────────────────────────────────

function CurrentStockTable({ data }) {
  if (!data.length) {
    return <p style={styles.emptyRow}>Aucun stock disponible.</p>;
  }
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {["Référence", "Produit", "Déclinaison", "Stock Actuel", "Statut"].map(
            (h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {data.map((s, i) => (
          <tr
            key={s.id}
            style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
          >
            <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.8rem" }}>
              {s.reference || "—"}
            </td>
            <td style={styles.td}>
              <strong>{s.productName}</strong>
            </td>
            <td style={{ ...styles.td, color: "#666" }}>{s.variant}</td>
            <td style={{ ...styles.td, textAlign: "center" }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  backgroundColor:
                    s.quantity === 0
                      ? "#f8d7da"
                      : s.quantity <= 5
                      ? "#fff3cd"
                      : "#e2f3e5",
                  color:
                    s.quantity === 0
                      ? "#721c24"
                      : s.quantity <= 5
                      ? "#856404"
                      : "#2e7d32",
                }}
              >
                {s.quantity}
              </span>
            </td>
            <td style={styles.td}>
              <StatusBadge status={s.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Table : Résumé journalier ──────────────────────────────────────────────────

function DailySummaryTable({ data }) {
  if (!data.length) {
    return <p style={styles.emptyRow}>Aucun résumé disponible.</p>;
  }
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {["Date", "Nb Ventes", "Total Sorties", "Total Retours", "Total Net"].map(
            (h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr
            key={d.date}
            style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
          >
            <td style={{ ...styles.td, fontWeight: 600 }}>{d.date}</td>
            <td style={{ ...styles.td, textAlign: "center" }}>{d.nbSales}</td>
            <td style={{ ...styles.td, textAlign: "center", color: "#721c24", fontWeight: 600 }}>
              -{d.totalOut}
            </td>
            <td style={{ ...styles.td, textAlign: "center", color: "#155724", fontWeight: 600 }}>
              +{d.totalReturns}
            </td>
            <td style={{ ...styles.td, textAlign: "center" }}>
              <QtyDisplay quantity={d.totalNet} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────────

function StockMovementsPage() {
  // Période par défaut : 30 derniers jours
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [movements, setMovements] = useState([]);
  const [currentStock, setCurrentStock] = useState([]);
  const [summary, setSummary] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mvts, stock] = await Promise.all([
        fetchAllMovements(startDate || null, endDate || null),
        fetchCurrentStock(),
      ]);

      setMovements(mvts);
      setCurrentStock(stock);
      setSummary(buildDailySummary(mvts));
      setLoaded(true);
    } catch (err) {
      console.error("[StockMovements] Erreur chargement:", err);
      setError(`Erreur lors du chargement des données : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const handleReset = () => {
    setStartDate(thirtyDaysAgo);
    setEndDate(today);
  };

  return (
    <div style={styles.page}>
      {/* En-tête */}
      <div style={styles.header}>
        <h1 style={styles.title}>Suivi des Mouvements de Stock</h1>
        <p style={styles.subtitle}>
          Reconstruit à partir des commandes, retours et stock disponible via l'API WebService PrestaShop.
        </p>
      </div>

      {/* Barre de filtres */}
      <div style={styles.filterBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={styles.label} htmlFor="start-date">Du :</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={styles.label} htmlFor="end-date">Au :</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            ...styles.btnPrimary,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Chargement…" : loaded ? "🔄 Actualiser" : "📊 Charger"}
        </button>
        <button onClick={handleReset} style={styles.btnSecondary} disabled={loading}>
          Réinitialiser
        </button>
      </div>

      {/* Erreur */}
      {error && <div style={styles.alert("error")}>{error}</div>}

      {/* État initial */}
      {!loaded && !loading && !error && (
        <div style={styles.alert("info")}>
          Sélectionnez une période et cliquez sur <strong>Charger</strong> pour afficher les données.
        </div>
      )}

      {/* Spinner */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          <p>Interrogation de l'API PrestaShop…</p>
          <p style={{ fontSize: "0.8rem" }}>
            (commandes, retours, stocks — cela peut prendre quelques secondes)
          </p>
        </div>
      )}

      {/* Données */}
      {loaded && !loading && (
        <>
          {/* 1. Mouvements journaliers */}
          <Section
            title="Mouvements Journaliers"
            count={movements.length}
            defaultOpen={true}
          >
            <MovementsTable data={movements} />
          </Section>

          {/* 2. Stock actuel */}
          <Section
            title="Stock Actuel"
            count={currentStock.length}
            defaultOpen={true}
          >
            <CurrentStockTable data={currentStock} />
          </Section>

          {/* 3. Résumé journalier */}
          <Section
            title="Résumé Journalier"
            count={summary.length}
            defaultOpen={true}
          >
            <DailySummaryTable data={summary} />
          </Section>
        </>
      )}
    </div>
  );
}

export default StockMovementsPage;
