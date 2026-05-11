import {
  getProductInfo,
  findOrCreateAttrGroup,
  findOrCreateAttrValue,
  setCombinationId,
  postXml,
  putXml,
} from "./prestashopCache";
import { buildCombinationXml, buildStockXml } from "./xmlBuilder";
import { PrestashopClient } from "../../../api/prestashop.api";
import { XMLParser } from "fast-xml-parser";

const client = new PrestashopClient();
const xmlParser = new XMLParser({ ignoreAttributes: false });

function extractIdFromXml(xmlText, singular) {
  try {
    const parsed = xmlParser.parse(xmlText);
    return parseInt(parsed?.prestashop?.[singular]?.id, 10) || null;
  } catch {
    return null;
  }
}

function toNum(str) {
  return parseFloat(String(str).replace(",", ".")) || 0;
}

function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.id) return [raw];
  return [];
}

// Met à jour la quantité en stock pour un produit ou une combinaison
async function updateStock(productId, combinationId, quantity) {
  const combId = combinationId || 0;
  const data = await client.get(
    `stock_availables?filter[id_product]=[${productId}]&filter[id_product_attribute]=[${combId}]&display=full`
  );
  const stocks = toArray(data.stock_availables);

  if (stocks.length === 0) {
    console.warn(`Stock introuvable pour produit ${productId}, combinaison ${combId}`);
    return;
  }

  const stockId = parseInt(stocks[0].id, 10);
  const xml = buildStockXml({
    id: stockId,
    product_id: productId,
    combination_id: combId,
    quantity,
  });

  await putXml(`stock_availables/${stockId}`, xml);
}

// Importe toutes les déclinaisons et le stock du fichier 2
export async function importCombinations(rows, log) {
  const errors = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;

    try {
      const reference = row.reference?.trim().toUpperCase();
      const productInfo = getProductInfo(reference);

      if (!productInfo) {
        throw new Error(`Produit "${reference}" non trouvé — le fichier 1 doit être importé d'abord`);
      }

      const hasAttributes = row.specificité?.trim() && row.karazany?.trim();
      const quantity = parseInt(row.stock_initial) || 0;

      if (!hasAttributes) {
        // Produit sans attributs: juste mettre à jour le stock
        log(`  Ligne ${lineNum}: Stock produit "${reference}" → ${quantity}`);
        await updateStock(productInfo.id, 0, quantity);
        log(`  ✓ Stock mis à jour pour "${reference}"`);
        inserted++;
        continue;
      }

      // Trouver/créer groupe d'attribut (ex: "taille")
      log(`  Ligne ${lineNum}: Groupe attribut "${row.specificité}"...`);
      const groupId = await findOrCreateAttrGroup(row.specificité.trim());

      // Trouver/créer valeur d'attribut (ex: "ngoza")
      log(`  Ligne ${lineNum}: Valeur attribut "${row.karazany}"...`);
      const valueId = await findOrCreateAttrValue(row.karazany.trim(), groupId);

      // Calculer le delta de prix (combinaison vs produit de base)
      let priceDelta = 0;
      if (row.prix_vente_ttc?.trim()) {
        const combTtc = toNum(row.prix_vente_ttc);
        const combHt = combTtc / (1 + productInfo.tax_rate / 100);
        priceDelta = combHt - productInfo.price_ht;
      }

      // Créer la combinaison
      const xml = buildCombinationXml({
        product_id: productInfo.id,
        option_value_id: valueId,
        price_delta: priceDelta,
        reference: `${reference}-${row.karazany.trim()}`,
      });

      log(`  Ligne ${lineNum}: Combinaison "${reference}" + "${row.karazany}"...`);
      const responseText = await postXml("combinations", xml);
      const combinationId = extractIdFromXml(responseText, "combination");

      if (!combinationId) throw new Error(`Aucun ID retourné pour la combinaison`);

      // Sauvegarder pour les commandes (fichier 3)
      setCombinationId(reference, row.karazany.trim(), combinationId);

      // Mettre à jour le stock de cette combinaison
      await updateStock(productInfo.id, combinationId, quantity);

      log(`  ✓ Combinaison créée (ID ${combinationId}), stock: ${quantity}`);
      inserted++;
    } catch (err) {
      errors.push(`Ligne ${lineNum}: ${err.message}`);
      log(`  ✗ Ligne ${lineNum}: ${err.message}`);
    }
  }

  return { inserted, total: rows.length, errors };
}
