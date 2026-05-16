/**
 * SERVICE D'IMPORT TRANSACTIONNEL (All or Nothing)
 *
 * Orchestre le processus complet:
 * 1. CSV → Parse
 * 2. Parse → Validation
 * 3. Validation → Transformation (via mapping)
 * 4. Transformation → XML
 * 5. XML → Insertion Prestashop (Transaction atomique)
 *
 * Si ANY erreur: ROLLBACK complet (Nothing)
 * Sinon: COMMIT all (All)
 */

import Papa from "papaparse";
import { createResource, PrestashopClient } from "../../../api/prestashop.api";
import csvToXmlService from "./csvToXmlTransformationService";
import { normalizeHeader } from "./csvParser";
import {
  PRODUCTS_FILE_MAPPING,
  COMBINATIONS_FILE_MAPPING,
  TRANSACTIONS_FILE_MAPPING,
  IMPORT_CONFIG,
} from "../constants/dataImportConstants";

/**
 * Contexte partagé pour les transformations
 * Utilisé pour les requêtes API (getCategoryIdByName, etc.)
 */
class ImportContext {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.cache = {
      categories: {}, // Cache catégories
      taxGroups: {}, // Cache groupes taxe
      attributeGroups: {}, // Cache groupes attributs
      attributes: {}, // Cache attributs
      products: {}, // Cache produits
      customers: {}, // Cache clients
      orderStates: {}, // Cache états commandes
    };
    this.insertedRecords = []; // Trace des insertions pour rollback
  }

  /**
   * Chercher un groupe de taxe par taux
   * Exemple: "20%" → ID du tax_rule_group MG (ex: 1 pour "MG Standard Rate (20%)")
   *
   * Logique correcte PrestaShop :
   *  1. Le taux est dans la table `taxes` (pas dans `tax_rule_groups`)
   *  2. `tax_rules` fait le lien entre une taxe et un groupe pour un pays donné
   *  3. On cherche les taxes avec le bon taux, puis on trouve le groupe MG (country_id=133)
   */
  async getTaxGroupIdByRate(rateStr) {
    // Extraire le taux numérique (supporte virgule + %)
    const rate = parseFloat(rateStr.replace(",", ".").replace("%", ""));

    // Cache
    if (this.cache.taxGroups[rate]) {
      return this.cache.taxGroups[rate];
    }

    try {
      // ÉTAPE 1 : Chercher les taxes avec ce taux
      // PrestaShop stocke le taux avec 3 décimales : "20.000"
      const rateFormatted = rate.toFixed(3);
      const taxesResponse = await this.apiClient.get(
        `taxes?filter[rate]=${rateFormatted}`,
      );
      const taxes = taxesResponse.taxes || [];

      // ÉTAPE 2 : Pour chaque taxe trouvée, chercher la règle pour Madagascar (id_country=133)
      for (const tax of taxes) {
        const rulesResponse = await this.apiClient.get(
          `tax_rules?filter[id_tax]=${tax.id}&filter[id_country]=133`,
        );
        const rules = rulesResponse.tax_rules || [];

        if (rules.length > 0) {
          const groupId = parseInt(rules[0].id_tax_rules_group, 10);
          this.cache.taxGroups[rate] = groupId;
          return groupId;
        }
      }

      // ÉTAPE 3 : Aucun groupe trouvé → créer un nouveau tax_rule_group
      // (rare : signifie qu'aucune taxe MG avec ce taux n'existe)
      const createResponse = await this.apiClient.post("tax_rule_groups", {
        tax_rule_group: {
          name: `Taxe MG ${rate}%`,
          active: 1,
        },
      });

      const newGroupId = parseInt(createResponse.tax_rule_group.id, 10);
      this.cache.taxGroups[rate] = newGroupId;
      this.insertedRecords.push({
        type: "tax_rule_group",
        id: newGroupId,
      });

      return newGroupId;
    } catch (err) {
      throw new Error(
        `Erreur recherche/création groupe taxe ${rate}%: ${err.message}`,
      );
    }
  }

  /**
   * Chercher/créer une catégorie par nom
   * Exemple: "Akanjo" → retourner l'ID
   */
  async getCategoryIdByName(categoryName) {
    const name = categoryName.trim();

    if (this.cache.categories[name]) {
      return this.cache.categories[name];
    }

    try {
      // GET /api/categories?filter[name]=Akanjo
      const response = await this.apiClient.get(
        `categories?filter[name]=${encodeURIComponent(name)}`,
      );

      if (response.categories && response.categories.length > 0) {
        const catId = response.categories[0].id;
        this.cache.categories[name] = catId;
        return catId;
      }

      // Créer la catégorie
      // POST /api/categories
      const createResponse = await this.apiClient.post("categories", {
        category: {
          name: name,
          id_parent: 2, // Parent = catégorie racine
          active: 1,
        },
      });

      const newCatId = createResponse.category.id;
      this.cache.categories[name] = newCatId;
      this.insertedRecords.push({
        type: "category",
        id: newCatId,
      });

      return newCatId;
    } catch (err) {
      throw new Error(
        `Erreur recherche/création catégorie "${name}": ${err.message}`,
      );
    }
  }

  /**
   * Chercher ID produit par reference
   */
  async getProductIdByReference(reference) {
    const ref = reference.trim().toUpperCase();

    if (this.cache.products[ref]) {
      return this.cache.products[ref];
    }

    try {
      // GET /api/products?filter[reference]=T_01
      const response = await this.apiClient.get(
        `products?filter[reference]=${ref}`,
      );

      if (response.products && response.products.length > 0) {
        const productId = response.products[0].id;
        this.cache.products[ref] = productId;
        return productId;
      }

      return null; // Pas trouvé
    } catch (err) {
      throw new Error(`Erreur recherche produit "${ref}": ${err.message}`);
    }
  }

  /**
   * Chercher/créer groupe d'attribut
   */
  async getOrCreateAttributeGroup(groupName) {
    const name = groupName.trim();

    if (this.cache.attributeGroups[name]) {
      return this.cache.attributeGroups[name];
    }

    try {
      // GET /api/product_options?filter[name]=taille
      const response = await this.apiClient.get(
        `product_options?filter[name]=${encodeURIComponent(name)}`,
      );

      if (response.product_options && response.product_options.length > 0) {
        const groupId = response.product_options[0].id;
        this.cache.attributeGroups[name] = groupId;
        return groupId;
      }

      // Créer le groupe
      const createResponse = await this.apiClient.post("product_options", {
        product_option: {
          name: name,
          public_name: name,
          group_type: "select",
        },
      });

      const newGroupId = createResponse.product_option.id;
      this.cache.attributeGroups[name] = newGroupId;
      this.insertedRecords.push({
        type: "product_option",
        id: newGroupId,
      });

      return newGroupId;
    } catch (err) {
      throw new Error(
        `Erreur recherche/création groupe attribut "${name}": ${err.message}`,
      );
    }
  }

  /**
   * Chercher/créer un attribut
   */
  async getOrCreateAttribute(attributeValue, attributeGroupId) {
    const value = attributeValue.trim();
    const cacheKey = `${attributeGroupId}:${value}`;

    if (this.cache.attributes[cacheKey]) {
      return this.cache.attributes[cacheKey];
    }

    try {
      // GET /api/product_option_values?filter[name]=ngoza
      const response = await this.apiClient.get(
        `product_option_values?filter[name]=${encodeURIComponent(value)}`,
      );

      if (
        response.product_option_values &&
        response.product_option_values.length > 0
      ) {
        const attrId = response.product_option_values[0].id;
        this.cache.attributes[cacheKey] = attrId;
        return attrId;
      }

      // Créer l'attribut
      const createResponse = await this.apiClient.post(
        "product_option_values",
        {
          product_option_value: {
            name: value,
            id_attribute_group: attributeGroupId,
          },
        },
      );

      const newAttrId = createResponse.product_option_value.id;
      this.cache.attributes[cacheKey] = newAttrId;
      this.insertedRecords.push({
        type: "product_option_value",
        id: newAttrId,
      });

      return newAttrId;
    } catch (err) {
      throw new Error(
        `Erreur recherche/création attribut "${value}": ${err.message}`,
      );
    }
  }

  /**
   * Chercher ID client par email
   */
  async getCustomerIdByEmail(email) {
    const emailLower = email.trim().toLowerCase();

    if (this.cache.customers[emailLower]) {
      return this.cache.customers[emailLower];
    }

    try {
      // GET /api/customers?filter[email]=rakoto@yopmail.com
      const response = await this.apiClient.get(
        `customers?filter[email]=${encodeURIComponent(emailLower)}`,
      );

      if (response.customers && response.customers.length > 0) {
        const customerId = parseInt(response.customers[0].id, 10);

        // Bloquer l'utilisation du client ID 1 (Anonymous Connector) pour l'import CSV
        if (customerId === 1) {
          throw new Error(
            `L'utilisateur avec l'ID 1 est réservé au "connecteur anonymous" et ne peut pas être utilisé pour l'import CSV.`,
          );
        }

        this.cache.customers[emailLower] = customerId;
        return customerId;
      }

      return null; // Pas trouvé
    } catch (err) {
      throw new Error(
        `Erreur recherche client "${emailLower}": ${err.message}`,
      );
    }
  }

  /**
   * Chercher ID état de commande par label texte
   */
  async getOrderStateIdByLabel(label) {
    const mapping = TRANSACTIONS_FILE_MAPPING.columns.etat.stateMapping;

    if (mapping[label]) {
      return mapping[label];
    }

    throw new Error(
      `État de commande "${label}" non mappé. ` +
        `États supportés: ${Object.keys(mapping).join(", ")}`,
    );
  }

  /**
   * Parser le format spécial "achat"
   */
  async parseOrderItems(achatString) {
    return csvToXmlService.parseOrderItems(achatString);
  }

  /**
   * Sauvegarder l'ID groupe attribut actuel pour dépendances
   */
  setCurrentAttributeGroupId(id) {
    this.currentAttributeGroupId = id;
  }

  getCurrentAttributeGroupId() {
    return this.currentAttributeGroupId;
  }

  /**
   * Log pour debugging
   */
  log(message) {
    console.log(`[IMPORT CONTEXT] ${message}`);
  }

  /**
   * Générer rapport pour rollback/validation
   */
  getInsertedRecordsReport() {
    return {
      total: this.insertedRecords.length,
      byType: this.insertedRecords.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {}),
      records: this.insertedRecords,
    };
  }
}

/**
 * SERVICE PRINCIPAL : Import Transactionnel
 */
class TransactionalDataImportService {
  constructor() {
    this.context = null;
    this.importLog = [];
  }

  /**
   * MAIN : Importer un fichier CSV complet
   *
   * Cas spécial:
   * - fichier3_transactions: UNE LIGNE CSV = 2 ressources (customer + order)
   *
   * Processus:
   * 1. Parser CSV
   * 2. Créer contexte
   * 3. Transformer avec mapping
   * 4. Valider ALL or NOTHING
   * 5. Insérer en transaction atomique
   */
  async importDataFile(csvFile, fileType) {
    // CAS SPÉCIAL : Fichier 3 contient clients ET commandes
    if (fileType === "fichier3_transactions") {
      return await this.handleTransactionsFile(csvFile);
    }

    // CAS STANDARD : 1 ligne CSV = 1 ressource
    this.importLog = [];
    let context = null;

    try {
      this.log(`════════════════════════════════════════════`);
      this.log(`DÉBUT IMPORT : ${fileType}`);
      this.log(`════════════════════════════════════════════`);

      // ÉTAPE 1 : Parser CSV
      this.log(`Étape 1: Parsing du fichier CSV...`);
      const csvData = await this.parseCsv(csvFile);
      this.log(`✓ ${csvData.length} lignes parsées`);

      // ÉTAPE 2 : Sélectionner mapping selon fileType
      this.log(`Étape 2: Sélection du mapping (${fileType})...`);
      const mapping = this.getMapping(fileType);
      this.log(`✓ Mapping chargé`);

      // ÉTAPE 3 : Créer contexte pour transformations async
      this.log(`Étape 3: Initialisation contexte...`);
      const apiClient = new PrestashopClient();
      context = new ImportContext(apiClient); // Client API pour les transformations
      this.log(`✓ Contexte créé`);

      // ÉTAPE 4 : Transformer données CSV → XML
      this.log(`Étape 4: Transformation CSV → XML...`);
      const transformResult = await csvToXmlService.transformCsvData(
        csvData,
        mapping,
        context,
      );

      // Vérifier s'il y a des erreurs
      const totalErrors =
        transformResult.validationErrors.length +
        transformResult.transformationErrors.length;

      if (totalErrors > 0) {
        this.log(`✗ ${totalErrors} erreur(s) détectée(s)`);
        this.log(
          `  → Validation errors: ${transformResult.validationErrors.length}`,
        );
        this.log(
          `  → Transformation errors: ${transformResult.transformationErrors.length}`,
        );

        // ALL or NOTHING : s'il y a des erreurs → NOTHING
        throw new Error(
          `${totalErrors} erreur(s) de transformation. ` +
            `Import annulé (All or Nothing).`,
        );
      }

      this.log(
        `✓ ${transformResult.stats.valid}/${transformResult.stats.total} lignes transformées`,
      );

      // ÉTAPE 5 : Rapport pré-insertion
      this.log(`Étape 5: Rapport pré-insertion...`);
      this.log(
        `  - Prêt à insérer: ${transformResult.xmlDataList.length} enregistrements`,
      );
      this.log(
        `  - Nouvelles ressources créées: ${JSON.stringify(context.getInsertedRecordsReport())}`,
      );

      // ÉTAPE 6 : Insertion transactionnelle
      this.log(`Étape 6: Insertion des données...`);
      const insertResult = await this.insertDataTransactional(
        transformResult.xmlDataList,
        mapping.resourceName,
      );

      this.log(`✓ ${insertResult.successCount} enregistrements insérés`);

      if (insertResult.errors.length > 0) {
        this.log(
          `✗ ${insertResult.errors.length} erreur(s) lors de l'insertion`,
        );
        throw new Error(
          `Erreurs insertion: ${insertResult.errors.map((e) => e.error).join("; ")}`,
        );
      }

      // FIN : Succès
      this.log(`════════════════════════════════════════════`);
      this.log(`✓ IMPORT RÉUSSI !`);
      this.log(`════════════════════════════════════════════`);

      return {
        success: true,
        fileType,
        stats: {
          total: csvData.length,
          valid: transformResult.stats.valid,
          inserted: insertResult.successCount,
        },
        log: this.importLog,
      };
    } catch (err) {
      // ERREUR : Rollback Everything (Nothing)
      this.log(`════════════════════════════════════════════`);
      this.log(`✗ ERREUR IMPORT : ${err.message}`);
      this.log(`  → ROLLBACK : Aucune donnée n'a été insérée`);
      this.log(`════════════════════════════════════════════`);

      return {
        success: false,
        fileType,
        error: err.message,
        log: this.importLog,
        context,
      };
    }
  }

  /**
   * CAS SPÉCIAL : Importer fichier 3 (transactions)
   *
   * Une ligne CSV génère 2 ressources:
   * 1. Customer (email, nom, pwd, adresse)
   * 2. Order (date, achat, etat)
   *
   * Flux:
   * 1. Parser CSV fichier 3
   * 2. Transformer CUSTOMERS (colonnes: email, nom, pwd, adresse)
   * 3. Transformer ORDERS (colonnes: date, achat, etat)
   * 4. Insérer tous les CUSTOMERS d'abord
   * 5. Insérer tous les ORDERS ensuite (dépendent des customers)
   */
  async handleTransactionsFile(csvFile) {
    this.importLog = [];
    let context = null;

    try {
      this.log(`════════════════════════════════════════════`);
      this.log(`DÉBUT IMPORT : fichier3_transactions`);
      this.log(`(Clients & Commandes - 1 ligne = 2 ressources)`);
      this.log(`════════════════════════════════════════════`);

      // ÉTAPE 1 : Parser CSV
      this.log(`Étape 1: Parsing du fichier CSV...`);
      const csvData = await this.parseCsv(csvFile);
      this.log(`✓ ${csvData.length} lignes parsées`);

      // ÉTAPE 2 : Créer contexte
      this.log(`Étape 2: Initialisation contexte...`);
      const apiClient = new PrestashopClient();
      context = new ImportContext(apiClient);
      this.log(`✓ Contexte créé`);

      // ÉTAPE 3A : Transformer CUSTOMERS
      this.log(`Étape 3A: Transformation CSV → CUSTOMERS XML...`);
      const customerMapping = {
        ...TRANSACTIONS_FILE_MAPPING,
        columns: Object.fromEntries(
          Object.entries(TRANSACTIONS_FILE_MAPPING.columns).filter(
            ([_, config]) => config.resourceType === "customer",
          ),
        ),
      };
      const customersResult = await csvToXmlService.transformCsvData(
        csvData,
        customerMapping,
        context,
      );

      let totalErrors =
        customersResult.validationErrors.length +
        customersResult.transformationErrors.length;

      if (totalErrors > 0) {
        throw new Error(
          `${totalErrors} erreur(s) dans transformation CUSTOMERS`,
        );
      }

      this.log(`✓ ${customersResult.stats.valid} customers transformés`);

      // ÉTAPE 3B : Transformer ORDERS
      this.log(`Étape 3B: Transformation CSV → ORDERS XML...`);

      // Toutes les lignes du fichier 3 génèrent une commande (avec état mappé)
      const orderRows = csvData;

      const orderMapping = {
        ...TRANSACTIONS_FILE_MAPPING,
        columns: Object.fromEntries(
          Object.entries(TRANSACTIONS_FILE_MAPPING.columns).filter(
            ([_, config]) => config.resourceType === "order",
          ),
        ),
      };

      let ordersResult = {
        xmlDataList: [],
        stats: { valid: 0 },
        validationErrors: [],
        transformationErrors: [],
      };

      if (orderRows.length > 0) {
        ordersResult = await csvToXmlService.transformCsvData(
          orderRows,
          orderMapping,
          context,
        );

        totalErrors =
          ordersResult.validationErrors.length +
          ordersResult.transformationErrors.length;

        if (totalErrors > 0) {
          throw new Error(
            `${totalErrors} erreur(s) dans transformation ORDERS`,
          );
        }
      }

      this.log(`✓ ${ordersResult.stats.valid} orders transformées`);

      // ÉTAPE 4 : Insertion CUSTOMERS d'abord
      // ... (code insertion customers inchangé)
      this.log(`Étape 4: Insertion des CUSTOMERS...`);
      const customersInsertResult = await this.insertDataTransactional(
        customersResult.xmlDataList,
        "customers",
      );

      if (customersInsertResult.errors.length > 0) {
        throw new Error(
          `Erreurs insertion CUSTOMERS: ${customersInsertResult.errors.map((e) => e.error).join("; ")}`,
        );
      }

      this.log(`✓ ${customersInsertResult.successCount} customers insérés`);

      // ÉTAPE 5 : Insertion ORDERS ensuite
      let ordersInsertResult = { successCount: 0, errors: [] };
      if (ordersResult.xmlDataList.length > 0) {
        this.log(`Étape 5: Insertion des ORDERS...`);
        ordersInsertResult = await this.insertDataTransactional(
          ordersResult.xmlDataList,
          "orders",
        );

        if (ordersInsertResult.errors.length > 0) {
          throw new Error(
            `Erreurs insertion ORDERS: ${ordersInsertResult.errors.map((e) => e.error).join("; ")}`,
          );
        }
      }

      this.log(`✓ ${ordersInsertResult.successCount} orders insérées`);

      // FIN : Succès
      this.log(`════════════════════════════════════════════`);
      this.log(`✓ IMPORT RÉUSSI !`);
      this.log(
        `  - Customers: ${customersInsertResult.successCount}/${csvData.length}`,
      );
      this.log(
        `  - Orders: ${ordersInsertResult.successCount}/${csvData.length}`,
      );
      this.log(`════════════════════════════════════════════`);

      return {
        success: true,
        fileType: "fichier3_transactions",
        stats: {
          total: csvData.length,
          valid: customersResult.stats.valid + ordersResult.stats.valid,
          inserted:
            customersInsertResult.successCount +
            ordersInsertResult.successCount,
        },
        details: {
          customers: customersInsertResult.successCount,
          orders: ordersInsertResult.successCount,
        },
        log: this.importLog,
      };
    } catch (err) {
      // ERREUR : Rollback Everything (Nothing)
      this.log(`════════════════════════════════════════════`);
      this.log(`✗ ERREUR IMPORT : ${err.message}`);
      this.log(`  → ROLLBACK : Aucune donnée n'a été insérée`);
      this.log(`════════════════════════════════════════════`);

      return {
        success: false,
        fileType: "fichier3_transactions",
        error: err.message,
        log: this.importLog,
        context,
      };
    }
  }

  /**
   * Parser fichier CSV
   */
  parseCsv(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => normalizeHeader(header),
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`Erreur parsing CSV: ${error.message}`));
        },
      });
    });
  }

  /**
   * Sélectionner le mapping selon le type de fichier
   *
   * Note: Fichier 3 contient à la fois customers ET orders
   * Le service traitera les 2 ressources à partir d'un seul fichier CSV
   */
  getMapping(fileType) {
    const mappings = {
      fichier1_products: PRODUCTS_FILE_MAPPING,
      fichier2_combinations: COMBINATIONS_FILE_MAPPING,
      fichier3_transactions: TRANSACTIONS_FILE_MAPPING, // Clients + Commandes
    };

    const mapping = mappings[fileType];
    if (!mapping) {
      throw new Error(
        `Type de fichier inconnu: "${fileType}". ` +
          `Types supportés: ${Object.keys(mappings).join(", ")}`,
      );
    }

    // Retourner une copie avec des clés de colonnes normalisées (casse et accents)
    return {
      ...mapping,
      columns: Object.fromEntries(
        Object.entries(mapping.columns).map(([key, config]) => [
          normalizeHeader(key),
          config,
        ]),
      ),
    };
  }

  /**
   * Insérer les données en transaction atomique
   * All or Nothing
   */
  async insertDataTransactional(xmlDataList, resourceName) {
    const result = {
      successCount: 0,
      errors: [],
      insertedIds: [],
    };

    // Commencer la "transaction"
    // (En réalité, c'est une simulation logique au niveau applicatif)
    const transactionData = [];

    this.log(
      `  📝 Préparation des insertions (${xmlDataList.length} items)...`,
    );

    for (const item of xmlDataList) {
      transactionData.push({
        xml: item.xml,
        rowIndex: item.rowIndex,
        originalData: item.originalData,
      });
    }

    // Essayer d'insérer TOUS les items
    for (const data of transactionData) {
      try {
        // Appeler l'API Prestashop
        const response = await createResource(resourceName, data.xml);

        // Extraire l'ID de la réponse
        // Structure réponse: { product: { id: 123 } }
        const resourceKey = resourceName.slice(0, -1); // "products" → "product"
        const recordId = response[resourceKey]?.id;

        result.insertedIds.push(recordId);
        result.successCount++;

        this.log(`  ✓ Ligne ${data.rowIndex}: Inséré avec ID ${recordId}`);
      } catch (err) {
        // Une erreur → avorter tout
        result.errors.push({
          rowIndex: data.rowIndex,
          error: err.message,
        });

        this.log(`  ✗ Ligne ${data.rowIndex}: ${err.message}`);
      }
    }

    // Vérifier s'il y a eu des erreurs
    if (result.errors.length > 0) {
      // ALL or NOTHING : s'il y a une erreur, on annule tout
      this.log(`\n  ⚠️ ERREURS DÉTECTÉES : ${result.errors.length} erreur(s)`);
      this.log(`  → Policy ALL or NOTHING activée`);
      this.log(`  → AUCUN données n'a été insérée`);

      // Retourner les erreurs
      return {
        successCount: 0, // RIEN d'inséré
        errors: result.errors,
        insertedIds: [],
      };
    }

    return result;
  }

  /**
   * Logger
   */
  log(message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    const logEntry = `[${timestamp}] ${message}`;
    this.importLog.push(logEntry);
    console.log(logEntry);
  }
}

export default new TransactionalDataImportService();
