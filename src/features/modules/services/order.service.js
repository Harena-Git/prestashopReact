import {
  fetchModuleIds,
  fetchModuleRecord,
  updateResource,
  createResource,
  PrestashopClient,
} from "../../../api/prestashop.api";
import { updateStockWithMovement } from "./stock.service";

// ─── Helpers internes ─────────────────────────────────────────────────────────

function normalizeList(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Calcule le montant d'une commande à partir de ses lignes (prix unitaire × quantité).
 * Fallback sur total_paid si aucune ligne n'est présente.
 */
function computeAmountFromRows(order) {
  const rows = normalizeList(order.associations?.order_rows);
  if (rows.length === 0) return parseFloat(order.total_paid) || 0;
  return rows.reduce((sum, row) => {
    const price = parseFloat(row.unit_price_tax_excl || row.product_price || 0);
    const qty = parseInt(row.product_quantity || row.quantity || 0, 10);
    return sum + price * qty;
  }, 0);
}

const ORDER_STATE_LABELS = {
  1: "Dans le panier",
  2: "Paiement effectué",
  5: "Livré",
  6: "Annulé",
};

export const ALLOWED_ORDER_STATES = [1, 2, 5, 6];
export const PAYMENT_DONE_STATE_ID = 2;
export const ORDER_DELIVERED_STATE_ID = 5;
export const ORDER_CANCELED_STATE_ID = 6;
export const IN_CART_STATE_ID = 1;

// ... (buildOrderStatusHistoryXml reste inchangé)

export function getOrderStateLabel(stateId) {
  if (stateId === undefined || stateId === null) return "Inconnu";
  return (
    ORDER_STATE_LABELS[stateId] ||
    ORDER_STATE_LABELS[String(stateId)] ||
    `Etat ${stateId}`
  );
}

/**
 * Liste toutes les commandes (filtrées par états autorisés).
 * Utilise le client JSON pour de meilleures performances et une extraction de données fiable.
 */
/**
 * Liste toutes les commandes.
 * @param {boolean} excludeCanceled - Si vrai, exclut les commandes avec l'état 6 (Annulé).
 */
export async function listOrdersService(excludeCanceled = false) {
  const client = new PrestashopClient();
  const data = await client.get("orders?display=full");

  // PrestaShop JSON retourne { orders: [...] }
  const orders = Array.isArray(data.orders) ? data.orders : [];

  if (excludeCanceled) {
    return orders.filter((order) => {
      if (!order) return false;
      const stateId = parseInt(order.current_state, 10);
      return stateId !== ORDER_CANCELED_STATE_ID;
    });
  }

  return orders;
}

/**
 * Met à jour une commande existante.
 */
export async function updateOrderService(xmlData) {
  return updateResource("orders", xmlData);
}

/**
 * Décrémente le stock de chaque produit d'une commande lorsqu'elle est marquée "Livrée".
 * Seul l'état "Livré" doit impacter le stock (via stock_deltas).
 */
export async function processDeliveryStockUpdate(order) {
  const rows = normalizeList(order.associations?.order_rows);
  const promises = rows
    .map((row) => {
      const productId = parseInt(row.product_id, 10);
      const attributeId = parseInt(row.product_attribute_id || 0, 10);
      const quantity = parseInt(row.product_quantity || row.quantity || 0, 10);
      if (!productId || quantity <= 0) return null;
      return updateStockWithMovement({
        productId,
        attributeId,
        quantityChange: -quantity,
      });
    })
    .filter(Boolean);

  await Promise.all(promises);
}

/**
 * Met à jour l'état d'une commande (en ajoutant un historique).
 */
export async function updateOrderStatusService(orderId, stateId) {
  const xmlData = buildOrderStatusHistoryXml(orderId, stateId);
  return createResource("order_histories", xmlData);
}

/**
 * Calcule le résumé des commandes avec filtrage par date optionnel.
 * Exclut les commandes annulées (requis pour le dashboard).
 * @param {string} startDate - Date de début (ex: "2024-05-01")
 * @param {string} endDate - Date de fin (ex: "2024-05-31")
 */
export async function getOrdersSummaryByDay(startDate = null, endDate = null) {
  // 1. Toutes les commandes (sans exclusion a priori)
  let orders = await listOrdersService(false);

  // 2. Filtre sur les états "Dans le panier" (1) et "Paiement effectué" (2) uniquement
  orders = orders.filter((o) => {
    const s = parseInt(o.current_state, 10);
    return s === IN_CART_STATE_ID || s === PAYMENT_DONE_STATE_ID;
  });

  // 3. Filtre par date si saisi
  if (startDate || endDate) {
    orders = orders.filter((order) => {
      const orderDate = (order.date_add || "").split(" ")[0];
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;
      return true;
    });
  }

  // 4. Groupement par jour — montant = prix × quantité depuis les lignes de commande
  const summaryMap = orders.reduce((acc, order) => {
    const date = (order.date_add || "").split(" ")[0];
    const amount = computeAmountFromRows(order);
    const stateId = parseInt(order.current_state, 10);

    if (!acc[date]) {
      acc[date] = { date, totalAmount: 0, count: 0, totalOrdersOnly: 0, countOrdersOnly: 0 };
    }

    acc[date].totalAmount += amount;
    acc[date].count += 1;

    // Sous-total commandes seules (sans les paniers = sans état 1)
    if (stateId === PAYMENT_DONE_STATE_ID) {
      acc[date].totalOrdersOnly += amount;
      acc[date].countOrdersOnly += 1;
    }

    return acc;
  }, {});

  return Object.values(summaryMap).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calcule le montant total et le nombre de toutes les commandes validées
 * dans l'ensemble du système (sans filtre de date).
 */
export async function getAbsoluteGlobalTotal() {
  // Filtre : états "Dans le panier" (1) + "Paiement effectué" (2) uniquement
  let orders = await listOrdersService(false);
  orders = orders.filter((o) => {
    const s = parseInt(o.current_state, 10);
    return s === IN_CART_STATE_ID || s === PAYMENT_DONE_STATE_ID;
  });

  return orders.reduce(
    (acc, order) => {
      const amount = computeAmountFromRows(order);
      const stateId = parseInt(order.current_state, 10);
      acc.totalAmount += amount;
      acc.count += 1;
      if (stateId === PAYMENT_DONE_STATE_ID) {
        acc.totalOrdersOnly += amount;
        acc.countOrdersOnly += 1;
      }
      return acc;
    },
    { totalAmount: 0, count: 0, totalOrdersOnly: 0, countOrdersOnly: 0 },
  );
}

/**
 * Récupère un résumé des paniers actifs (ps_carts) avec leur montant estimé.
 * Utilisé par le dashboard pour montrer les paniers pas encore passés en commande.
 */
export async function fetchCartsSummary() {
  const client = new PrestashopClient();
  try {
    const [cartsData, productsData] = await Promise.all([
      client.get("carts"),
      client.get("products"),
    ]);

    // Map prix par produit
    const priceMap = {};
    normalizeList(productsData?.products).forEach((p) => {
      priceMap[String(p.id)] = parseFloat(p.price) || 0;
    });

    const carts = normalizeList(cartsData?.carts);

    let totalAmount = 0;
    carts.forEach((cart) => {
      const rows = normalizeList(cart.associations?.cart_rows);
      rows.forEach((row) => {
        const price = priceMap[String(row.id_product)] || 0;
        const qty = parseInt(row.quantity || 1, 10);
        totalAmount += price * qty;
      });
    });

    return { count: carts.length, totalAmount };
  } catch {
    return { count: 0, totalAmount: 0 };
  }
}

/**
 * Construit le XML nécessaire pour changer le statut d'une commande dans PrestaShop.
 * C'était cette fonction qui manquait pour faire fonctionner le bouton.
 */
export function buildOrderStatusHistoryXml(orderId, stateId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${orderId}</id_order>
    <id_order_state>${stateId}</id_order_state>
  </order_history>
</prestashop>`;
}

/**
 * Calcule le bénéfice et le montant total des ventes et achats par catégorie (Hors Taxe)
 * @returns {Promise<Array>} Tableau de statistiques par catégorie.
 */
export async function getCategoryStatistics() {
  const client = new PrestashopClient();
  
  // 1. Récupération des données (Commandes valides, Produits, Catégories) en parallèle
  const [orders, productsData, categoriesData] = await Promise.all([
    listOrdersService(true), // Exclut les commandes annulées (état 6)
    client.get("products"),  // Pour obtenir les "wholesale_price" (Achat HT)
    client.get("categories") // Pour obtenir les noms de catégories
  ]);

  // 2. Mapping des Produits pour un accès rapide
  const products = Array.isArray(productsData?.products) ? productsData.products : [];
  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = {
      categoryId: p.id_category_default || "0",
      wholesalePrice: parseFloat(p.wholesale_price) || 0
    };
  });

  // 3. Mapping des Catégories 
  const categories = Array.isArray(categoriesData?.categories) ? categoriesData.categories : [];
  const categoryMap = {};
  categories.forEach(c => {
    let name = "Catégorie inconnue";
    if (c.name) {
      if (Array.isArray(c.name)) name = c.name[0]?.value || name; // Multilingue
      else if (typeof c.name === 'string') name = c.name;
      else if (c.name.language) name = c.name.language.value || c.name.language || name;
    }
    categoryMap[c.id] = name;
  });

  // 4. Calcul des montants par catégorie
  const stats = {};

  orders.forEach(order => {
    // Les détails des lignes (order_details) d'une commande via API JSON
    let rows = [];
    if (order.associations?.order_rows) {
      const apiRows = order.associations.order_rows;
      rows = Array.isArray(apiRows) ? apiRows : [apiRows];
    }

    rows.forEach(row => {
      const productId = row.product_id;
      const quantity = parseInt(row.product_quantity || row.quantity, 10) || 0;
      // Prix de vente Unitaire HT défini dans la commande
      const unitPriceHt = parseFloat(row.unit_price_tax_excl || row.product_price) || 0;

      const pInfo = productMap[productId] || {};
      const catId = pInfo.categoryId || "0";
      const catName = categoryMap[catId] || `Catégorie ${catId}`;
      const wholesalePrice = pInfo.wholesalePrice || 0;

      if (!stats[catId]) {
        stats[catId] = {
          categoryId: catId,
          categoryName: catName,
          totalSalesHT: 0,
          totalPurchaseHT: 0,
          profit: 0
        };
      }

      stats[catId].totalSalesHT += unitPriceHt * quantity;
      stats[catId].totalPurchaseHT += wholesalePrice * quantity;
    });
  });

  // 5. Calcul des bénéfices
  return Object.values(stats).map(stat => {
    stat.profit = stat.totalSalesHT - stat.totalPurchaseHT;
    return stat;
  }).sort((a, b) => b.totalSalesHT - a.totalSalesHT);
}
