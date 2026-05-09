export function toggleModuleSelection(selectedModules, moduleName) {
  if (selectedModules.includes(moduleName)) {
    return selectedModules.filter((name) => name !== moduleName);
  }

  return [...selectedModules, moduleName];
}

export function areAllModulesSelected(selectedModules, allModules) {
  return allModules.length > 0 && selectedModules.length === allModules.length;
}
