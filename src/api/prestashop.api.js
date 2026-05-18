import { XMLParser } from "fast-xml-parser";

// Clé unique pour tous les appels (GET JSON + POST XML)
export const API_KEY =
  import.meta.env.VITE_API_KEY || "6dJbxw1z6F0DDpG9PK7Ew2u2AhyOo08G";
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/";

// Validation des variables d'environnement
if (!API_KEY) {
  console.warn("VITE_API_KEY n'est pas definie dans .env");
}
if (!BASE_URL) {
  console.warn("VITE_API_BASE_URL n'est pas definie dans .env");
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

// avadika teny anglais le donnee brute be
// Exceptions PrestaShop dont le singulier n'est pas simplement "-s"
const SINGULAR_EXCEPTIONS = {
  addresses: "address",
  taxes: "tax",
  order_states: "order_state",
};

export function toSingleName(moduleName) {
  if (SINGULAR_EXCEPTIONS[moduleName]) return SINGULAR_EXCEPTIONS[moduleName];
  if (moduleName.endsWith("ies")) return `${moduleName.slice(0, -3)}y`;
  if (moduleName.endsWith("s")) return moduleName.slice(0, -1);
  return moduleName;
}

async function requestXml(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/xml", ...options.headers },
    ...options,
  });

  if (response.status === 403) {
    throw new Error("Acces refuse. Verifie les permissions Webservice.");
  }

  return response;
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

{
  /*=================================== General functions ================================================ */
}

// 1) Recuperer tous les IDs d'un module
export async function fetchModuleIds(moduleName) {
  // 1. Appel API : Maka ny data avy any amin'ny PrestaShop (On lance la requête)
  const response = await requestXml(
    `${BASE_URL}${moduleName}?ws_key=${API_KEY}`,
  );

  // 2. Vérification : Raha misy erreur ny API dia avoaka ny antony (Si la requête échoue)
  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(
      `Erreur GET ${moduleName}: ${response.status} ${details}`.trim(),
    );
  }

  // 3. Mamaky ny text XML : Alaina ny contenu (On récupère le texte brut de la réponse)
  const xmlPayload = await response.text();

  // 4. Avadika ho JSON (Objet JS) ilay XML mba ho mora ampiasaina (On parse le XML)
  const parsedPayload = parser.parse(xmlPayload);

  // 5. Mitady ilay liste anaty JSON.
  // Ny "?." (optional chaining) dia misoroka erreur raha tsy misy ilay data (Sécurité)
  const collectionRoot = parsedPayload?.prestashop?.[moduleName];

  // Mamerina tableau vide raha tsy misy data na module tsy valide
  // (Si on n'a rien trouvé, on arrête tout de suite et on renvoie une liste vide)
  if (!collectionRoot) {
    return [];
  }

  // 6. Maka ilay anarana au singulier, ohatra: "products" lasa "product"
  const singleName = toSingleName(moduleName);

  // 7. Alaina ny données an'ilay module (On cible les éléments précis)
  const rawItems = collectionRoot[singleName] || [];

  // 8. Fanaovana "Tableau" (Simplification du code ternaire difficile)
  // Raha tsy tableau (liste) ilay "rawItems", dia fonosina anaty "[]" isika mba tsy hisy bug
  let items = [];
  if (Array.isArray(rawItems)) {
    items = rawItems;
  } else {
    items = [rawItems];
  }

  // 9. Fanivanana ny IDs (Extraction et filtrage des numéros ID)
  return (
    items
      // .map : Maka ny attribut "@_id" isaky ny element ary avadika ho chiffre (Number)
      .map((item) => Number(item?.["@_id"]))

      // .filter : Manivana mba hitazona izay tena chiffre ihany.
      // !isNaN midika hoe "Tsy is Not a Number" = tena chiffre marina ilay izy.
      .filter((id) => !isNaN(id))
  );
}

{
  /*=================================== CLEAN DATA ================================================ */
}

export async function deleteModuleRecord(moduleName, id) {
  const response = await requestXml(
    `${BASE_URL}${moduleName}/${id}?ws_key=${API_KEY}`,
    { method: "DELETE" },
  );

  // 404 = déjà supprimé (suppression en cascade par PrestaShop) → OK, on ignore
  if (response.status === 404) return;

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(
      `Erreur DELETE ${moduleName}/${id}: ${response.status} ${details}`.trim(),
    );
  }
  // Pas de vérification GET : le statut 200/204 de l'API suffit
}

{
  /*=============================================IMPORT CSV================================================== */
}

export async function createResource(resourceName, xmlData) {
  const response = await fetch(`${BASE_URL}${resourceName}?ws_key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xmlData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Détails erreur PrestaShop:", errorText);
    throw new Error(`Erreur lors de la création dans ${resourceName}`);
  }

  return await response.text();
}

{
  /*=============================================Lister Module================================================== */
}

// Dans src/api/prestashop.api.js

/**
 * Récupère les données complètes d'une ressource unique par son ID.
 * @param {string} moduleName - Le nom de la ressource (ex: "products").
 * @param {number} id - L'ID de la ressource.
 * @returns {Promise<object|null>} Un objet contenant les données de la ressource, ou null si non trouvée.
 */
export async function fetchModuleRecord(moduleName, id) {
  const response = await requestXml(
    `${BASE_URL}${moduleName}/${id}?ws_key=${API_KEY}`,
  );

  // Si la requête échoue
  if (!response.ok) {
    // Si c'est une erreur 404, c'est que le produit n'existe pas. On retourne null.
    if (response.status === 404) {
      return null;
    }
    // Pour les autres erreurs, on lève une exception pour informer l'utilisateur.
    const details = await safeReadText(response);
    throw new Error(
      `Erreur GET ${moduleName}/${id}: ${response.status} ${details}`.trim(),
    );
  }

  // Si tout s'est bien passé, on traite la réponse
  const xmlPayload = await response.text();
  const parsedPayload = parser.parse(xmlPayload);

  const singleName = toSingleName(moduleName);

  // On retourne l'objet principal de la ressource
  return parsedPayload?.prestashop?.[singleName] || null;
}

{
  /*=============================================Modifier Module================================================== */
}

/**
 * Met à jour une ressource existante.
 * @param {string} resourceName - Le nom de la ressource (ex: "products").
 * @param {string} xmlData - Les données XML complètes de la ressource à mettre à jour.
 * @returns {Promise<string>} La réponse de l'API.
 */
export async function updateResource(resourceName, xmlData) {
  const response = await fetch(`${BASE_URL}${resourceName}?ws_key=${API_KEY}`, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: xmlData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Détails erreur PrestaShop:", errorText);
    throw new Error(`Erreur lors de la mise à jour dans ${resourceName}`);
  }

  return await response.text();
}

// =================================== Client API prestashop =============================================== */
/**
 * Client API Prestashop simple
 * Enveloppe les appels fetch pour les méthodes get/post
 */
export class PrestashopClient {
  constructor(apiKey = API_KEY, baseUrl = BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async get(endpoint) {
    const sep = endpoint.includes("?") ? "&" : "?";
    // output_format=JSON obligatoire : PrestaShop retourne du XML avec Accept header seul
    // display=full : retourne les champs complets (sans ça, seuls les IDs sont renvoyés)
    const url = `${this.baseUrl}${endpoint}${sep}ws_key=${this.apiKey}&output_format=JSON&display=full`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GET ${endpoint}: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // PrestaShop retourne [] (tableau vide) quand aucun résultat — normaliser en objet vide
    return Array.isArray(data) ? {} : data;
  }

  async post(endpoint, data) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const url = `${this.baseUrl}${endpoint}${sep}ws_key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint}: ${response.status}`);
    }

    return await response.json();
  }
}

/**
 * Calcule le bénéfice et le montant total des ventes et achats par catégorie (Hors Taxe)
 * @returns {Promise<Array>} Tableau de statistiques par catégorie.
 */
export async function getCategoryStatistics() {
  const client = new PrestashopClient();
  
  // 1. Récupération des données (Commandes valides, Produits, Catégories) en parallèle
  const [orders, productsData, categoriesData] = await Promise.all([
    listOrdersService(true), // Exclut les commandes annulées (état 6)
    client.get("products"),  // Pour obtenir les "wholesale_price" (Achat HT)
    client.get("categories") // Pour obtenir les noms de catégories
  ]);

  // 2. Mapping des Produits pour un accès rapide
  const products = Array.isArray(productsData?.products) ? productsData.products : [];
  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = {
      categoryId: p.id_category_default || "0",
      wholesalePrice: parseFloat(p.wholesale_price) || 0
    };
  });

  // 3. Mapping des Catégories 
  const categories = Array.isArray(categoriesData?.categories) ? categoriesData.categories : [];
  const categoryMap = {};
  categories.forEach(c => {
    let name = "Catégorie inconnue";
    if (c.name) {
      if (Array.isArray(c.name)) name = c.name[0]?.value || name; // Multilingue
      else if (typeof c.name === 'string') name = c.name;
      else if (c.name.language) name = c.name.language.value || c.name.language || name;
    }
    categoryMap[c.id] = name;
  });

  // 4. Calcul des montants par catégorie
  const stats = {};

  orders.forEach(order => {
    // Les détails des lignes (order_details) d'une commande via API JSON
    let rows = [];
    if (order.associations?.order_rows) {
      const apiRows = order.associations.order_rows;
      rows = Array.isArray(apiRows) ? apiRows : [apiRows];
    }

    rows.forEach(row => {
      const productId = row.product_id;
      const quantity = parseInt(row.product_quantity || row.quantity, 10) || 0;
      // Prix de vente Unitaire HT défini dans la commande
      const unitPriceHt = parseFloat(row.unit_price_tax_excl || row.product_price) || 0;

      const pInfo = productMap[productId] || {};
      const catId = pInfo.categoryId || "0";
      const catName = categoryMap[catId] || `Catégorie ${catId}`;
      const wholesalePrice = pInfo.wholesalePrice || 0;

      if (!stats[catId]) {
        stats[catId] = {
          categoryId: catId,
          categoryName: catName,
          totalSalesHT: 0,
          totalPurchaseHT: 0,
          profit: 0
        };
      }

      stats[catId].totalSalesHT += unitPriceHt * quantity;
      stats[catId].totalPurchaseHT += wholesalePrice * quantity;
    });
  });

  // 5. Calcul des bénéfices
  return Object.values(stats).map(stat => {
    stat.profit = stat.totalSalesHT - stat.totalPurchaseHT;
    return stat;
  }).sort((a, b) => b.totalSalesHT - a.totalSalesHT); // Classer par produit générant le plus de ventes
}