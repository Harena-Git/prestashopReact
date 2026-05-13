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
  const protectedIdsStrings = protectedIds.map(String);

  let deletedCount = 0;

  for (const id of ids) {
    // Sauter les ressources systÃ¨me (non supprimables par PrestaShop)
    // On compare en chaÃ®ne de caractÃ¨res pour Ã©viter les problÃ¨mes de type diffÃ©rents
    if (protectedIdsStrings.includes(String(id))) continue;

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
