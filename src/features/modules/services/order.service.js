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
  const orders = Array.isArray(data.orders) ? data.orders : [];

  return orders.filter((order) => {
    if (!order) return false;
    // En JSON, current_state est directement une valeur (string/number)
    const stateId = parseInt(order.current_state, 10);
    return ALLOWED_ORDER_STATES.includes(stateId);
  });
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
