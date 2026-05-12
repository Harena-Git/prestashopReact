import {
  fetchModuleIds,
  fetchModuleRecord,
  updateResource,
} from "../../../api/prestashop.api";

const ORDER_STATE_LABELS = {
  1: "En attente de paiement",
  2: "Paiement effectué",
  6: "Annulé",
};

export const PAYMENT_DONE_STATE_ID = 2;
export const ORDER_CANCELED_STATE_ID = 6;

function buildOrderStatusXml(orderId, stateId) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop>\n  <order>\n    <id>${orderId}</id>\n    <current_state>${stateId}</current_state>\n  </order>\n</prestashop>`;
}

export function getOrderStateLabel(stateId) {
  if (stateId === undefined || stateId === null) return "Inconnu";
  return ORDER_STATE_LABELS[stateId] || ORDER_STATE_LABELS[String(stateId)] || `Etat ${stateId}`;
}

/**
 * Liste toutes les commandes.
 */
export async function listOrdersService() {
  const orderIds = await fetchModuleIds("orders");
  const orders = await Promise.all(
    orderIds.map((id) => fetchModuleRecord("orders", id))
  );
  return orders.filter(Boolean);
}

/**
 * Met à jour une commande existante.
 */
export async function updateOrderService(xmlData) {
  return updateResource("orders", xmlData);
}

/**
 * Met à jour l'état d'une commande.
 */
export async function updateOrderStatusService(orderId, stateId) {
  const xmlData = buildOrderStatusXml(orderId, stateId);
  return updateOrderService(xmlData);
}
