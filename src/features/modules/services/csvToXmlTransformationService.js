/**
 * SERVICE DE TRANSFORMATION CSV → XML
 * 
 * Transforme les données CSV en format XML Prestashop
 * selon les règles de mapping définies.
 * 
 * Processus:
 * 1. Valider les données CSV
 * 2. Transformer selon le mapping
 * 3. Générer XML valide Prestashop
 */

import { XMLBuilder } from "fast-xml-parser";
import {
  PRODUCTS_FILE_MAPPING,
  COMBINATIONS_FILE_MAPPING,
  TRANSACTIONS_FILE_MAPPING,
} from "../constants/dataImportConstants";

/**
 * Service de transformation de données
 */
class CsvToXmlTransformationService {
  constructor() {
    // Initialiser le builder XML
    this.xmlBuilder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
    });
    
    // Contexte partagé entre transformations
    this.context = {};
  }

  /**
   * Étape 1 : Valider une ligne CSV
   * Vérifie que toutes les colonnes requises sont présentes
   * et que les valeurs sont valides
   */
  validateRow(row, mapping, rowIndex) {
    const errors = [];

    for (const [csvColumn, config] of Object.entries(mapping.columns)) {
      const value = row[csvColumn];

      // Vérifier colonne requise
      if (config.required && (!value || value.trim() === "")) {
        errors.push(
          `Ligne ${rowIndex}: Colonne "${csvColumn}" est requise mais vide.`
        );
        continue;
      }

      // Vérifier validation si valeur présente
      if (value && value.trim() !== "") {
        if (config.validation && !config.validation(value)) {
          errors.push(
            `Ligne ${rowIndex}: Valeur invalide pour "${csvColumn}": "${value}". ` +
            `Format attendu: ${csvColumn}`
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Étape 2 : Transformer une ligne CSV selon le mapping
   * Appliquer les transformations et les dépendances async
   */
  async transformRow(row, mapping, context, rowIndex) {
    const transformed = {};
    const errors = [];

    for (const [csvColumn, config] of Object.entries(mapping.columns)) {
      try {
        const value = row[csvColumn];

        // Si colonne vide et non requise → ignorer
        if (!value || value.trim() === "") {
          if (!config.required) {
            continue;
          }
        }

        // Appliquer la transformation
        let transformedValue = value;

        if (config.transformation) {
          if (config.async) {
            // Transformation asynchrone (appel API)
            transformedValue = await config.transformation(value, context);
          } else {
            // Transformation synchrone
            transformedValue = config.transformation(value);
          }
        }

        // Assigner au champ Prestashop
        const fieldName = config.prestashopField;
        transformed[fieldName] = transformedValue;

        // Tracer les dépendances pour contexte partagé
        if (config.dependsOn) {
          // Sauvegarder les valeurs pour les colonnes dépendantes
          context[`_${csvColumn}`] = transformedValue;
        }

      } catch (err) {
        errors.push(
          `Ligne ${rowIndex}, colonne "${csvColumn}": ${err.message}`
        );
      }
    }

    return { transformed, errors };
  }

  /**
   * Étape 3 : Encapsuler en format XML Prestashop
   * Transformer l'objet JSON en XML valide pour l'API
   */
  toXml(prestashopObject, resourceName, multiLangFields = []) {
    // Traiter les champs multilingues
    const transformedObject = { ...prestashopObject };

    for (const field of multiLangFields) {
      if (transformedObject[field]) {
        // Convertir valeur simple en structure multilingue
        transformedObject[field] = {
          language: {
            "@_id": "1", // ID langue français
            "#text": transformedObject[field],
          },
        };
      }
    }

    // Créer structure XML Prestashop
    const xmlObject = {
      prestashop: {
        [resourceName]: transformedObject,
      },
    };

    // Générer XML
    return this.xmlBuilder.build(xmlObject);
  }

  /**
   * Étape 4 : Parser le format spécial "achat" (commandes)
   * Convertir "[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"
   * en array d'articles
   */
  parseOrderItems(achatString) {
    const items = [];
    
    // Regex pour extraire les éléments : (reference;quantité;attribut)
    const regex = /\("([^"]+)";"(\d+)";"([^"]*)"\)/g;
    let match;

    while ((match = regex.exec(achatString)) !== null) {
      items.push({
        reference: match[1],
        quantity: parseInt(match[2]),
        attribute: match[3] || null,
      });
    }

    if (items.length === 0) {
      throw new Error(
        `Format "achat" invalide: "${achatString}". ` +
        `Format attendu: [(""REF"";QTY;""ATTR"")]`
      );
    }

    return items;
  }

  /**
   * Étape 5 : Valider que toutes les références croisées existent
   * Vérifier que les FK (fichier 2 → fichier 1, etc.) sont valides
   */
  async validateCrossDependencies(
    allRows,
    mapping,
    fileType,
    context
  ) {
    const errors = [];

    // Chercher les colonnes avec dépendances
    for (const [csvColumn, config] of Object.entries(mapping.columns)) {
      if (!config.dependency) continue;

      // Vérifier que chaque valeur existe en tant que FK
      for (let i = 0; i < allRows.length; i++) {
        const value = allRows[i][csvColumn];
        if (!value || value.trim() === "") continue;

        try {
          // Tenter la recherche
          if (config.transformation && config.async) {
            await config.transformation(value, context);
          }
        } catch (err) {
          errors.push(`Ligne ${i + 1}: ${err.message}`);
        }
      }
    }

    return errors;
  }

  /**
   * FONCTION PRINCIPALE : Transformer un ensemble de lignes CSV
   * 
   * Retourne:
   * - xmlDataList: Array d'objets { xml, originalData }
   * - validationErrors: Array d'erreurs
   * - stats: Statistiques {total, valid, invalid}
   */
  async transformCsvData(csvData, mapping, context = {}) {
    const results = {
      xmlDataList: [],     // XML transformés
      validationErrors: [], // Erreurs de validation
      transformationErrors: [], // Erreurs de transformation
      stats: {
        total: csvData.length,
        valid: 0,
        invalid: 0,
      },
    };

    // Partager le contexte pour toutes les transformations
    this.context = context;

    console.log(
      `[TRANSFORMATION] Début transformation de ${csvData.length} lignes...`
    );

    // Boucle sur chaque ligne
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowIndex = i + 1;

      // ÉTAPE 1 : Valider la ligne
      const validation = this.validateRow(row, mapping, rowIndex);
      if (!validation.isValid) {
        results.validationErrors.push({
          rowIndex,
          errors: validation.errors,
        });
        results.stats.invalid++;
        continue;
      }

      // ÉTAPE 2 : Transformer la ligne
      const { transformed, errors } = await this.transformRow(
        row,
        mapping,
        this.context,
        rowIndex
      );

      if (errors.length > 0) {
        results.transformationErrors.push({
          rowIndex,
          errors,
        });
        results.stats.invalid++;
        continue;
      }

      // ÉTAPE 3 : Convertir en XML
      try {
        const xml = this.toXml(
          transformed,
          mapping.resourceName,
          mapping.multiLangFields
        );

        results.xmlDataList.push({
          xml,
          originalData: row,
          transformedData: transformed,
          rowIndex,
        });

        results.stats.valid++;
      } catch (err) {
        results.transformationErrors.push({
          rowIndex,
          errors: [
            `Erreur génération XML: ${err.message}`,
          ],
        });
        results.stats.invalid++;
      }
    }

    console.log(
      `[TRANSFORMATION] Résultat: ${results.stats.valid} valides, ` +
      `${results.stats.invalid} invalides`
    );

    return results;
  }
}

export default new CsvToXmlTransformationService();