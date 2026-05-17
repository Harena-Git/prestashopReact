import {
  PrestashopClient,
  createResource,
  updateResource,
} from "../../../api/prestashop.api";
import { XMLParser } from "fast-xml-parser";

/**
 * Service pour la gestion des stocks via le nouvel endpoint sécurisé 'stock_deltas'.
 * Cet endpoint gère nativement la création des mouvements de stock et la mise à jour
 * des quantités disponibles de manière atomique.
 */

/**
 * Enregistre un mouvement de stock via l'endpoint personnalisé stock_deltas.
 * @param {Object} data
 * @param {number} data.productId - ID du produit
 * @param {number} data.attributeId - ID de la déclinaison (0 par défaut)
 * @param {number} data.quantityChange - Quantité à ajouter (+) ou retirer (-)
 */
export async function updateStockWithMovement({
  productId,
  attributeId = 0,
  quantityChange,
}) {
  const client = new PrestashopClient();

  if (quantityChange === 0) {
    // Si pas de changement, on récupère juste le stock actuel pour le retour
    const current = await fetchCurrentStock(client, productId, attributeId);
    return { previousStock: current, newStock: current, quantityChange: 0 };
  }

  // 1. RÉCUPÉRER LE STOCK AVANT (Pour information et vérification)
  const previousStock = await fetchCurrentStock(client, productId, attributeId);

  // 2. APPELER LE NOUVEL ENDPOINT 'stock_deltas'
  // Cet endpoint est plus fiable car il évite les updates directs sur stock_availables
  console.log(
    `[STOCK] Appel stock_deltas pour Produit ${productId} (Delta: ${quantityChange})`,
  );

  const deltaXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_delta>
    <id_product>${productId}</id_product>
    <id_product_attribute>${attributeId}</id_product_attribute>
    <delta>${quantityChange}</delta>
  </stock_delta>
</prestashop>`;

  try {
    await createResource("stock_deltas", deltaXml);
  } catch (err) {
    console.error(`[STOCK ERROR] Échec de l'appel stock_deltas:`, err.message);
    throw new Error(`Impossible de mettre à jour le stock : ${err.message}`);
  }

  // 3. VÉRIFICATION : RÉCUPÉRER LE NOUVEAU STOCK
  // On attend un court instant ou on recharge directement pour confirmer l'impact
  const newStock = await fetchCurrentStock(client, productId, attributeId);

  console.log(
    `[STOCK] Vérification terminée: ${previousStock} -> ${newStock} (Attendu: ${previousStock + quantityChange})`,
  );

  return { previousStock, newStock, quantityChange };
}

/**
 * Fonction interne pour récupérer la quantité actuelle de manière propre
 */
async function fetchCurrentStock(client, productId, attributeId) {
  try {
    const data = await client.get(
      `stock_availables?filter[id_product]=${productId}&filter[id_product_attribute]=${attributeId}`,
    );

    // Normalisation de la réponse PrestaShop (objet unique ou tableau)
    const stockAvails = data.stock_availables;
    const record = Array.isArray(stockAvails) ? stockAvails[0] : stockAvails;

    return record ? parseInt(record.quantity, 10) : 0;
  } catch (err) {
    console.warn(
      `[STOCK WARNING] Impossible de lire le stock actuel:`,
      err.message,
    );
    return 0;
  }
}
