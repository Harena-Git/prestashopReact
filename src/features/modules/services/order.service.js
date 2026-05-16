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
  6: "Annulé",
};

export const ALLOWED_ORDER_STATES = [1, 2, 6];
export const PAYMENT_DONE_STATE_ID = 2;
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
export async function listOrdersService() {
  const client = new PrestashopClient();
  const data = await client.get("orders");

  // PrestaShop JSON retourne { orders: [...] }
  return Array.isArray(data.orders) ? data.orders : [];
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
 * @param {string} startDate - Date de début (ex: "2024-05-01")
 * @param {string} endDate - Date de fin (ex: "2024-05-31")
 */
export async function getOrdersSummaryByDay(startDate = null, endDate = null) {
  // 1. On récupère toutes les commandes via le service existant
  let orders = await listOrdersService();

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
  // listOrdersService filtre déjà pour n'avoir que les états valides (Payé, etc.)
  const orders = await listOrdersService();

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
