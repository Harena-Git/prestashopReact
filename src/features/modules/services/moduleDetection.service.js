import { MODULE_REGISTRY } from "../constants/moduleRegistry";

/**
 * Détecte le nom du module PrestaShop basé sur les en-têtes d'un fichier CSV.
 * @param {string[]} csvHeaders - Un tableau des en-têtes du CSV.
 * @returns {string|null} Le nom du module détecté (ex: "products") ou null si non trouvé.
 */

export function detectModuleFromCsvHeaders(csvHeaders) {
  let bestMatch = null;
  let highestScore = 0;

  // 1. Alaina ny lisitry ny module rehetra ao amin'ny MODULE_REGISTRY
  // (On récupère la liste des noms de modules disponibles)
  const moduleNames = Object.keys(MODULE_REGISTRY);

  // 2. Loop voalohany: Jerena tsirairay ny module tsirairay
  // (On parcourt chaque module un par un)
  for (let i = 0; i < moduleNames.length; i++) {
    const moduleName = moduleNames[i];
    const config = MODULE_REGISTRY[moduleName];
    
    let currentScore = 0;

    // 3. Loop faharoa: Jerena ny lohatenin'ny CSV (headers) nalefan'ny mpampiasa
    // (On parcourt chaque entête du fichier CSV importé)
    for (let j = 0; j < csvHeaders.length; j++) {
      const header = csvHeaders[j];

      // 4. Jerena raha misy an'io lohateny io any anaty lisitra tokony ho fantatry ny module
      // (On vérifie si cette colonne fait partie des colonnes connues par ce module)
      if (config.detectionFields.includes(header)) {
        currentScore = currentScore + 1; // Mitombo 1 ny score raha mifanaraka (Score + 1)
      }
    }

    // 5. Raha ity module ity no manana score ambony indrindra hatreto, dia tadidiana izy
    // (Si ce module obtient le meilleur score actuel, on le garde en mémoire)
    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = moduleName;
    }
  }

  // 6. Fanalana ny "faux positifs" : Tsy ekena raha tsy misy colonne farafahakeliny 2 mifanaraka
  // (On ne valide le module que si on a trouvé au moins 2 colonnes correspondantes)
  if (highestScore > 1) {
    return bestMatch; // Mamerina ny anaran'ilay module tsara indrindra (On renvoie le module trouvé)
  } else {
    return null; // Mamerina "rien" raha tsy ampy ny lohateny mifanaraka (On renvoie rien)
  }
}
