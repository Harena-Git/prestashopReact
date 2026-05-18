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

/**
 * Récupère l'évolution synthétique du stock journalier pour un produit.
 * (Date, Stock Initial, Entrées, Sorties/Ventes, Stock Final)
 */
export async function getDailyStockEvolution(productId) {
  const client = new PrestashopClient();
  
  try {
    // 1. Récupérer le stock actuel (somme de tous les stock_availables de ce produit)
    let currentTotalStock = 0;
    const availData = await client.get(`stock_availables?filter[id_product]=${productId}&display=full`);
    if (availData && availData.stock_availables) {
      const records = Array.isArray(availData.stock_availables) ? availData.stock_availables : [availData.stock_availables];
      currentTotalStock = records.reduce((sum, r) => sum + parseInt(r.quantity || 0, 10), 0);
    }

    // 2. Récupérer les mouvements de stock (triés du plus récent au plus ancien)
    const mvtsData = await client.get(`stock_movements?filter[id_product]=${productId}&sort=[date_add_DESC]&display=full`);
    const mvtsRaw = mvtsData?.stock_movements || [];
    const movements = Array.isArray(mvtsRaw) ? mvtsRaw : [mvtsRaw];
    
    // Si aucun mouvement, on retourne juste une ligne pour aujourd'hui avec le stock actuel
    if (movements.length === 0) {
      const today = new Date().toISOString().split("T")[0];
      return [{
        date: today,
        initialStock: currentTotalStock,
        inputs: 0,
        outputs: 0,
        finalStock: currentTotalStock,
      }];
    }

    // 3. Agréger les mouvements par jour
    const dailyMap = {};
    movements.forEach(mvt => {
      const dateStr = (mvt.date_add || "").split(" ")[0]; // "YYYY-MM-DD"
      if (!dateStr) return;
      
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { inputs: 0, outputs: 0 };
      }
      
      const qty = parseInt(mvt.physical_quantity || 0, 10);
      if (parseInt(mvt.sign, 10) === 1) {
        dailyMap[dateStr].inputs += qty;
      } else {
        dailyMap[dateStr].outputs += qty;
      }
    });

    // 4. Calculer rétrospectivement le stock (initial et final) pour chaque jour
    // On trie les dates par ordre décroissant (du plus récent au plus ancien)
    const sortedDates = Object.keys(dailyMap).sort((a, b) => new Date(b) - new Date(a));
    const result = [];
    
    let simulatedStock = currentTotalStock;

    // S'il n'y a pas eu de mouvement aujourd'hui, on ajoute quand même la ligne d'aujourd'hui
    const todayStr = new Date().toISOString().split("T")[0];
    if (!sortedDates.includes(todayStr)) {
      sortedDates.unshift(todayStr);
      dailyMap[todayStr] = { inputs: 0, outputs: 0 };
    }

    for (const date of sortedDates) {
      const { inputs, outputs } = dailyMap[date];
      
      const finalStock = simulatedStock;
      // stock_initial = stock_final - entrées + sorties
      const initialStock = finalStock - inputs + outputs;
      
      result.push({
        date,
        initialStock,
        inputs,
        outputs,
        finalStock
      });
      
      // Le stock initial de ce jour devient le stock final de la veille
      simulatedStock = initialStock;
    }

    return result;
  } catch (error) {
    console.error(`[STOCK EVOLUTION] Erreur API pour produit ${productId}:`, error.message);
    throw error;
  }
}
