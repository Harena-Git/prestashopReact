import {
  fetchModuleIds,
  fetchModuleRecord,
  updateResource,
  createResource,
  PrestashopClient,
} from "../../../api/prestashop.api";

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
  // 1. On récupère les commandes en excluant les annulées pour les stats
  let orders = await listOrdersService(true);

  // 2. On applique le filtre SI l'utilisateur a saisi des dates
  if (startDate || endDate) {
    orders = orders.filter((order) => {
      // On extrait la date de la commande (format YYYY-MM-DD)
      const orderDate = order.date_add.split(" ")[0];

      // On vérifie si la date est dans l'intervalle
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;

      return true; // La commande passe le filtre
    });
  }

  // 3. Groupement par jour (calcul des totaux)
  const summaryMap = orders.reduce((acc, order) => {
    const date = order.date_add.split(" ")[0];
    const amount = parseFloat(order.total_paid) || 0;

    if (!acc[date]) {
      acc[date] = { date, totalAmount: 0, count: 0 };
    }

    acc[date].totalAmount += amount;
    acc[date].count += 1;

    return acc;
  }, {});

  // Retourne le tableau trié par date décroissante
  return Object.values(summaryMap).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calcule le montant total et le nombre de toutes les commandes validées
 * dans l'ensemble du système (sans filtre de date).
 */
export async function getAbsoluteGlobalTotal() {
  // On exclut les commandes annulées pour le total global
  const orders = await listOrdersService(true);

  return orders.reduce(
    (acc, order) => {
      const amount = parseFloat(order.total_paid) || 0;
      acc.totalAmount += amount;
      acc.count += 1;
      return acc;
    },
    { totalAmount: 0, count: 0 },
  );
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
