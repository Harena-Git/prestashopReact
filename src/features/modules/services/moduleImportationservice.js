import Papa from "papaparse";
import { XMLBuilder } from "fast-xml-parser";
import { createResource, toSingleName } from "../../../api/prestashop.api";
import { MODULE_REGISTRY } from "../constants/moduleRegistry"; // Importer le registre

const builder = new XMLBuilder({ format: true, ignoreAttributes: false });

export const importCsvToPrestashop = async (file, resourceName) => {
  // Récupère la configuration pour le module détecté
  const moduleConfig = MODULE_REGISTRY[resourceName];
  if (!moduleConfig) {
    throw new Error(
      `Configuration de module non trouvée pour "${resourceName}"`,
    );
  }
  const multiLangFields = moduleConfig.multiLangFields;

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const jsonData = results.data;
        let successCount = 0;
        let errors = [];

        for (const item of jsonData) {
          try {
            // Exclure les champs read_only et non inscriptibles définis dans le registre
            const excludeFields = moduleConfig.excludeFields || [];
            const transformedItem = Object.fromEntries(
              Object.entries(item).filter(
                ([key]) => !excludeFields.includes(key),
              ),
            );

            // Transformation dynamique basée sur la configuration du module
            if (multiLangFields && multiLangFields.length > 0) {
              for (const field of multiLangFields) {
                if (transformedItem[field]) {
                  transformedItem[field] = {
                    language: { "@_id": "1", "#text": transformedItem[field] },
                  };
                }
              }
            }

            const xmlObject = {
              prestashop: {
                [toSingleName(resourceName)]: transformedItem,
              },
            };
            const xmlData = builder.build(xmlObject);

            await createResource(resourceName, xmlData);
            successCount++;
          } catch (err) {
            errors.push({ item, error: err.message });
          }
        }
        resolve({ successCount, errors });
      },
      error: (error) => reject(error),
    });
  });
};
