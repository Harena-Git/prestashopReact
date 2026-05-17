import {
  PrestashopClient,
  createResource,
  updateResource,
} from "../../../api/prestashop.api";
import { XMLParser } from "fast-xml-parser";

/**
 * Service pour la gestion des stocks avec historique des mouvements.
 * Conformément à la nouvelle architecture :
 * 1. Création d'un mouvement de stock (Traçabilité)
 * 2. Mise à jour du stock actuel
 */

/**
 * Enregistre un mouvement et met à jour le stock.
 * @param {Object} data
 * @param {number} data.productId - ID du produit
 * @param {number} data.attributeId - ID de la déclinaison (0 par défaut)
 * @param {number} data.quantityChange - Quantité à ajouter (+) ou retirer (-)
 * @param {string} data.reason - Motif du mouvement
 * @param {number} data.employeeId - ID de l'employé effectuant l'action (défaut 1)
 */
export async function updateStockWithMovement({
  productId,
  attributeId = 0,
  quantityChange,
  reason,
  employeeId = 1,
}) {
  const client = new PrestashopClient();

  // 1. RÉCUPÉRER LE STOCK DISPONIBLE (Pour le calcul du delta et mise à jour finale)
  const stockAvailableData = await client.get(
    `stock_availables?filter[id_product]=${productId}&filter[id_product_attribute]=${attributeId}`,
  );
  const stockAvails = Array.isArray(stockAvailableData.stock_availables)
    ? stockAvailableData.stock_availables
    : [stockAvailableData.stock_availables];

  if (!stockAvails[0] || !stockAvails[0].id) {
    throw new Error(
      `Enregistrement de stock disponible introuvable pour le produit ${productId}`,
    );
  }

  const stockAvailableId = stockAvails[0].id;
  const previousStock = parseInt(stockAvails[0].quantity, 10) || 0;
  const newStock = previousStock + quantityChange;

  // 2. RÉCUPÉRER OU CRÉER L'ID_STOCK PHYSIQUE (Indispensable pour l'historique)
  let physicalStockId = null;
  try {
    const stocksData = await client.get(
      `stocks?filter[id_product]=${productId}&filter[id_product_attribute]=${attributeId}`,
    );
    const physicalStocks = Array.isArray(stocksData.stocks)
      ? stocksData.stocks
      : [stocksData.stocks];

    if (physicalStocks[0] && physicalStocks[0].id) {
      physicalStockId = physicalStocks[0].id;
    } else {
      // AUTO-INITIALISATION : Si pas de record physique, on en crée un
      // Cela permet de "forcer" la traçabilité même si l'ASM n'était pas activé
      console.log(
        `[STOCK] Initialisation physique pour Produit ${productId}...`,
      );

      // On récupère les infos de base pour la création
      const productInfo = await client.get(`products/${productId}`);
      const reference = productInfo?.product?.reference || `PROD-${productId}`;
      const priceTe = productInfo?.product?.wholesale_price || 0;

      const newStockXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock>
    <id_warehouse>1</id_warehouse>
    <id_product>${productId}</id_product>
    <id_product_attribute>${attributeId}</id_product_attribute>
    <reference>${reference}</reference>
    <physical_quantity>${previousStock}</physical_quantity>
    <usable_quantity>${previousStock}</usable_quantity>
    <price_te>${priceTe}</price_te>
  </stock>
</prestashop>`;

      const createResponse = await createResource("stocks", newStockXml);
      const parsed = new XMLParser({ ignoreAttributes: false }).parse(
        createResponse,
      );
      physicalStockId = parsed?.prestashop?.stock?.id;

      console.log(`[STOCK] Record physique créé: ID ${physicalStockId}`);
    }
  } catch (err) {
    console.warn(
      `[STOCK WARNING] Impossible d'assurer un ID stock pour le produit ${productId}. L'historique sera ignoré pour cette ligne.`,
      err.message,
    );
  }

  // 3. CRÉER LE MOUVEMENT (stock_movements)
  if (physicalStockId) {
    try {
      const movementXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_movement>
    <id_stock>${physicalStockId}</id_stock>
    <id_stock_mvt_reason>1</id_stock_mvt_reason> <!-- 1: Correction / Augmentation -->
    <id_employee>${employeeId}</id_employee>
    <quantity>${Math.abs(quantityChange)}</quantity>
    <sign>${quantityChange > 0 ? 1 : -1}</sign>
  </stock_movement>
</prestashop>`;

      await createResource("stock_movements", movementXml);
    } catch (mvtErr) {
      console.warn(
        "Échec de l'enregistrement du mouvement (historique).",
        mvtErr.message,
      );
    }
  }

  // 4. METTRE À JOUR LE STOCK DISPONIBLE (stock_availables)
  const updateXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_available>
    <id>${stockAvailableId}</id>
    <id_product>${productId}</id_product>
    <id_product_attribute>${attributeId}</id_product_attribute>
    <id_shop>1</id_shop>
    <id_shop_group>0</id_shop_group>
    <quantity>${newStock}</quantity>
    <depends_on_stock>0</depends_on_stock>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>`;

  await updateResource("stock_availables", updateXml);

  return { previousStock, newStock, quantityChange };
}
