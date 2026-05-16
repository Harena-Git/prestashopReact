import {
  fetchModuleIds,
  deleteModuleRecord,
} from "../../../api/prestashop.api";
import { MODULE_REGISTRY, DELETION_ORDER } from "../constants/moduleRegistry";

// Supprime tous les enregistrements d'un module en sautant les IDs protégés
async function deleteOneModule(moduleName) {
  console.log(`[CLEANUP] Début du module : ${moduleName}`);
  const ids = await fetchModuleIds(moduleName);
  console.log(
    `[CLEANUP] ${ids.length} enregistrements trouvés pour ${moduleName}`,
  );

  const { protectedIds = [] } = MODULE_REGISTRY[moduleName] || {};
  const protectedIdsStrings = protectedIds.map(String);

  let deletedCount = 0;
  let skippedCount = 0;

  for (const id of ids) {
    if (protectedIdsStrings.includes(String(id))) {
      console.log(`[CLEANUP]   - ID ${id} est protégé. Passage...`);
      skippedCount++;
      continue;
    }

    try {
      await deleteModuleRecord(moduleName, id);
      deletedCount++;
      if (deletedCount % 5 === 0 || deletedCount === ids.length) {
        console.log(
          `[CLEANUP]   - Suppression en cours : ${deletedCount}/${ids.length} terminés`,
        );
      }
    } catch (err) {
      console.error(`[CLEANUP]   - Erreur sur ID ${id} : ${err.message}`);
      throw err; // On arrête tout si une suppression échoue
    }
  }

  console.log(
    `[CLEANUP] Fin du module ${moduleName} : ${deletedCount} supprimés, ${skippedCount} protégés.`,
  );
  return { module: moduleName, deleted: deletedCount };
}

/**
 * Supprime les modules sélectionnés.
 * Note: La suppression est désormais SÉQUENTIELLE et ordonnée
 * pour respecter les contraintes d'intégrité de PrestaShop (FK).
 */
export async function deleteSelectedModules(selectedModules) {
  console.group("=== DÉBUT DE LA SUPPRESSION GLOBALE ===");
  console.log(`Modules à traiter : ${selectedModules.join(", ")}`);

  // Trier les modules selon l'ordre de dépendance défini dans le registry
  const sortedModules = [...selectedModules].sort((a, b) => {
    const indexA = DELETION_ORDER.indexOf(a);
    const indexB = DELETION_ORDER.indexOf(b);
    const posA = indexA === -1 ? 999 : indexA;
    const posB = indexB === -1 ? 999 : indexB;
    return posA - posB;
  });

  if (selectedModules.length !== sortedModules.length) {
    console.log(`Ordre appliqué : ${sortedModules.join(" -> ")}`);
  }

  const results = [];

  for (const moduleName of sortedModules) {
    try {
      const info = await deleteOneModule(moduleName);
      results.push({ ...info, success: true });
    } catch (error) {
      console.error(`[CLEANUP] ÉCHEC CRITIQUE sur le module ${moduleName}`);
      results.push({
        module: moduleName,
        success: false,
        error: error.message,
        deleted: 0,
      });
      // Optionnel: on peut décider de continuer ou d'arrêter
    }
  }

  console.log("Résultats finaux :", results);
  console.groupEnd();
  return results;
}
