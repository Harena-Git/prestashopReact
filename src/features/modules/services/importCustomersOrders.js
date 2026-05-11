import {
  findOrCreateCustomer,
  getCustomerSecureKey,
  getProductInfo,
  getCombinationId,
  getMadagascarCountryId,
  postXml,
} from "./prestashopCache";
import {
  buildAddressXml,
  buildCartXml,
  buildOrderXml,
  formatDate,
} from "./xmlBuilder";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false });

function extractIdFromXml(xmlText, singular) {
  try {
    const parsed = xmlParser.parse(xmlText);
    return parseInt(parsed?.prestashop?.[singular]?.id, 10) || null;
  } catch {
    return null;
  }
}

// Mapping état commande (texte CSV → ID PrestaShop)
const ORDER_STATES = {
  "en attente paiement à la livraison": 9,
  "paiement accepté": 2,
  "payment accepted": 2,
  "erreur de paiement": 8,
  "payment error": 8,
};

function getOrderStateId(etat) {
  const key = etat.toLowerCase().trim();
  return ORDER_STATES[key] ?? 1; // Par défaut: en attente
}

// Parse le format achat : [("T_01";3;"ngoza"),("C_03";1;"")]
function parseOrderItems(achatStr) {
  const items = [];
  const regex = /\("([^"]+)";(\d+);"([^"]*)"\)/g;
  let match;

  while ((match = regex.exec(achatStr)) !== null) {
    items.push({
      reference: match[1].trim().toUpperCase(),
      quantity: parseInt(match[2], 10),
      attribute: match[3].trim() || null,
    });
  }

  if (items.length === 0) {
    throw new Error(`Format achat invalide: "${achatStr}"`);
  }
  return items;
}

// Importe clients et commandes depuis le fichier 3
// All or Nothing : la première erreur arrête tout l'import
export async function importCustomersOrders(rows, log) {
  let customersInserted = 0;
  let ordersInserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;

    try {
      const email = row.email?.trim().toLowerCase();
      const dateAdd = formatDate(row.date);

      // 1. Trouver/créer le client
      log(`  Ligne ${lineNum}: Client "${email}"...`);
      const customerId = await findOrCreateCustomer(
        email,
        row.nom,
        row.pwd,
        dateAdd,
      );
      log(`  ✓ Client ID: ${customerId}`);
      customersInserted++;

      // 2. Créer l'adresse
      const parts = row.nom.trim().split(" ");
      const firstname = parts[0];
      const lastname = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];

      const addressXml = buildAddressXml({
        customer_id: customerId,
        firstname,
        lastname,
        address1: row.adresse?.trim(),
        country_id: getMadagascarCountryId(),
      });

      log(`  Ligne ${lineNum}: Création adresse...`);
      const addressResponse = await postXml("addresses", addressXml);
      const addressId = extractIdFromXml(addressResponse, "address");
      if (!addressId) throw new Error("Impossible de créer l'adresse");

      // 3. Créer le panier avec la secure_key du client
      // (PrestaShop exige que panier et commande aient la même secure_key que le client)
      const secureKey = getCustomerSecureKey(email);
      const cartXml = buildCartXml({
        customer_id: customerId,
        address_id: addressId,
        date_add: dateAdd,
        secure_key: secureKey,
      });
      const cartResponse = await postXml("carts", cartXml);
      const cartId = extractIdFromXml(cartResponse, "cart");
      if (!cartId) throw new Error("Impossible de créer le panier");

      // 4. Parser les articles de la commande
      const orderItems = parseOrderItems(row.achat);

      // 5. Résoudre les IDs produit/combinaison pour chaque article
      const resolvedItems = orderItems.map((item) => {
        const productInfo = getProductInfo(item.reference);
        if (!productInfo) {
          throw new Error(
            `Produit "${item.reference}" non trouvé — importer les fichiers 1 et 2 d'abord`,
          );
        }
        return {
          product_id: productInfo.id,
          combination_id: getCombinationId(item.reference, item.attribute),
          name: productInfo.name,
          quantity: item.quantity,
          unit_price: productInfo.price_ht,
        };
      });

      // 6. Créer la commande
      const stateId = getOrderStateId(row.etat);
      const orderXml = buildOrderXml({
        customer_id: customerId,
        address_id: addressId,
        cart_id: cartId,
        state_id: stateId,
        date_add: dateAdd,
        items: resolvedItems,
      });

      log(`  Ligne ${lineNum}: Création commande (état: ${stateId})...`);
      const orderResponse = await postXml("orders", orderXml);
      const orderId = extractIdFromXml(orderResponse, "order");
      if (!orderId) throw new Error("Impossible de créer la commande");

      log(`  ✓ Commande ID: ${orderId} (${resolvedItems.length} article(s))`);
      ordersInserted++;
    } catch (err) {
      log(`  ✗ Ligne ${lineNum}: ${err.message}`);
      // All or Nothing : arrêt immédiat, les données insérées seront rollbackées
      const stopError = new Error(`Ligne ${lineNum}: ${err.message}`);
      stopError.inserted = customersInserted + ordersInserted;
      throw stopError;
    }
  }

  return {
    inserted: customersInserted + ordersInserted,
    customers: customersInserted,
    orders: ordersInserted,
    total: rows.length,
  };
}
