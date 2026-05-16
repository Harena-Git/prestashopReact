import {
  findOrCreateCustomer,
  ensureCustomerSecureKey,
  getProductInfo,
  getCombinationId,
  getCombinationInfo,
  getOrderDefaults,
  getDefaultCountryId,
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
  "paiement accepté": 2,
  "paiement effectué": 2,
  annulé: 6,
  "dans le panier": 1,
};

function getOrderStateId(etat) {
  const val = (etat || "").trim().toLowerCase();

  // Validation des états autorisés
  if (val !== "" && !ORDER_STATES.hasOwnProperty(val)) {
    throw new Error(
      `État "${etat}" non autorisé. Valeurs possibles: paiement accepté, annulé, dans le panier (ou vide)`,
    );
  }

  if (val === "" || val === "dans le panier") return 1;
  return ORDER_STATES[val];
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
      const rawEtat = (row.etat || "").trim().toLowerCase();

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

      const countryId = await getDefaultCountryId();
      const addressXml = buildAddressXml({
        customer_id: customerId,
        firstname,
        lastname,
        address1: row.adresse?.trim(),
        country_id: countryId,
      });

      log(`  Ligne ${lineNum}: Création adresse...`);
      const addressResponse = await postXml("addresses", addressXml);
      const addressId = extractIdFromXml(addressResponse, "address");
      if (!addressId) throw new Error("Impossible de créer l'adresse");

      // 3. Parser les articles de la commande
      const orderItems = parseOrderItems(row.achat);

      // 4. Résoudre les IDs produit/combinaison pour chaque article
      const resolvedItems = orderItems.map((item) => {
        const productInfo = getProductInfo(item.reference);
        if (!productInfo) {
          throw new Error(
            `Produit "${item.reference}" non trouvé — importer les fichiers 1 et 2 d'abord`,
          );
        }
        const combInfo = getCombinationInfo(item.reference, item.attribute);
        const unitPriceHt = combInfo?.price_ht ?? productInfo.price_ht;
        const unitPriceTtc =
          combInfo?.price_ttc ?? unitPriceHt * (1 + productInfo.tax_rate / 100);
        return {
          product_id: productInfo.id,
          combination_id: getCombinationId(item.reference, item.attribute),
          name: productInfo.name,
          quantity: item.quantity,
          unit_price_ht: unitPriceHt,
          unit_price_ttc: unitPriceTtc,
        };
      });

      // 5. Créer le panier avec la secure_key du client
      // (PrestaShop exige que panier et commande aient la même secure_key que le client)
      const { secureKey } = await ensureCustomerSecureKey(email, customerId);
      const orderDefaults = await getOrderDefaults();
      const cartXml = buildCartXml({
        customer_id: customerId,
        address_id: addressId,
        date_add: dateAdd,
        secure_key: secureKey,
        carrier_id: orderDefaults.carrierId,
        currency_id: orderDefaults.currencyId,
        lang_id: orderDefaults.langId,
        shop_id: orderDefaults.shopId,
        shop_group_id: orderDefaults.shopGroupId,
        items: resolvedItems,
      });
      const cartResponse = await postXml("carts", cartXml);
      const cartId = extractIdFromXml(cartResponse, "cart");
      if (!cartId) throw new Error("Impossible de créer le panier");

      // 6. Créer la commande
      const stateId = getOrderStateId(row.etat);
      const orderXml = buildOrderXml({
        customer_id: customerId,
        address_id: addressId,
        cart_id: cartId,
        state_id: stateId,
        date_add: dateAdd,
        carrier_id: orderDefaults.carrierId,
        currency_id: orderDefaults.currencyId,
        lang_id: orderDefaults.langId,
        shop_id: orderDefaults.shopId,
        shop_group_id: orderDefaults.shopGroupId,
        module: orderDefaults.module,
        payment: orderDefaults.payment,
        items: resolvedItems,
        secure_key: secureKey,
      });

      log(`  Ligne ${lineNum}: Création commande (état: ${stateId})...`);
      const orderResponse = await postXml("orders", orderXml);
      const orderId = extractIdFromXml(orderResponse, "order");
      if (!orderId) throw new Error("Impossible de créer la commande");

      // Forcer l'application de l'état en ajoutant un historique à la commande
      try {
        const historyXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${orderId}</id_order>
    <id_order_state>${stateId}</id_order_state>
  </order_history>
</prestashop>`;
        await postXml("order_histories", historyXml);
      } catch (historyErr) {
        log(
          `  ! Attention: Impossible de sauvegarder l'historique d'état pour la commande ${orderId}`,
        );
      }

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
