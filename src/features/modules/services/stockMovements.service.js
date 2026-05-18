import { PrestashopClient } from "../../../api/prestashop.api";

/**
 * Service : Suivi des mouvements de stock
 * Reconstruit les mouvements à partir des commandes, retours et stock_availables.
 * Utilise uniquement l'API WebService PrestaShop (pas d'accès direct à la BDD).
 */

function normalizeList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractName(nameField) {
  if (!nameField) return "";
  if (typeof nameField === "string") return nameField;
  if (nameField.language) {
    const lang = Array.isArray(nameField.language)
      ? nameField.language[0]
      : nameField.language;
    return lang?.["#text"] || lang?.value || String(lang) || "";
  }
  return "";
}

const STATE_LABELS = {
  1: "En attente",
  2: "Paiement effectué",
  3: "En préparation",
  4: "Expédié",
  5: "Livré",
  6: "Annulé",
};

function getStateLabel(stateId) {
  return STATE_LABELS[stateId] || `État ${stateId}`;
}

const LOW_STOCK_THRESHOLD = 5;

// ─── Produits ─────────────────────────────────────────────────────────────────

async function fetchProductMap(client) {
  try {
    const data = await client.get("products");
    const products = normalizeList(data?.products);
    const map = {};
    products.forEach((p) => {
      map[String(p.id)] = {
        name: extractName(p.name) || `Produit ${p.id}`,
        reference: p.reference || "",
      };
    });
    return map;
  } catch {
    return {};
  }
}

async function fetchComboMap(client) {
  try {
    const data = await client.get("combinations");
    const combos = normalizeList(data?.combinations);
    const map = {};
    combos.forEach((c) => {
      map[String(c.id)] = { reference: c.reference || "" };
    });
    return map;
  } catch {
    return {};
  }
}

// ─── Stock actuel ──────────────────────────────────────────────────────────────

/**
 * Retourne le stock actuel de tous les produits.
 * @returns {Promise<Array>} Liste de CurrentStock
 */
export async function fetchCurrentStock() {
  const client = new PrestashopClient();

  const [stockData, productMap, comboMap] = await Promise.all([
    client.get("stock_availables"),
    fetchProductMap(client),
    fetchComboMap(client),
  ]);

  const stocks = normalizeList(stockData?.stock_availables);

  return stocks.map((s) => {
    const qty = parseInt(s.quantity, 10) || 0;
    const productId = String(s.id_product);
    const attrId = String(s.id_product_attribute || "0");
    const prod = productMap[productId] || {};
    const combo = comboMap[attrId] || {};

    let status = "OK";
    if (qty === 0) status = "Rupture";
    else if (qty <= LOW_STOCK_THRESHOLD) status = "Faible";

    return {
      id: String(s.id),
      productId,
      attributeId: attrId,
      reference: combo.reference || prod.reference || "",
      productName: prod.name || `Produit ${productId}`,
      variant: attrId !== "0" ? `Décl. #${attrId}` : "-",
      quantity: qty,
      status,
    };
  });
}

// ─── Mouvements de vente (sorties) ────────────────────────────────────────────

/**
 * Reconstruit les mouvements de sortie à partir des commandes validées.
 * @param {string|null} startDate - "YYYY-MM-DD"
 * @param {string|null} endDate   - "YYYY-MM-DD"
 * @returns {Promise<Array>} Mouvements de type "Vente"
 */
async function fetchSalesMovements(client, startDate, endDate) {
  const data = await client.get("orders?display=full");
  let orders = normalizeList(data?.orders);

  // Filtre date
  if (startDate || endDate) {
    orders = orders.filter((o) => {
      const d = (o.date_add || "").split(" ")[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }

  // Exclure commandes annulées
  orders = orders.filter((o) => parseInt(o.current_state, 10) !== 6);

  const movements = [];
  orders.forEach((order) => {
    const date = (order.date_add || "").split(" ")[0];
    const orderId = String(order.id);
    const stateId = parseInt(order.current_state, 10);

    const rows = normalizeList(order.associations?.order_rows);

    rows.forEach((row) => {
      const qty = parseInt(row.product_quantity || row.quantity, 10) || 0;
      if (qty <= 0) return;

      const productId = String(row.product_id);
      const attrId = String(row.product_attribute_id || "0");

      movements.push({
        date,
        productId,
        attributeId: attrId,
        reference: row.product_reference || "",
        productName: row.product_name || `Produit ${productId}`,
        variant: attrId !== "0" ? `Décl. #${attrId}` : "-",
        type: "Vente",
        quantity: -qty,
        orderId,
        stateId,
        status: getStateLabel(stateId),
      });
    });
  });

  return movements;
}

// ─── Mouvements de retour (entrées via avoirs) ─────────────────────────────────

/**
 * Reconstruit les mouvements d'entrée à partir des avoirs (order_slip).
 * @param {string|null} startDate
 * @param {string|null} endDate
 * @returns {Promise<Array>} Mouvements de type "Retour"
 */
async function fetchReturnMovements(client, startDate, endDate) {
  try {
    const data = await client.get("order_slip?display=full");
    let slips = normalizeList(data?.order_slips);

    if (startDate || endDate) {
      slips = slips.filter((s) => {
        const d = (s.date_add || "").split(" ")[0];
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }

    const movements = [];
    slips.forEach((slip) => {
      const date = (slip.date_add || "").split(" ")[0];
      const orderId = String(slip.id_order || "");

      const details = normalizeList(slip.associations?.order_slip_details);

      details.forEach((detail) => {
        const qty =
          parseInt(detail.product_quantity || detail.quantity, 10) || 0;
        if (qty <= 0) return;

        const productId = String(
          detail.id_product || detail.product_id || ""
        );
        const attrId = String(
          detail.id_product_attribute || detail.product_attribute_id || "0"
        );

        movements.push({
          date,
          productId,
          attributeId: attrId,
          reference: detail.product_reference || "",
          productName: detail.product_name || `Produit ${productId}`,
          variant: attrId !== "0" ? `Décl. #${attrId}` : "-",
          type: "Retour",
          quantity: +qty,
          orderId: orderId || null,
          stateId: null,
          status: "Retour / Annulation",
        });
      });
    });

    return movements;
  } catch {
    // order_slip peut être indisponible selon la config PrestaShop
    return [];
  }
}

// ─── Calcul Stock Avant / Après ────────────────────────────────────────────────

/**
 * Calcule le stock avant/après pour chaque mouvement en remontant depuis le stock actuel.
 * Les mouvements sont triés du plus récent au plus ancien.
 */
function computeStockBeforeAfter(movements, currentStockMap) {
  // Tri décroissant (plus récent en premier)
  const sorted = [...movements].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  // Copie du stock courant — on va reculer dans le temps
  const running = { ...currentStockMap };

  return sorted.map((m) => {
    const key = `${m.productId}_${m.attributeId}`;
    const stockAfter = running[key] ?? null;
    const stockBefore =
      stockAfter !== null ? stockAfter - m.quantity : null;
    // Mise à jour : on recule d'un mouvement
    if (stockBefore !== null) running[key] = stockBefore;

    return { ...m, stockBefore, stockAfter };
  });
}

// ─── API publique ──────────────────────────────────────────────────────────────

/**
 * Récupère tous les mouvements (ventes + retours) avec stock avant/après.
 * @param {string|null} startDate - "YYYY-MM-DD"
 * @param {string|null} endDate   - "YYYY-MM-DD"
 * @returns {Promise<Array>} Liste de StockMovement triée par date décroissante
 */
export async function fetchAllMovements(startDate = null, endDate = null) {
  const client = new PrestashopClient();

  const [sales, returns, currentStockList] = await Promise.all([
    fetchSalesMovements(client, startDate, endDate),
    fetchReturnMovements(client, startDate, endDate),
    fetchCurrentStock(),
  ]);

  // Construire la map stock courant
  const currentStockMap = {};
  currentStockList.forEach((s) => {
    currentStockMap[`${s.productId}_${s.attributeId}`] = s.quantity;
  });

  const allMovements = [...sales, ...returns];
  const withStocks = computeStockBeforeAfter(allMovements, currentStockMap);

  // Tri final : date décroissante, puis orderId décroissant
  return withStocks.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.orderId || "").localeCompare(a.orderId || "");
  });
}

/**
 * Construit le résumé journalier à partir des mouvements.
 * @param {Array} movements
 * @returns {Array} DailySummary[]
 */
export function buildDailySummary(movements) {
  const map = {};

  movements.forEach((m) => {
    const d = m.date;
    if (!map[d])
      map[d] = { date: d, nbSales: 0, totalOut: 0, totalReturns: 0 };

    if (m.type === "Vente") {
      map[d].nbSales += 1;
      map[d].totalOut += Math.abs(m.quantity);
    } else if (m.type === "Retour") {
      map[d].totalReturns += m.quantity;
    }
  });

  return Object.values(map)
    .map((d) => ({ ...d, totalNet: d.totalReturns - d.totalOut }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
