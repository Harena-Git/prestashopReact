import { fetchModuleIds, deleteModuleRecord } from "../../../api/prestashop.api";

async function deleteOneModule(moduleName) {
  const ids = await fetchModuleIds(moduleName);

  let deletedCount = 0;
  for (const id of ids) {
    await deleteModuleRecord(moduleName, id);
    deletedCount += 1;
  }

  return { module: moduleName, deleted: deletedCount };
}

// 3) Fonction exportee: supprime plusieurs modules coches (en parallele pour plus de rapidite)
export async function deleteSelectedModules(selectedModules) {
  const tasks = selectedModules.map(async (moduleName) => {
    try {
      const info = await deleteOneModule(moduleName);
      return { ...info, success: true };
    } catch (error) {
      return {
        module: moduleName,
        success: false,
        error: error?.message || "Erreur inconnue",
        deleted: 0,
      };
    }
  });

  return Promise.all(tasks);
}
