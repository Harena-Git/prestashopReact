import {
  postXml,
  ensureCustomerSecureKey,
  getDefaultCountryId,
  getOrderDefaults,
} from "./prestashopCache";
import {
  buildAddressXml,
  buildCartXml,
  buildOrderXml,
  formatDate,
} from "./xmlBuilder";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false });

// Helper pour garantir des nombres propres (gestion des virgules et valeurs nulles)
function toNum(val) {
  if (val == null) return 0;
  // Remplacer la virgule par un point si c'est une chaîne
  const cleanVal = String(val).replace(",", ".");
  const num = parseFloat(cleanVal);
  return isNaN(num) ? 0 : num;
}

function extractIdFromXml(xmlText, singular) {
  try {
    const parsed = xmlParser.parse(xmlText);
    return parseInt(parsed?.prestashop?.[singular]?.id, 10) || null;
  } catch {
    return null;
  }
}

export async function validateOrderForProduct(client, product) {
  if (!client || !client.id) throw new Error("Client non défini ou invalide.");

  const email = client.email || client.email_address || "";

  // 1. OBTENIR SECURE_KEY ET ID (Sécurise contre les 404 si la base a changé)
  const { id: customerId, secureKey } = await ensureCustomerSecureKey(
    email,
    client.id,
  );

  // 2. Obtenir les defaults de l'order (Transport, Devise, Langue, etc.)
  const orderDefaults = await getOrderDefaults();
  const countryId = await getDefaultCountryId();

  // 3. CREER ADRESSE
  const addressXml = buildAddressXml({
    customer_id: customerId,
    firstname: client.firstname || "Prénom",
    lastname: client.lastname || "Nom",
    address1: "123 Rue de la République",
    country_id: countryId,
  });

  const addressResponse = await postXml("addresses", addressXml);
  const addressId = extractIdFromXml(addressResponse, "address");
  if (!addressId)
    throw new Error("Impossible de créer l'adresse pour la commande.");

  // 4. PARSER ET FORMATER L'ARTICLE
  const dateAdd = formatDate(new Date().toLocaleDateString("fr-FR")); // aujourd'hui

  const price = toNum(product.price);
  const items = [
    {
      product_id: parseInt(product.id, 10),
      combination_id: 0, // Par defaut
      name: product.name || "Produit sans nom",
      quantity: 1, // On ajoute 1 par 1 via le bouton
      unit_price_ht: price,
      unit_price_ttc: price, // Même prix pour simplifier ici
    },
  ];

  // 5. CREER PANIER (ps_cart)
  const cartXml = buildCartXml({
    customer_id: customerId,
    address_id: addressId,
    date_add: dateAdd,
    secure_key: secureKey,
    // Le transport est gratuit - prestashopCarrier configuration (carrier_id= orderDefaults)
    carrier_id: orderDefaults.carrierId,
    currency_id: orderDefaults.currencyId,
    lang_id: orderDefaults.langId,
    shop_id: orderDefaults.shopId,
    shop_group_id: orderDefaults.shopGroupId,
    items: items,
  });

  const cartResponse = await postXml("carts", cartXml);
  const cartId = extractIdFromXml(cartResponse, "cart");
  if (!cartId) throw new Error("Impossible de créer le panier (ps_cart).");

  // 6. CREER LA COMMANDE (ps_order)
  const orderXml = buildOrderXml({
    customer_id: customerId,
    address_id: addressId,
    cart_id: cartId,
    state_id: 2, // "Paiement accepté"
    date_add: dateAdd,
    carrier_id: orderDefaults.carrierId,
    currency_id: orderDefaults.currencyId,
    lang_id: orderDefaults.langId,
    shop_id: orderDefaults.shopId,
    shop_group_id: orderDefaults.shopGroupId,
    module: "ps_cashondelivery",
    payment: "Paiement à la livraison", // Demandé: "paiement à la livraison"
    items: items,
    secure_key: secureKey,
  });

  const orderResponse = await postXml("orders", orderXml);
  const orderId = extractIdFromXml(orderResponse, "order");
  if (!orderId) throw new Error("Impossible de créer la commande (ps_order).");

  // On force l'état à "Paiement accepté" (ID 2) dans l'historique
  const STATE_PAIEMENT_ACCEPTE = 2;
  try {
    const historyXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${orderId}</id_order>
    <id_order_state>${STATE_PAIEMENT_ACCEPTE}</id_order_state>
  </order_history>
</prestashop>`;
    await postXml("order_histories", historyXml);
  } catch (historyErr) {
    console.warn("Impossible de sauvegarder l'historique d'état.", historyErr);
  }

  return orderId;
}

/**
 * Valide l'ensemble du panier pour un client donné.
 * Crée une seule commande avec tous les articles.
 */
export async function validateFullOrder(client, items) {
  if (!client || !client.id) throw new Error("Client non défini ou invalide.");
  if (!items || items.length === 0) throw new Error("Le panier est vide.");

  const email = client.email || client.email_address || "";

  // 1. OBTENIR SECURE_KEY ET ID
  const { id: customerId, secureKey } = await ensureCustomerSecureKey(
    email,
    client.id,
  );

  // 2. Obtenir les defaults
  const orderDefaults = await getOrderDefaults();
  const countryId = await getDefaultCountryId();

  // 3. CREER ADRESSE
  const addressXml = buildAddressXml({
    customer_id: customerId,
    firstname: client.firstname || "Prénom",
    lastname: client.lastname || "Nom",
    address1: "123 Rue de la République", // Adresse par défaut
    country_id: countryId,
  });

  const addressResponse = await postXml("addresses", addressXml);
  const addressId = extractIdFromXml(addressResponse, "address");
  if (!addressId) throw new Error("Impossible de créer l'adresse.");

  // 4. PARSER ET FORMATER LES ARTICLES
  const dateAdd = formatDate(new Date().toLocaleDateString("fr-FR"));

  const orderRows = items.map((item) => ({
    product_id: parseInt(item.id, 10),
    combination_id: item.combination_id || 0,
    name: item.name || "Produit sans nom",
    quantity: parseInt(item.cartQuantity || 1, 10), // Utiliser cartQuantity au lieu du stock disponible
    unit_price_ht: toNum(item.price),
    unit_price_ttc: toNum(item.price),
  }));

  console.log("[CHECKOUT] Articles formatés pour la commande:", orderRows);

  // 5. CREER PANIER (ps_cart)
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
    items: orderRows,
  });

  const cartResponse = await postXml("carts", cartXml);
  const cartId = extractIdFromXml(cartResponse, "cart");
  if (!cartId) throw new Error("Impossible de créer le panier.");

  // 6. CREER LA COMMANDE (ps_order)
  const orderXml = buildOrderXml({
    customer_id: customerId,
    address_id: addressId,
    cart_id: cartId,
    state_id: 2, // "Paiement accepté"
    date_add: dateAdd,
    carrier_id: orderDefaults.carrierId,
    currency_id: orderDefaults.currencyId,
    lang_id: orderDefaults.langId,
    shop_id: orderDefaults.shopId,
    shop_group_id: orderDefaults.shopGroupId,
    module: "ps_cashondelivery",
    payment: "Paiement à la livraison",
    items: orderRows,
    secure_key: secureKey,
  });

  const orderResponse = await postXml("orders", orderXml);
  const orderId = extractIdFromXml(orderResponse, "order");
  if (!orderId) throw new Error("Impossible de créer la commande.");

  // Forcer l'historique
  try {
    const historyXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${orderId}</id_order>
    <id_order_state>2</id_order_state>
  </order_history>
</prestashop>`;
    await postXml("order_histories", historyXml);
  } catch (historyErr) {
    console.warn("Erreur historique commande:", historyErr);
  }

  return orderId;
}
