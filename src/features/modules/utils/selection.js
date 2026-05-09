/**
 * Manova ny fifantenana ny module iray.
 * Raha efa voafantina ilay module dia esorina amin'ny lisitra, raha tsy izany dia ampiana.
 * @param {string[]} selectedModules - Ny lisitry ny modules efa voafantina.
 * @param {string} moduleName - Ny anaran'ny module hovaina ny fifantenana azy.
 * @returns {string[]} Ny lisitra vaovao misy ny modules voafantina.
 */
export function toggleModuleSelection(selectedModules, moduleName) {
  // Hamarinina raha toa ka efa ao anatin'ny lisitry ny voafantina ilay module
  const isSelected = selectedModules.includes(moduleName);

  // Raha efa voafantina izy, dia esorina. Raha tsy izany, dia ampiana.
  return isSelected
    ? selectedModules.filter((name) => name !== moduleName)
    : [...selectedModules, moduleName];
}

/**
 * Manamarina raha voafantina daholo ny modules rehetra.
 * @param {string[]} selectedModules - Ny lisitry ny modules efa voafantina.
 * @param {string[]} allModules - Ny lisitry ny modules rehetra misy.
 * @returns {boolean} True raha voafantina daholo, false raha tsy izany.
 */
export function areAllModulesSelected(selectedModules, allModules) {
  // Hamarinina raha toa ka misy modules ary mitovy ny isan'ny voafantina sy ny isan'ny modules rehetra
  return allModules.length > 0 && selectedModules.length === allModules.length;
}
