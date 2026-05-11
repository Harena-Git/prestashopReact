import { parseCsvFile } from "./csvParser";
import { resetCache } from "./prestashopCache";
import { importProducts } from "./importProducts";
import { importCombinations } from "./importCombinations";
import { importCustomersOrders } from "./importCustomersOrders";

// Lance l'import complet des 3 fichiers CSV
// files = { fichier1_products, fichier2_combinations, fichier3_transactions }
// onLog = fonction appelée pour chaque message de log
// Retourne un tableau de résultats par fichier
export async function runImport(files, onLog) {
  const log = (msg) => {
    console.log(msg);
    onLog(msg);
  };

  // Réinitialiser le cache avant chaque import
  resetCache();

  const results = [];

  // === FICHIER 1 : PRODUITS ===
  if (files.fichier1_products) {
    log("📦 Début import Fichier 1 — Produits...");
    try {
      const rows = await parseCsvFile(files.fichier1_products);
      log(`  ${rows.length} ligne(s) à traiter`);

      const result = await importProducts(rows, log);
      results.push({ file: "Produits", ...result });

      if (result.errors.length > 0) {
        log(`⚠️  ${result.errors.length} erreur(s) dans Fichier 1`);
        log("⛔ Import arrêté (All or Nothing)");
        return results;
      }
      log(
        `✅ Fichier 1 terminé: ${result.inserted}/${result.total} produits insérés`,
      );
    } catch (err) {
      results.push({
        file: "Produits",
        inserted: 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Fichier 1 échoué: ${err.message}`);
      log("⛔ Import arrêté (All or Nothing)");
      return results;
    }
  }

  // === FICHIER 2 : DÉCLINAISONS & STOCK ===
  if (files.fichier2_combinations) {
    log("🔀 Début import Fichier 2 — Déclinaisons & Stock...");
    try {
      const rows = await parseCsvFile(files.fichier2_combinations);
      log(`  ${rows.length} ligne(s) à traiter`);

      const result = await importCombinations(rows, log);
      results.push({ file: "Déclinaisons", ...result });

      if (result.errors.length > 0) {
        log(`⚠️  ${result.errors.length} erreur(s) dans Fichier 2`);
        log("⛔ Import arrêté (All or Nothing)");
        return results;
      }
      log(
        `✅ Fichier 2 terminé: ${result.inserted}/${result.total} déclinaisons insérées`,
      );
    } catch (err) {
      results.push({
        file: "Déclinaisons",
        inserted: 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Fichier 2 échoué: ${err.message}`);
      log("⛔ Import arrêté (All or Nothing)");
      return results;
    }
  }

  // === FICHIER 3 : CLIENTS & COMMANDES ===
  if (files.fichier3_transactions) {
    log("👥 Début import Fichier 3 — Clients & Commandes...");
    try {
      const rows = await parseCsvFile(files.fichier3_transactions);
      log(`  ${rows.length} ligne(s) à traiter`);

      const result = await importCustomersOrders(rows, log);
      results.push({ file: "Clients & Commandes", ...result });

      if (result.errors.length > 0) {
        log(`⚠️  ${result.errors.length} erreur(s) dans Fichier 3`);
      }
      log(
        `✅ Fichier 3 terminé: ${result.customers} client(s), ${result.orders} commande(s)`,
      );
    } catch (err) {
      results.push({
        file: "Clients & Commandes",
        inserted: 0,
        total: 0,
        errors: [err.message],
      });
      log(`❌ Fichier 3 échoué: ${err.message}`);
    }
  }

  return results;
}
