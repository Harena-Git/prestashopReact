import { XMLParser } from "fast-xml-parser";
import { PrestashopClient } from "../../../api/prestashop.api";

const API_KEY = "25Wx5346ZgrYsaaNnPYiIh2s565qH2ui";
const BASE_URL = "/api/";
const COUNTRY_ID_MG = 119; // Adapter selon l'installation PrestaShop

const client = new PrestashopClient();
const xmlParser = new XMLParser({ ignoreAttributes: false });

// Cache mémoire - évite les requêtes doublons (remplace les tables temporaires)
let cache = {
  categories: {}, // "Akanjo" → id
  taxGroups: {}, // "11.65" → id
  products: {}, // "T_01" → { id, price_ht, tax_rate, name }
  attrGroups: {}, // "taille" → id
  attrValues: {}, // "10:ngoza" → id (clé = groupId:valueName)
  combinations: {}, // "T_01:ngoza" → id
  customers: {}, // "email@..." → id
  customerKeys: {}, // "email@..." → secure_key (obligatoire pour les commandes)
};

// Réinitialiser le cache avant un nouvel import
export function resetCache() {
  cache = {
    categories: {},
    taxGroups: {},
    products: {},
    attrGroups: {},
    attrValues: {},
    combinations: {},
    customers: {},
    customerKeys: {}, // secure_key du client — requis pour la création de commande
  };
}

// Extrait l'ID numérique depuis une réponse XML PrestaShop
function extractIdFromXml(xmlText, singular) {
  try {
    const parsed = xmlParser.parse(xmlText);
    return parseInt(parsed?.prestashop?.[singular]?.id, 10) || null;
  } catch {
    return null;
  }
}

// POST XML vers PrestaShop - retourne le texte XML de réponse
export async function postXml(resource, xmlBody) {
  const response = await fetch(`${BASE_URL}${resource}?ws_key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xmlBody,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `POST ${resource}: ${response.status} - ${text.substring(0, 400)}`,
    );
  }
  return text;
}

// PUT XML vers PrestaShop pour mettre à jour une ressource existante
export async function putXml(resourcePath, xmlBody) {
  // resourcePath = "stock_availables/123" par exemple
  const response = await fetch(`${BASE_URL}${resourcePath}?ws_key=${API_KEY}`, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: xmlBody,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `PUT ${resourcePath}: ${response.status} - ${text.substring(0, 400)}`,
    );
  }
  return text;
}

// Convertit une chaîne en slug URL (pour link_rewrite)
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Extrait le nom depuis un champ multilingue PrestaShop
// PrestaShop peut retourner : string | [{id, value}] | {value}
function extractName(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (Array.isArray(field)) return String(field[0]?.value ?? field[0] ?? "");
  if (field.value !== undefined) return String(field.value);
  return "";
}

// Normalise un tableau de résultats (gère objet seul ou tableau)
function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.id) return [raw];
  return [];
}

// ===========================================================================
// CATÉGORIES
// ===========================================================================

// Trouve une catégorie par nom ou la crée si absente
export async function findOrCreateCategory(name) {
  if (cache.categories[name]) return cache.categories[name];

  // Récupère toutes les catégories et cherche par nom
  const data = await client.get("categories?display=full");
  const cats = toArray(data.categories);

  for (const cat of cats) {
    if (extractName(cat.name).toLowerCase() === name.toLowerCase()) {
      cache.categories[name] = parseInt(cat.id, 10);
      return cache.categories[name];
    }
  }

  // Créer la catégorie
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><category>
  <id_parent>2</id_parent>
  <active>1</active>
  <id_shop_default>1</id_shop_default>
  <name><language id="1">${name}</language></name>
  <link_rewrite><language id="1">${slugify(name)}</language></link_rewrite>
  <description><language id="1"><![CDATA[]]></language></description>
  <meta_title><language id="1"></language></meta_title>
  <meta_description><language id="1"></language></meta_description>
  <meta_keywords><language id="1"></language></meta_keywords>
</category></prestashop>`;

  const responseText = await postXml("categories", xml);
  const id = extractIdFromXml(responseText, "category");
  if (!id) throw new Error(`Impossible de créer la catégorie: ${name}`);

  cache.categories[name] = id;
  return id;
}

// ===========================================================================
// GROUPES DE TAXE
// ===========================================================================

// Trouve l'ID du groupe de taxe pour un taux donné (ex: "11,65%")
export async function findTaxGroupId(rateStr) {
  const rate = parseFloat(rateStr.replace(",", ".").replace("%", ""));
  const cacheKey = rate.toString();

  if (cache.taxGroups[cacheKey]) return cache.taxGroups[cacheKey];

  try {
    // Étape 1: Chercher la taxe par taux (format PS: 3 décimales)
    const rateFormatted = rate.toFixed(3);
    const taxData = await client.get(
      `taxes?filter[rate]=[${rateFormatted}]&display=full`,
    );
    const taxes = toArray(taxData.taxes);

    for (const tax of taxes) {
      if (!tax.id) continue;
      // Étape 2: Trouver la règle de taxe associée
      const ruleData = await client.get(
        `tax_rules?filter[id_tax]=[${tax.id}]&display=full`,
      );
      const rules = toArray(ruleData.tax_rules);

      if (rules.length > 0 && rules[0].id_tax_rules_group) {
        const groupId = parseInt(rules[0].id_tax_rules_group, 10);
        cache.taxGroups[cacheKey] = groupId;
        return groupId;
      }
    }
  } catch {
    // Fallback si erreur API
  }

  // Fallback: premier groupe de taxe disponible
  const groupData = await client.get("tax_rule_groups?display=full");
  const groups = toArray(groupData.tax_rule_groups);
  if (groups.length > 0) {
    const id = parseInt(groups[0].id, 10);
    cache.taxGroups[cacheKey] = id;
    return id;
  }

  return 1; // Valeur par défaut si aucun groupe trouvé
}

// ===========================================================================
// PRODUITS
// ===========================================================================

// Sauvegarde les infos d'un produit dans le cache après création
export function setProductInfo(reference, info) {
  // info = { id, price_ht, tax_rate, name }
  cache.products[reference] = info;
}

// Récupère les infos d'un produit depuis le cache
export function getProductInfo(reference) {
  return cache.products[reference] || null;
}

// Cherche un produit existant par référence (pour fichier 2 et 3)
export async function findProductByReference(reference) {
  if (cache.products[reference]) return cache.products[reference].id;

  const data = await client.get(
    `products?filter[reference]=[${reference}]&display=full`,
  );
  const products = toArray(data.products);

  if (products.length > 0 && products[0].id) {
    const id = parseInt(products[0].id, 10);
    cache.products[reference] = {
      id,
      price_ht: null,
      tax_rate: null,
      name: "",
    };
    return id;
  }

  return null;
}

// ===========================================================================
// ATTRIBUTS (DÉCLINAISONS)
// ===========================================================================

// Trouve ou crée un groupe d'attribut (ex: "taille", "couleur")
export async function findOrCreateAttrGroup(name) {
  const key = name.toLowerCase();
  if (cache.attrGroups[key]) return cache.attrGroups[key];

  const data = await client.get("product_options?display=full");
  const options = toArray(data.product_options);

  for (const opt of options) {
    if (extractName(opt.name).toLowerCase() === key) {
      cache.attrGroups[key] = parseInt(opt.id, 10);
      return cache.attrGroups[key];
    }
  }

  // Créer le groupe d'attribut
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><product_option>
  <is_color_group>0</is_color_group>
  <group_type>select</group_type>
  <position>0</position>
  <name><language id="1">${name}</language></name>
  <public_name><language id="1">${name}</language></public_name>
</product_option></prestashop>`;

  const responseText = await postXml("product_options", xml);
  const id = extractIdFromXml(responseText, "product_option");
  if (!id) throw new Error(`Impossible de créer le groupe attribut: ${name}`);

  cache.attrGroups[key] = id;
  return id;
}

// Trouve ou crée une valeur d'attribut (ex: "ngoza", "kely")
export async function findOrCreateAttrValue(valueName, groupId) {
  const key = `${groupId}:${valueName.toLowerCase()}`;
  if (cache.attrValues[key]) return cache.attrValues[key];

  const data = await client.get(
    `product_option_values?filter[id_attribute_group]=[${groupId}]&display=full`,
  );
  const values = toArray(data.product_option_values);

  for (const val of values) {
    if (extractName(val.name).toLowerCase() === valueName.toLowerCase()) {
      cache.attrValues[key] = parseInt(val.id, 10);
      return cache.attrValues[key];
    }
  }

  // Créer la valeur d'attribut
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><product_option_value>
  <id_attribute_group>${groupId}</id_attribute_group>
  <color></color>
  <position>0</position>
  <name><language id="1">${valueName}</language></name>
</product_option_value></prestashop>`;

  const responseText = await postXml("product_option_values", xml);
  const id = extractIdFromXml(responseText, "product_option_value");
  if (!id)
    throw new Error(`Impossible de créer la valeur attribut: ${valueName}`);

  cache.attrValues[key] = id;
  return id;
}

// ===========================================================================
// COMBINAISONS
// ===========================================================================

// Sauvegarde l'ID d'une combinaison créée
export function setCombinationId(reference, attrName, id) {
  cache.combinations[`${reference}:${attrName}`] = id;
}

// Récupère l'ID d'une combinaison (0 si pas d'attribut)
export function getCombinationId(reference, attrName) {
  if (!attrName) return 0;
  return cache.combinations[`${reference}:${attrName}`] || 0;
}

// ===========================================================================
// CLIENTS
// ===========================================================================

// Trouve ou crée un client par email
export async function findOrCreateCustomer(email, nom, pwd, dateAdd) {
  if (cache.customers[email]) return cache.customers[email];

  const data = await client.get(
    `customers?filter[email]=[${email}]&display=full`,
  );
  const customers = toArray(data.customers);

  for (const cust of customers) {
    if (String(cust.email).toLowerCase() === email.toLowerCase()) {
      const id = parseInt(cust.id, 10);
      cache.customers[email] = id;
      // La secure_key du client existant est fournie par display=full
      cache.customerKeys[email] = String(cust.secure_key || "");
      return id;
    }
  }

  // Créer le client
  const parts = nom.trim().split(" ");
  const firstname = parts[0];
  const lastname = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><customer>
  <id_default_group>3</id_default_group>
  <id_lang>1</id_lang>
  <id_gender>1</id_gender>
  <id_shop>1</id_shop>
  <id_shop_group>1</id_shop_group>
  <firstname>${firstname}</firstname>
  <lastname>${lastname}</lastname>
  <email>${email}</email>
  <passwd>${pwd}</passwd>
  <active>1</active>
  <deleted>0</deleted>
  <is_guest>0</is_guest>
  <newsletter>0</newsletter>
  <optin>0</optin>
  <show_public_prices>0</show_public_prices>
  <outstanding_allow_amount>0</outstanding_allow_amount>
  <birthday>0000-00-00</birthday>
  <date_add>${dateAdd}</date_add>
  <date_upd>${now}</date_upd>
</customer></prestashop>`;

  const responseText = await postXml("customers", xml);
  // Parser la réponse pour extraire l'ID ET la secure_key
  // La secure_key doit être la même dans le panier pour que la commande soit acceptée
  const parsed = xmlParser.parse(responseText);
  const customerData = parsed?.prestashop?.customer;
  const id = parseInt(customerData?.id, 10) || null;
  const secureKey = String(customerData?.secure_key || "");

  if (!id) throw new Error(`Impossible de créer le client: ${email}`);

  cache.customers[email] = id;
  cache.customerKeys[email] = secureKey;
  return id;
}

// Retourne la secure_key d'un client (utilisée pour la création du panier/commande)
export function getCustomerSecureKey(email) {
  return cache.customerKeys[email] || null;
}

// Retourne l'ID pays de Madagascar
export function getMadagascarCountryId() {
  return COUNTRY_ID_MG;
}
