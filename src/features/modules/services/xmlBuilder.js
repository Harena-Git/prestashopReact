// parseDecimal est réservé pour usage futur si nécessaire
// Actuellement, les décimaux sont gérés directement avec toFixed()

// Convertit "DD/MM/YYYY" en "YYYY-MM-DD 00:00:00"
export function formatDate(ddmmyyyy) {
  // Regex pour formater strictement: deux chiffres, un slash, deux chiffres, un slash, 4 chiffres
  const regexDate = /^\d{2}\/\d{2}\/\d{4}$/;
  
  if (!regexDate.test(String(ddmmyyyy))) {
    throw new Error(`Le format de la date "${ddmmyyyy}" est invalide. Seul le format "DD/MM/YYYY" est accepté.`);
  }

  const [d, m, y] = String(ddmmyyyy).split("/");
  
  // Validation supplémentaire (optionnel, mais recommandé) pour s'assurer des vrais jours/mois :
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error(`La date "${ddmmyyyy}" est invalide, jour ou mois incorrect.`);
  }

  return `${y}-${m}-${d} 00:00:00`;
}

// Convertit un texte en slug URL (pour link_rewrite)
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Retourne l'horodatage actuel au format PrestaShop
function now() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

// ===========================================================================
// PRODUIT (fichier 1)
// IMPORTANT: PrestaShop stocke le prix SANS taxe (HT)
// Calcul: prix_ht = prix_ttc / (1 + taux/100)
// ===========================================================================
export function buildProductXml({
  reference,
  name,
  price_ht,
  wholesale_ht,
  tax_group_id,
  category_id,
  date_add,
}) {
  const slug = slugify(name);
  const price = price_ht.toFixed(6);
  const wholesale = wholesale_ht.toFixed(6);

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><product>
  <id_manufacturer>0</id_manufacturer>
  <id_supplier>0</id_supplier>
  <id_category_default>${category_id}</id_category_default>
  <id_shop_default>1</id_shop_default>
  <new>0</new>
  <cache_is_pack>0</cache_is_pack>
  <cache_has_attachments>0</cache_has_attachments>
  <is_virtual>0</is_virtual>
  <state>1</state>
  <product_type>standard</product_type>
  <active>1</active>
  <visibility>both</visibility>
  <available_for_order>1</available_for_order>
  <show_condition>0</show_condition>
  <indexed>0</indexed>
  <advanced_stock_management>0</advanced_stock_management>
  <reference>${reference}</reference>
  <price>${price}</price>
  <wholesale_price>${wholesale}</wholesale_price>
  <id_tax_rules_group>${tax_group_id}</id_tax_rules_group>
  <date_add>${date_add}</date_add>
  <date_upd>${now()}</date_upd>
  <name><language id="1">${name}</language></name>
  <description><language id="1"><![CDATA[]]></language></description>
  <description_short><language id="1"><![CDATA[]]></language></description_short>
  <link_rewrite><language id="1">${slug}</language></link_rewrite>
  <meta_title><language id="1"></language></meta_title>
  <meta_description><language id="1"></language></meta_description>
  <meta_keywords><language id="1"></language></meta_keywords>
  <tags><language id="1"></language></tags>
  <associations>
    <categories><category><id>${category_id}</id></category></categories>
  </associations>
</product></prestashop>`;
}

// ===========================================================================
// COMBINAISON / DÉCLINAISON (fichier 2)
// price = delta par rapport au prix de base du produit
// ===========================================================================
export function buildCombinationXml({
  product_id,
  option_value_id,
  price_delta,
  reference,
}) {
  const price = (price_delta || 0).toFixed(6);
  const assoc = option_value_id
    ? `<associations>
    <product_option_values>
      <product_option_value><id>${option_value_id}</id></product_option_value>
    </product_option_values>
  </associations>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><combination>
  <id_product>${product_id}</id_product>
  <location></location>
  <ean13></ean13>
  <isbn></isbn>
  <upc></upc>
  <mpn></mpn>
  <reference>${reference || ""}</reference>
  <supplier_reference></supplier_reference>
  <wholesale_price>0</wholesale_price>
  <price>${price}</price>
  <ecotax>0</ecotax>
  <weight>0</weight>
  <unit_price_impact>0</unit_price_impact>
  <minimal_quantity>1</minimal_quantity>
  <low_stock_threshold>0</low_stock_threshold>
  <low_stock_alert>0</low_stock_alert>
  <default_on>0</default_on>
  <available_date>0000-00-00</available_date>
  ${assoc}
</combination></prestashop>`;
}

// ===========================================================================
// STOCK (mise à jour via PUT stock_availables)
// ===========================================================================
export function buildStockXml({ id, product_id, combination_id, quantity }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><stock_available>
  <id>${id}</id>
  <id_product>${product_id}</id_product>
  <id_product_attribute>${combination_id}</id_product_attribute>
  <id_shop>1</id_shop>
  <id_shop_group>0</id_shop_group>
  <quantity>${quantity}</quantity>
  <depends_on_stock>0</depends_on_stock>
  <out_of_stock>2</out_of_stock>
</stock_available></prestashop>`;
}

// ===========================================================================
// ADRESSE CLIENT (fichier 3)
// ===========================================================================
export function buildAddressXml({
  customer_id,
  firstname,
  lastname,
  address1,
  country_id,
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><address>
  <id_customer>${customer_id}</id_customer>
  <id_manufacturer>0</id_manufacturer>
  <id_supplier>0</id_supplier>
  <id_warehouse>0</id_warehouse>
  <id_country>${country_id}</id_country>
  <id_state>0</id_state>
  <alias>Domicile</alias>
  <lastname>${lastname}</lastname>
  <firstname>${firstname}</firstname>
  <address1>${address1}</address1>
  <address2></address2>
  <postcode>101</postcode>
  <city>${address1}</city>
  <phone></phone>
  <active>1</active>
  <deleted>0</deleted>
</address></prestashop>`;
}

// ===========================================================================
// PANIER (nécessaire pour créer une commande)
// ===========================================================================
export function buildCartXml({
  customer_id,
  address_id,
  date_add,
  secure_key,
  carrier_id = 0,
  currency_id = 1,
  lang_id = 1,
  shop_id = 1,
  shop_group_id = 1,
  items = [],
}) {
  // Utiliser la secure_key du client : PrestaShop exige que le panier et la commande
  // aient la même clé que le client, sinon l'ordre est refusé ("Secure key does not match")
  const secureKey =
    secure_key ||
    Array.from(
      { length: 32 },
      () => "0123456789abcdef"[Math.floor(Math.random() * 16)],
    ).join("");

  const rows = items
    .map(
      (item) => `
      <cart_row>
        <id_product>${item.product_id}</id_product>
        <id_product_attribute>${item.combination_id || 0}</id_product_attribute>
        <id_address_delivery>${address_id}</id_address_delivery>
        <quantity>${item.quantity}</quantity>
      </cart_row>`,
    )
    .join("\n");

  const associations =
    rows.length > 0
      ? `
  <associations>
    <cart_rows>${rows}
    </cart_rows>
  </associations>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><cart>
  <id_shop_group>${shop_group_id}</id_shop_group>
  <id_shop>${shop_id}</id_shop>
  <id_carrier>${carrier_id}</id_carrier>
  <id_lang>${lang_id}</id_lang>
  <id_address_delivery>${address_id}</id_address_delivery>
  <id_address_invoice>${address_id}</id_address_invoice>
  <id_currency>${currency_id}</id_currency>
  <id_customer>${customer_id}</id_customer>
  <id_guest>0</id_guest>
  <secure_key>${secureKey}</secure_key>
  <recyclable>0</recyclable>
  <gift>0</gift>
  <allow_seperated_package>0</allow_seperated_package>
  <date_add>${date_add}</date_add>
  <date_upd>${now()}</date_upd>
  ${associations}
</cart></prestashop>`;
}

// ===========================================================================
// COMMANDE (fichier 3)
// items = [{ product_id, combination_id, name, quantity, unit_price }]
// ===========================================================================
export function buildOrderXml({
  customer_id,
  address_id,
  cart_id,
  state_id,
  date_add,
  carrier_id = 0,
  currency_id = 1,
  lang_id = 1,
  shop_id = 1,
  shop_group_id = 1,
  module = "ps_checkpayment",
  payment = "Import CSV",
  items,
  secure_key,
}) {
  const totalExcl = items.reduce(
    (sum, item) => sum + item.unit_price_ht * item.quantity,
    0,
  );
  const totalIncl = items.reduce(
    (sum, item) => sum + item.unit_price_ttc * item.quantity,
    0,
  );
  const secureKey = secure_key || "";

  const rows = items
    .map(
      (item) => `
      <order_row>
        <product_id>${item.product_id}</product_id>
        <product_attribute_id>${item.combination_id || 0}</product_attribute_id>
        <id_customization>0</id_customization>
        <product_name><![CDATA[${item.name}]]></product_name>
        <product_quantity>${item.quantity}</product_quantity>
        <product_price>${item.unit_price_ht.toFixed(6)}</product_price>
        <unit_price_tax_incl>${item.unit_price_ttc.toFixed(6)}</unit_price_tax_incl>
        <unit_price_tax_excl>${item.unit_price_ht.toFixed(6)}</unit_price_tax_excl>
      </order_row>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><order>
  <id_address_delivery>${address_id}</id_address_delivery>
  <id_address_invoice>${address_id}</id_address_invoice>
  <id_cart>${cart_id}</id_cart>
  <id_shop_group>${shop_group_id}</id_shop_group>
  <id_shop>${shop_id}</id_shop>
  <id_currency>${currency_id}</id_currency>
  <id_lang>${lang_id}</id_lang>
  <id_customer>${customer_id}</id_customer>
  <id_carrier>${carrier_id}</id_carrier>
  <current_state>${state_id}</current_state>
  <secure_key>${secureKey}</secure_key>
  <conversion_rate>1.000000</conversion_rate>
  <module>${module}</module>
  <invoice_number>0</invoice_number>
  <invoice_date>0000-00-00 00:00:00</invoice_date>
  <delivery_number>0</delivery_number>
  <delivery_date>0000-00-00 00:00:00</delivery_date>
  <valid>1</valid>
  <payment>${payment}</payment>
  <recyclable>0</recyclable>
  <gift>0</gift>
  <total_discounts>0.000000</total_discounts>
  <total_discounts_tax_incl>0.000000</total_discounts_tax_incl>
  <total_discounts_tax_excl>0.000000</total_discounts_tax_excl>
  <total_paid>${totalIncl.toFixed(6)}</total_paid>
  <total_paid_tax_incl>${totalIncl.toFixed(6)}</total_paid_tax_incl>
  <total_paid_tax_excl>${totalExcl.toFixed(6)}</total_paid_tax_excl>
  <total_paid_real>${totalIncl.toFixed(6)}</total_paid_real>
  <total_products>${totalExcl.toFixed(6)}</total_products>
  <total_products_wt>${totalIncl.toFixed(6)}</total_products_wt>
  <total_shipping>0.000000</total_shipping>
  <total_shipping_tax_incl>0.000000</total_shipping_tax_incl>
  <total_shipping_tax_excl>0.000000</total_shipping_tax_excl>
  <total_wrapping>0.000000</total_wrapping>
  <total_wrapping_tax_incl>0.000000</total_wrapping_tax_incl>
  <total_wrapping_tax_excl>0.000000</total_wrapping_tax_excl>
  <round_mode>2</round_mode>
  <round_type>1</round_type>
  <date_add>${date_add}</date_add>
  <date_upd>${now()}</date_upd>
  <associations>
    <order_rows>${rows}
    </order_rows>
  </associations>
</order></prestashop>`;
}
