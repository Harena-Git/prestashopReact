import { XMLParser } from "fast-xml-parser";

// Charger les variables d'environnement
// const API_KEY = import.meta.env.VITE_API_KEY;
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = "3dK1We529zTiCrg7i9TZ3N5MTAcD1MAb";
const BASE_URL = "/api/";

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

// list orders

export async function listOrders() {
  const response = await fetch(`${BASE_URL}orders?ws_key=${API_KEY}`);

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Erreur GET orders: ${response.status} ${details}`.trim());
  }

  const xmlPayload = await response.text();
  const parsed = parser.parse(xmlPayload);

  const rawOrders = parsed?.prestashop?.orders?.order || [];
  return Array.isArray(rawOrders) ? rawOrders : [rawOrders];
}

// Update
export async function updateOrder(xmlData) {
  const response = await fetch(`${BASE_URL}orders?ws_key=${API_KEY}`, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: xmlData,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Erreur PUT orders: ${response.status} ${details}`.trim());
  }

  return await response.text();
}