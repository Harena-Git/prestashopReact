import { PrestashopClient, createResource } from "../../../api/prestashop.api";

/**
 * Service stock : écriture via stock_deltas, lecture via stock_availables / stock_movements.
 */

function normalizeList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Somme les quantités de tous les stock_availables d'un produit (toutes déclinaisons).
 */
export async function getProductTotalStock(productId, client = new PrestashopClient()) {
  const data = await client.get(`stock_availables?filter[id_product]=${productId}`);
  const records = normalizeList(data?.stock_availables);
  return records.reduce((sum, r) => sum + parseInt(r.quantity || 0, 10), 0);
}

/**
 * Agrège les mouvements PrestaShop en lignes journalières.
 * @param {Array} movements - stock_movements
 * @param {number} currentTotalStock - stock actuel (somme des déclinaisons)
 * @returns {Array<{date, initialStock, inputs, outputs, finalStock}>}
 */
export function aggregateDailyStockEvolution(movements, currentTotalStock) {
  const validMovements = movements.filter((m) => m?.date_add);

  if (validMovements.length === 0) {
    const today = todayDateString();
    return [
      {
        date: today,
        initialStock: currentTotalStock,
        inputs: 0,
        outputs: 0,
        finalStock: currentTotalStock,
      },
    ];
  }

  const dailyMap = {};

  validMovements.forEach((mvt) => {
    const dateStr = String(mvt.date_add).split(" ")[0];
    if (!dateStr) return;

    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { inputs: 0, outputs: 0 };
    }

    const qty = Math.abs(parseInt(mvt.physical_quantity || mvt.quantity || 0, 10));
    const sign = parseInt(mvt.sign, 10);

    if (sign === 1) {
      dailyMap[dateStr].inputs += qty;
    } else if (sign === -1) {
      dailyMap[dateStr].outputs += qty;
    } else if (qty > 0) {
      // Fallback si sign absent : delta positif = entrée
      const delta = parseInt(mvt.delta ?? mvt.physical_quantity, 10);
      if (delta >= 0) dailyMap[dateStr].inputs += qty;
      else dailyMap[dateStr].outputs += qty;
    }
  });

  const sortedDates = Object.keys(dailyMap).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  const todayStr = todayDateString();
  if (!sortedDates.includes(todayStr)) {
    sortedDates.unshift(todayStr);
    dailyMap[todayStr] = { inputs: 0, outputs: 0 };
  }

  const result = [];
  let simulatedStock = currentTotalStock;

  for (const date of sortedDates) {
    const { inputs, outputs } = dailyMap[date];
    const finalStock = simulatedStock;
    const initialStock = finalStock - inputs + outputs;

    result.push({ date, initialStock, inputs, outputs, finalStock });
    simulatedStock = initialStock;
  }

  return result;
}

/**
 * Enregistre un mouvement de stock via l'endpoint personnalisé stock_deltas.
 */
export async function updateStockWithMovement({
  productId,
  attributeId = 0,
  quantityChange,
}) {
  const client = new PrestashopClient();

  if (quantityChange === 0) {
    const current = await fetchVariantStock(client, productId, attributeId);
    return { previousStock: current, newStock: current, quantityChange: 0 };
  }

  const previousStock = await fetchVariantStock(client, productId, attributeId);

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
    console.error("[STOCK ERROR] Échec stock_deltas:", err.message);
    throw new Error(`Impossible de mettre à jour le stock : ${err.message}`);
  }

  const newStock = await fetchVariantStock(client, productId, attributeId);
  const newTotalStock = await getProductTotalStock(productId, client);

  return {
    previousStock,
    newStock,
    newTotalStock,
    quantityChange,
  };
}

async function fetchVariantStock(client, productId, attributeId) {
  try {
    const data = await client.get(
      `stock_availables?filter[id_product]=${productId}&filter[id_product_attribute]=${attributeId}`,
    );
    const records = normalizeList(data?.stock_availables);
    return records.length > 0 ? parseInt(records[0].quantity, 10) : 0;
  } catch (err) {
    console.warn("[STOCK WARNING] Lecture stock:", err.message);
    return 0;
  }
}

/**
 * Évolution journalière : date, stock initial, entrées, sorties, stock final.
 */
export async function getDailyStockEvolution(productId) {
  const client = new PrestashopClient();

  const currentTotalStock = await getProductTotalStock(productId, client);

  const mvtsData = await client.get(
    `stock_movements?filter[id_product]=${productId}&sort=[date_add_DESC]`,
  );

  const movements = normalizeList(mvtsData?.stock_movements);
  return aggregateDailyStockEvolution(movements, currentTotalStock);
}
