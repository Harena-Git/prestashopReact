import {
  findOrCreateCategory,
  findTaxGroupId,
  setProductInfo,
  postXml,
} from "./prestashopCache";
import { buildProductXml, formatDate } from "./xmlBuilder";
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

// Convertit "12,5" en nombre
function toNum(str) {
  return parseFloat(String(str).replace(",", ".")) || 0;
}

// Importe tous les produits du fichier 1
// All or Nothing : la première erreur arrête tout l'import
export async function importProducts(rows, log) {
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;

    try {
      const reference = row.reference?.trim().toUpperCase();
      const name = row.nom?.trim();
      const dateAdd = formatDate(row.date_availability_produit);

      if (!reference || !name) {
        throw new Error(`Ligne ${lineNum}: référence ou nom manquant`);
      }

      // Trouver/créer la catégorie
      log(`  Ligne ${lineNum}: Catégorie "${row.categorie}"...`);
      const categoryId = await findOrCreateCategory(row.categorie?.trim());

      // Trouver le groupe de taxe
      log(`  Ligne ${lineNum}: Taxe "${row.taxe}"...`);
      const taxGroupId = await findTaxGroupId(row.taxe);

      // Calculer le prix HT (PrestaShop stocke le prix sans taxe)
      const taxRate = toNum(row.taxe.replace("%", ""));
      const priceTtc = toNum(row.prix_ttc);
      const priceHt = priceTtc / (1 + taxRate / 100);
      const wholesaleHt = toNum(row.prix_achat);

      // Construire et envoyer le XML produit
      const xml = buildProductXml({
        reference,
        name,
        price_ht: priceHt,
        wholesale_ht: wholesaleHt,
        tax_group_id: taxGroupId,
        category_id: categoryId,
        date_add: dateAdd,
      });

      log(`  Ligne ${lineNum}: Création produit "${reference}"...`);
      const responseText = await postXml("products", xml);
      const productId = extractIdFromXml(responseText, "product");

      if (!productId)
        throw new Error(`Aucun ID retourné pour le produit "${reference}"`);

      // Mettre en cache pour les fichiers 2 et 3
      setProductInfo(reference, {
        id: productId,
        price_ht: priceHt,
        tax_rate: taxRate,
        name,
      });

      log(`  ✓ Produit "${reference}" créé avec ID ${productId}`);
      inserted++;
    } catch (err) {
      log(`  ✗ Ligne ${lineNum}: ${err.message}`);
      // All or Nothing : arrêt immédiat
      const stopError = new Error(`Ligne ${lineNum}: ${err.message}`);
      stopError.inserted = inserted;
      throw stopError;
    }
  }

  return { inserted, total: rows.length };
}
