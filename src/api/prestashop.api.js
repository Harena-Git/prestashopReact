import { XMLParser } from "fast-xml-parser";

// Charger les variables d'environnement
// const API_KEY = import.meta.env.VITE_API_KEY;
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = "5SYPY9N926AJC1FR75YVNBFXVAPJFFBC";
const BASE_URL = "/api/";

// Validation des variables d'environnement
if (!API_KEY) {
  console.warn("VITE_API_KEY n'est pas definie dans .env");
}
if (!BASE_URL) {
  console.warn("VITE_API_BASE_URL n'est pas definie dans .env");
}

{
  /*=================================== CLEAN DATA ================================================ */
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

// avadika teny anglais le donnee brute be
export function toSingleName(moduleName) {
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

// 1) Recuperer tous les IDs d'un module
export async function fetchModuleIds(moduleName) {
  const response = await requestXml(
    `${BASE_URL}${moduleName}?ws_key=${API_KEY}`,
  );
  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(
      `Erreur GET ${moduleName}: ${response.status} ${details}`.trim(),
    );
  }

  const xmlPayload = await response.text();
  const parsedPayload = parser.parse(xmlPayload);
  const collectionRoot = parsedPayload?.prestashop?.[moduleName];

  // mamerina tableau vide raha tsy misy data na module tsy valide
  if (!collectionRoot) return [];

  const singleName = toSingleName(moduleName);
  const rawItems = collectionRoot[singleName] || [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((item) => Number(item?.["@_id"]))
    .filter((id) => Number.isFinite(id));
}

export async function deleteModuleRecord(moduleName, id) {
  const response = await requestXml(
    `${BASE_URL}${moduleName}/${id}?ws_key=${API_KEY}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(
      `Erreur DELETE ${moduleName}/${id}: ${response.status} ${details}`.trim(),
    );
  }

  const verifyResponse = await requestXml(
    `${BASE_URL}${moduleName}/${id}?ws_key=${API_KEY}`,
  );
  if (verifyResponse.status !== 404) {
    throw new Error(
      `Suppression non confirmee pour ${moduleName}/${id} (status verification: ${verifyResponse.status})`,
    );
  }
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
