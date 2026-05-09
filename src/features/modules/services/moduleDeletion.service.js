import { fetchModuleIds, deleteModuleRecord } from "../../../api/prestashop.api";

// 1. Fonction hamafana module iray sy ny angon-drakitra (records) ao anatiny
async function deleteOneModule(moduleName) {
  // Maka ny ID rehetra ao amin'ilay module
  const ids = await fetchModuleIds(moduleName);

  let deletedCount = 0;

  // Loop tsotra: fafana tsirairay ny ID hita rehetra
  for (const id of ids) {
    await deleteModuleRecord(moduleName, id);
    deletedCount = deletedCount + 1; // Manampy isa isaky ny misy voafafa
  }

  // Mamerina ny anaran'ilay module sy ny isan'ny voafafa
  return { module: moduleName, deleted: deletedCount };
}

// 2. Fonction hamafana module maromaro miaraka (izay voafidy)
export async function deleteSelectedModules(selectedModules) {
  
  // Ampiasaina ny .map mba handefasana ny famafana ho an'ny module rehetra
  const tasks = selectedModules.map(async (moduleName) => {
    try {
      // Manandrana hamafa ny module iray
      const info = await deleteOneModule(moduleName);
      
      // Raha tafavoaka tsara (Succès)
      return { 
        ...info, 
        success: true 
      };

    } catch (error) {
      // Raha nisy olana (Erreur)
      return {
        module: moduleName,
        success: false,
        error: error.message,
        deleted: 0,
      };
    }
  });

  // Miandry ny famafana rehetra ho vita vao mamerina ny valiny (Promise.all)
  return Promise.all(tasks);
}
