import { postXml, ensureCustomerSecureKey, getDefaultCountryId, getOrderDefaults } from "./prestashopCache";
import { buildAddressXml, buildCartXml, buildOrderXml, formatDate } from "./xmlBuilder";
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

export async function validateOrderForProduct(client, product) {
  if (!client || !client.id) throw new Error("Client non dÃ©fini ou invalide.");
  
  const customerId = parseInt(client.id, 10);
  const email = client.email || client.email_address || "";

  // 1. Obtenir les defaults de l'order (Transport, Devise, Langue, etc.)
  const orderDefaults = await getOrderDefaults();
  const countryId = await getDefaultCountryId();
  
  // 2. OBTENIR SECURE_KEY (Obligatoire pour le lien Cart/Order)
  const secureKey = await ensureCustomerSecureKey(email, customerId);

  // 3. CREER ADRESSE
  const addressXml = buildAddressXml({
    customer_id: customerId,
    firstname: client.firstname || "PrÃ©nom",
    lastname: client.lastname || "Nom",
    address1: "123 Rue de la RÃ©publique",
    country_id: countryId,
  });

  const addressResponse = await postXml("addresses", addressXml);
  const addressId = extractIdFromXml(addressResponse, "address");
  if (!addressId) throw new Error("Impossible de crÃ©er l'adresse pour la commande.");

  // 4. PARSER ET FORMATER L'ARTICLE
  const dateAdd = formatDate(new Date().toLocaleDateString("fr-FR")); // aujourd'hui

  const items = [{
    product_id: parseInt(product.id, 10),
    combination_id: 0, // Par defaut
    name: product.name || "Produit sans nom",
    quantity: 1, // On ajoute 1 par 1 via le bouton
    unit_price_ht: product.price || 0,
    unit_price_ttc: product.price || 0 // MÃªme prix pour simplifier ici
  }];

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
  if (!cartId) throw new Error("Impossible de crÃ©er le panier (ps_cart).");

  // 6. CREER LA COMMANDE (ps_order)
  const orderXml = buildOrderXml({
    customer_id: customerId,
    address_id: addressId,
    cart_id: cartId,
    state_id: 2, // "Paiement effectue" (ou on l'ajustera plus bas)
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
  if (!orderId) throw new Error("Impossible de crÃ©er la commande (ps_order).");

  // On peut ajouter un statut en attente paiement à la livraison "9" si besoin ou le laisser à 2 dans state_id initial + créer l'historique :
  const STATE_EN_ATTENTE_PAIEMENT_A_LA_LIVRAISON = 9; 
  try {
    const historyXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${orderId}</id_order>
    <id_order_state>${STATE_EN_ATTENTE_PAIEMENT_A_LA_LIVRAISON}</id_order_state>
  </order_history>
</prestashop>`;
    await postXml("order_histories", historyXml);
  } catch (historyErr) {
    console.warn("Impossible de sauvegarder l'historique d'Ã©tat.", historyErr);
  }

  return orderId;
}
