import { MODULE_REGISTRY } from "../constants/moduleRegistry";

/**
 * Détecte le nom du module PrestaShop basé sur les en-têtes d'un fichier CSV.
 * @param {string[]} csvHeaders - Un tableau des en-têtes du CSV.
 * @returns {string|null} Le nom du module détecté (ex: "products") ou null si non trouvé.
 */
export function detectModuleFromCsvHeaders(csvHeaders) {
  let bestMatch = null;
  let highestScore = 0;

  // Parcourt chaque module connu (products, customers, etc.)
  for (const [moduleName, config] of Object.entries(MODULE_REGISTRY)) {
    let currentScore = 0;
    
    // Calcule un score de correspondance
    for (const header of csvHeaders) {
      if (config.detectionFields.includes(header)) {
        currentScore++;
      }
    }

    // Si le score est le plus élevé jusqu'à présent, on le garde
    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = moduleName;
    }
  }

  // On ne retourne un match que si au moins 2 champs correspondent pour éviter les faux positifs
  return highestScore > 1 ? bestMatch : null;
}
