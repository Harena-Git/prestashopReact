import { PrestashopClient } from "../../../api/prestashop.api";

/**
 * Service : Suivi de Stock agrégé par catégorie
 *
 * Colonnes calculées :
 *  - Qté physique  → stock_availables (en gérant les déclinaisons sans double-comptage)
 *  - Qté réservée  → commandes actives (états 2,3,4) non encore livrées ni annulées
 *  - Qté disponible → Qté physique − Qté réservée
 *
 * NOTE : PrestaShop ne fournit pas directement la "quantité réservée".
 * Elle est reconstruite dynamiquement à partir des lignes de commandes
 * dont le statut indique que le stock n'a pas encore été libéré.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeList(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function extractName(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (field.language) {
    const langs = Array.isArray(field.language)
      ? field.language
      : [field.language];
    // Priorité langue 1 (FR), sinon première disponible
    const lang =
      langs.find((l) => l["@_id"] === "1" || l["@_id"] === 1) || langs[0];
    return lang?.["#text"] || lang?.value || String(lang) || "";
  }
  return "";
}

/**
 * États de commande considérés comme "stock réservé" :
 *   2 = Paiement effectué / accepté
 *   3 = En préparation
 *   4 = Expédié (parti mais pas encore "livré")
 *
 * États exclus :
 *   1 = En attente (paiement non confirmé)
 *   5 = Livré      (stock déjà décrémenté et clôturé)
 *   6 = Annulé
 *   (tout autre état non listé est également exclu par précaution)
 */
const RESERVED_STATES = new Set([2, 3, 4]);

// ─── Construction du stock physique par produit ───────────────────────────────

/**
 * À partir de la liste brute de stock_availables, calcule le stock physique
 * par produit en évitant le double-comptage de la ligne agrégat (attribute=0)
 * quand des lignes de déclinaisons existent.
 */
function buildPhysicalStockMap(allStockRecords) {
  // Grouper par product_id
  const byProduct = {};
  allStockRecords.forEach((s) => {
    const pid = String(s.id_product);
    if (!byProduct[pid]) byProduct[pid] = [];
    byProduct[pid].push(s);
  });

  const physicalMap = {};
  Object.entries(byProduct).forEach(([pid, records]) => {
    const variantRecords = records.filter(
      (r) => String(r.id_product_attribute) !== "0",
    );
    // Produit avec déclinaisons → sommer uniquement les déclinaisons
    // Produit simple → sommer la ligne de base (attribute=0)
    const toSum = variantRecords.length > 0 ? variantRecords : records;
    physicalMap[pid] = toSum.reduce(
      (sum, r) => sum + parseInt(r.quantity || 0, 10),
      0,
    );
  });

  return physicalMap;
}

// ─── Construction du stock réservé par produit ────────────────────────────────

/**
 * Parcourt toutes les commandes et accumule les quantités commandées
 * pour les commandes dont le statut est "actif" (réservé).
 */
function buildReservedStockMap(orders) {
  const reservedMap = {};

  orders.forEach((order) => {
    const stateId = parseInt(order.current_state, 10);
    if (!RESERVED_STATES.has(stateId)) return;

    const rows = normalizeList(order.associations?.order_rows);
    rows.forEach((row) => {
      const pid = String(row.product_id);
      const qty = parseInt(row.product_quantity || row.quantity || 0, 10);
      if (qty <= 0) return;
      reservedMap[pid] = (reservedMap[pid] || 0) + qty;
    });
  });

  return reservedMap;
}

// ─── API publique ──────────────────────────────────────────────────────────────

/**
 * Calcule le tableau de stock agrégé par catégorie.
 *
 * @returns {Promise<Array<{
 *   categoryId: string,
 *   categoryName: string,
 *   qtePhysique: number,
 *   qteReservee: number,
 *   qteDisponible: number,
 * }>>}
 */
export async function fetchCategoryStockData() {
  const client = new PrestashopClient();

  // ÉTAPE 1 — Récupérer toutes les données sources en parallèle (optimisation)
  const [stockData, ordersData, productsData, categoriesData] =
    await Promise.all([
      client.get("stock_availables"),
      client.get("orders?display=full"),
      client.get("products"),
      client.get("categories"),
    ]);

  // ÉTAPE 2 — Map categoryId → nom de catégorie
  const categoryNameMap = {};
  normalizeList(categoriesData?.categories).forEach((c) => {
    if (!c?.id) return;
    categoryNameMap[String(c.id)] = extractName(c.name) || `Catégorie ${c.id}`;
  });

  // ÉTAPE 3 — Map productId → categoryId
  const productCategoryMap = {};
  normalizeList(productsData?.products).forEach((p) => {
    if (!p?.id) return;
    productCategoryMap[String(p.id)] = String(p.id_category_default || "0");
  });

  // ÉTAPE 4 — Stock physique par produit (sans double-comptage des agrégats)
  const allStockRecords = normalizeList(stockData?.stock_availables);
  const physicalByProduct = buildPhysicalStockMap(allStockRecords);

  // ÉTAPE 5 — Stock réservé par produit (commandes actives non livrées)
  const allOrders = normalizeList(ordersData?.orders);
  const reservedByProduct = buildReservedStockMap(allOrders);

  // ÉTAPE 6 — Agréger par catégorie
  const categoryStats = {};

  // Union de tous les product IDs rencontrés
  const allProductIds = new Set([
    ...Object.keys(physicalByProduct),
    ...Object.keys(reservedByProduct),
  ]);

  allProductIds.forEach((pid) => {
    const catId = productCategoryMap[pid] || "0";
    const catName = categoryNameMap[catId] || `Catégorie ${catId}`;

    if (!categoryStats[catId]) {
      categoryStats[catId] = {
        categoryId: catId,
        categoryName: catName,
        qtePhysique: 0,
        qteReservee: 0,
      };
    }

    categoryStats[catId].qtePhysique += physicalByProduct[pid] || 0;
    categoryStats[catId].qteReservee += reservedByProduct[pid] || 0;
  });

  // ÉTAPE 7 — Calculer la disponibilité et trier par nom de catégorie
  return Object.values(categoryStats)
    .map((cat) => ({
      ...cat,
      qteDisponible: cat.qtePhysique - cat.qteReservee,
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "fr"));
}
