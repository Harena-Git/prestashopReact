import { XMLParser } from "fast-xml-parser";
import { createResource, PrestashopClient } from "../../../api/prestashop.api";

const xmlParser = new XMLParser({ ignoreAttributes: false });
const prestashopClient = new PrestashopClient();

const firstCombinationCache = new Map();

function toNum(val) {
  if (val == null) return 0;
  const cleanVal = String(val).replace(",", ".");
  const num = parseFloat(cleanVal);
  return Number.isFinite(num) ? num : 0;
}

function extractCartIdFromXml(xmlText) {
  try {
    const parsed = xmlParser.parse(xmlText);
    const id = parseInt(parsed?.prestashop?.cart?.id, 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function normalizeToArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Récupère la 1ère déclinaison (combination) d'un produit.
 * Retourne: { id, priceImpact } ou null.
 */
export async function getFirstCombinationForProduct(productId) {
  const key = String(productId);
  if (firstCombinationCache.has(key)) return firstCombinationCache.get(key);

  try {
    const data = await prestashopClient.get(
      `combinations?filter[id_product]=[${productId}]&limit=1`,
    );

    // Selon la réponse PS: data.combinations.combination ou data.combinations
    const combos = normalizeToArray(data?.combinations?.combination || data?.combinations);
    const first = combos[0];
    const id = parseInt(first?.id, 10);
    if (!Number.isFinite(id)) {
      firstCombinationCache.set(key, null);
      return null;
    }

    const priceImpact = toNum(first?.price);
    const result = { id, priceImpact };
    firstCombinationCache.set(key, result);
    return result;
  } catch {
    firstCombinationCache.set(key, null);
    return null;
  }
}

/**
 * Résout un produit pour le panier: ajoute combination_id + prix effectif si besoin.
 */
export async function resolveProductForCart(product) {
  const basePrice = toNum(product?.price);
  const productId = parseInt(product?.id, 10);
  if (!Number.isFinite(productId)) return product;

  // Si déjà une déclinaison choisie (ou enregistrée), ne pas override.
  const existingCombinationId =
    toNum(product?.combination_id) || toNum(product?.id_product_attribute);
  if (existingCombinationId) return { ...product, combination_id: existingCombinationId };

  // Toujours vérifier s'il existe une déclinaison, car même avec un prix de base > 0,
  // il peut s'agir d'un produit avec déclinaisons qu'il faut absolument renseigner pour valider la commande.
  const firstComb = await getFirstCombinationForProduct(productId);
  if (!firstComb) {
    console.log("[CART][resolveProductForCart] no combination found", {
      productId,
      reference: product?.reference,
      basePrice,
    });
    return product;
  }

  const effectivePrice = basePrice + toNum(firstComb.priceImpact);
  console.log("[CART][resolveProductForCart] resolved combination", {
    productId,
    reference: product?.reference,
    basePrice,
    combinationId: firstComb.id,
    priceImpact: firstComb.priceImpact,
    effectivePrice,
  });
  return {
    ...product,
    combination_id: firstComb.id,
    // Mettre à jour le prix affiché/utilisé au checkout
    price: effectivePrice,
  };
}

export const saveCartToDatabase = async (client, cartItems) => {
  console.log("[CART][saveCartToDatabase] sending carts XML", {
    customerId: client?.id,
    items: (cartItems || []).map((item) => ({
      id: item?.id,
      reference: item?.reference,
      price: item?.price,
      combination_id: item?.combination_id || item?.id_product_attribute || 0,
      qty: item?.cartQuantity || 1,
    })),
  });

  // 1. Construire les lignes du panier (cart_rows) pour le XML
  const cartRowsXml = cartItems.map(item => `
    <cart_row>
      <id_product>${item.id}</id_product>
      <id_product_attribute>${item.combination_id || item.id_product_attribute || 0}</id_product_attribute>
      <id_address_delivery>0</id_address_delivery>
      <quantity>${item.cartQuantity || 1}</quantity>
    </cart_row>
  `).join('');

  // 2. Construire l'objet XML global attendu par l'API PrestaShop
  const cartXml = `
    <prestashop>
      <cart>
        <id_customer>${client.id}</id_customer>
        <id_currency>1</id_currency>
        <id_lang>1</id_lang>
        <associations>
          <cart_rows>
            ${cartRowsXml}
          </cart_rows>
        </associations>
      </cart>
    </prestashop>
  `;

  // 3. Envoyer la requête POST à l'API (/api/carts)
  const xmlResponse = await createResource("carts", cartXml);

  const cartId = extractCartIdFromXml(xmlResponse);
  if (!cartId) {
    throw new Error("Création du panier OK, mais impossible d'extraire l'ID depuis la réponse XML.");
  }

  return cartId;
};