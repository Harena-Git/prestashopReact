import {
  fetchModuleIds,
  deleteModuleRecord,
} from "../../../api/prestashop.api";
import { MODULE_REGISTRY } from "../constants/moduleRegistry";

// Supprime tous les enregistrements d'un module en sautant les IDs protégés
async function deleteOneModule(moduleName) {
  const ids = await fetchModuleIds(moduleName);

  // Récupère les IDs protégés depuis le registry (ex: catégories 1 et 2)
  const { protectedIds = [] } = MODULE_REGISTRY[moduleName] || {};

  let deletedCount = 0;

  for (const id of ids) {
    // Sauter les ressources système (non supprimables par PrestaShop)
    if (protectedIds.includes(id)) continue;

    await deleteModuleRecord(moduleName, id);
    deletedCount++;
  }

  return { module: moduleName, deleted: deletedCount };
}

// Supprime plusieurs modules en parallèle
export async function deleteSelectedModules(selectedModules) {
  const tasks = selectedModules.map(async (moduleName) => {
    try {
      const info = await deleteOneModule(moduleName);
      return { ...info, success: true };
    } catch (error) {
      return {
        module: moduleName,
        success: false,
        error: error.message,
        deleted: 0,
      };
    }
  });

  return Promise.all(tasks);
}
