import { parseCsvFile } from "./csvParser";
import { resetCache } from "./prestashopCache";
import { importProducts } from "./importProducts";
import { importCombinations } from "./importCombinations";
import { importCustomersOrders } from "./importCustomersOrders";
import { importImages } from "./importImages";

// Séquencement + politique All or Nothing
// Lance l'import complet : CSV + images ZIP (optionnel)
// Politique All or Nothing : la première erreur dans n'importe quelle ligne arrête tout
// files = { fichier1_products, fichier2_combinations, fichier3_transactions, images_zip }
export async function runImport(files, onLog) {
  const log = (msg) => {
    console.log(msg);
    onLog(msg);
  };

  resetCache();

  const results = [];

  // === ANALYSE PRÉALABLE DES DÉCLINAISONS (Fichier 2) ===
  // Règle métier :
  // - Autorisé : Produit simple ou produit avec UNE SEULE dimension (ex: uniquement taille)
  // - Interdit : Produit avec PLUSIEURS dimensions simultanées (ex: taille + couleur)
  if (files.fichier2_combinations) {
    try {
      const rows = await parseCsvFile(files.fichier2_combinations);

      // 1. Vérification des colonnes (Headers)
      // Si on trouve à la fois "taille" et "couleur" (ou autres colonnes d'attributs multiples)
      const headers = Object.keys(rows[0] || {}).map((h) => h.toLowerCase());
      const hasMultipleAttrColumns =
        headers.includes("taille") && headers.includes("couleur");

      if (hasMultipleAttrColumns) {
        const errorMsg =
          "L'import est annulé car le fichier contient plusieurs colonnes d'attributs (taille + couleur). Les combinaisons multiples ne sont pas supportées.";
        log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // 2. Vérification par référence
      const attributeTypesByRef = {}; // { REF: Set(['taille', 'couleur']) }

      for (const row of rows) {
        const ref = row.reference?.trim().toUpperCase();
        if (!ref) continue;

        const spec = row.specificité?.trim().toLowerCase();
        if (spec) {
          if (!attributeTypesByRef[ref]) {
            attributeTypesByRef[ref] = new Set();
          }
          attributeTypesByRef[ref].add(spec);
        }
      }

      const multiVariants = Object.entries(attributeTypesByRef)
        .filter(([_, types]) => types.size > 1)
        .map(([ref]) => ref);

      if (multiVariants.length > 0) {
        const errorMsg = `L'import est annulé car les produits suivants utilisent plusieurs types de déclinaisons (ex: taille ET couleur) : ${multiVariants.join(", ")}. Seule une dimension est autorisée par produit.`;
        log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      log("  ✓ Pré-analyse des déclinaisons : OK (Unidimensionnel)");
    } catch (err) {
      // Si c'est notre erreur de validation, on la propage pour arrêter runImport
      if (err.message.includes("plusieurs déclinaisons")) {
        throw err;
      }
      log(`❌ Erreur lors de la pré-analyse du fichier 2 : ${err.message}`);
    }
  }

  // === FICHIER 1 : PRODUITS ===
  if (files.fichier1_products) {
    log(" Début import Fichier 1 — Produits...");
    try {
      const rows = await parseCsvFile(files.fichier1_products);
      log(`  ${rows.length} ligne(s) à traiter`);
      const result = await importProducts(rows, log);
      results.push({
        file: "Produits",
        inserted: result.inserted,
        total: result.total,
        errors: [],
      });
      log(
        `✅ Fichier 1 terminé: ${result.inserted}/${result.total} produits insérés`,
      );
    } catch (err) {
      // err.inserted = nombre réel insérés avant l'erreur
      results.push({
        file: "Produits",
        inserted: err.inserted ?? 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Fichier 1 — ${err.message}`);
      log("⛔ All or Nothing: arrêt immédiat");
      return results;
    }
  }

  // === IMAGES ZIP (après produits, avant combinaisons) ===
  // Les images ne bloquent pas la suite si elles échouent
  if (files.images_zip) {
    log("  Début import Images ZIP...");
    try {
      const result = await importImages(files.images_zip, log);
      results.push({ file: "Images", ...result });
      if (result.errors.length > 0) {
        log(`⚠️  ${result.errors.length} image(s) en erreur (import continué)`);
      }
      log(
        `✅ Images terminé: ${result.inserted}/${result.total} image(s) importée(s)`,
      );
    } catch (err) {
      results.push({
        file: "Images",
        inserted: 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Images échouées: ${err.message} (import continué)`);
    }
  }

  // === FICHIER 2 : DÉCLINAISONS & STOCK ===
  if (files.fichier2_combinations) {
    log(" Début import Fichier 2 — Déclinaisons & Stock...");
    try {
      const rows = await parseCsvFile(files.fichier2_combinations);
      log(`  ${rows.length} ligne(s) à traiter`);
      const result = await importCombinations(rows, log);
      results.push({
        file: "Déclinaisons",
        inserted: result.inserted,
        total: result.total,
        errors: [],
      });
      log(
        `✅ Fichier 2 terminé: ${result.inserted}/${result.total} déclinaisons insérées`,
      );
    } catch (err) {
      results.push({
        file: "Déclinaisons",
        inserted: err.inserted ?? 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Fichier 2 — ${err.message}`);
      log("⛔ All or Nothing: arrêt immédiat");
      return results;
    }
  }

  // === FICHIER 3 : CLIENTS & COMMANDES ===
  if (files.fichier3_transactions) {
    log(" Début import Fichier 3 — Clients & Commandes...");
    try {
      const rows = await parseCsvFile(files.fichier3_transactions);
      log(`  ${rows.length} ligne(s) à traiter`);
      const result = await importCustomersOrders(rows, log);
      results.push({
        file: "Clients & Commandes",
        inserted: result.inserted,
        total: result.total,
        errors: [],
        customers: result.customers,
        orders: result.orders,
      });
      log(
        `✅ Fichier 3 terminé: ${result.customers} client(s), ${result.orders} commande(s)`,
      );
    } catch (err) {
      results.push({
        file: "Clients & Commandes",
        inserted: err.inserted ?? 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Fichier 3 — ${err.message}`);
      log("⛔ All or Nothing: arrêt immédiat");
      return results;
    }
  }

  return results;
}
