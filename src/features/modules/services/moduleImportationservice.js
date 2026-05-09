import Papa from "papaparse";
import { XMLBuilder } from "fast-xml-parser";
import { createResource, toSingleName } from "../../../api/prestashop.api";
import { MODULE_REGISTRY } from "../constants/moduleRegistry"; // Importer le registre

const builder = new XMLBuilder({ format: true, ignoreAttributes: false });

export const importCsvToPrestashop = async (file, resourceName) => {
  // 1. Maka ny configuration an'ilay module (ohatra: products). Raha tsy hita dia mamoaka erreur.
  const moduleConfig = MODULE_REGISTRY[resourceName];
  if (!moduleConfig) {
    throw new Error(
      `Configuration de module non trouvée pour "${resourceName}"`,
    );
  }
  const multiLangFields = moduleConfig.multiLangFields;

  return new Promise((resolve, reject) => {
    // 2. Mampiasa PapaParse hamakiana ny fichier CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const jsonData = results.data;
        let successCount = 0;
        let errors = [];

        // 3. Loop: jerena tsirairay ny andalana (ligne) ao amin'ny CSV
        for (const item of jsonData) {
          try {
            const excludeFields = moduleConfig.excludeFields || [];
            const transformedItem = {};

            // 4. Manala ireo columna izay tsy mahazo ampidirina (excludeFields)
            // Ity no fomba tsotra indrindra hanaovana azy:
            for (const key in item) {
              if (!excludeFields.includes(key)) {
                transformedItem[key] = item[key];
              }
            }

            // 5. Raha misy campos mila dikanteny (multi-lang), dia ovaina ny endriny ho XML format
            if (multiLangFields && multiLangFields.length > 0) {
              for (const field of multiLangFields) {
                if (transformedItem[field]) {
                  transformedItem[field] = {
                    language: { "@_id": "1", "#text": transformedItem[field] },
                  };
                }
              }
            }

            // 6. Manamboatra ny rafitra XML halefa any amin'ny PrestaShop
            const xmlObject = {
              prestashop: {
                [toSingleName(resourceName)]: transformedItem,
              },
            };
            const xmlData = builder.build(xmlObject);

            // 7. Mandefa ny data any amin'ny API (Base de données)
            await createResource(resourceName, xmlData);
            successCount = successCount + 1; // Mitombo ny isan'ny tafiditra
          } catch (err) {
            // 8. Raha misy erreur dia tsy mijanona ny loop fa raisina fotsiny ilay erreur
            errors.push({ item, error: err.message });
          }
        }
        // Mamerina ny vokatry ny asa rehetra
        resolve({ successCount, errors });
      },
      // Raha sendra tsy mety vakiana mihitsy ilay fichier CSV
      error: (error) => reject(error),
    });
  });
};
