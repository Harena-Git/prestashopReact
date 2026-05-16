/**
 * MAPPING DONNÉES PRESTASHOP
 *
 * Ce fichier définit les transformations des colonnes CSV métier
 * vers le format Prestashop XML.
 *
 * Structure:
 * - CSV column → Prestashop field
 * - Règles de transformation (parsing, validation)
 * - Dépendances inter-fichiers (références)
 */

// ============================================================
// FICHIER 1 : PRODUITS DE BASE
// ============================================================
export const PRODUCTS_FILE_MAPPING = {
  resourceName: "products",

  // Définition des colonnes et leurs transformations
  columns: {
    date_availability_produit: {
      prestashopField: "date_add",
      transformation: (value) => {
        // Convertir DD/MM/YYYY → YYYY-MM-DD HH:MM:SS
        const [day, month, year] = value.split("/");
        return `${year}-${month}-${day} 00:00:00`;
      },
      validation: (value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value),
      required: true,
    },

    nom: {
      prestashopField: "name",
      transformation: (value) => value.trim(),
      validation: (value) => value && value.trim().length > 0,
      required: true,
      // Multi-langue : sera encapsulé en tant que <language>
      multiLang: true,
    },

    reference: {
      prestashopField: "reference",
      transformation: (value) => value.trim().toUpperCase(),
      validation: (value) => /^[A-Z0-9_]+$/.test(value),
      required: true,
      // Clé unique pour les jotures fichier 2 et 3
      uniqueKey: true,
    },

    prix_ttc: {
      prestashopField: "price",
      transformation: (value) => {
        // Convertir "12,5" → 12.50 (virgule française → point)
        return parseFloat(value.replace(",", ".")).toFixed(2);
      },
      validation: (value) => {
        const num = parseFloat(value.replace(",", "."));
        return !isNaN(num) && num >= 0;
      },
      required: true,
    },

    prix_achat: {
      prestashopField: "wholesale_price",
      transformation: (value) => {
        // Convertir prix d'achat
        return parseFloat(value.replace(",", ".")).toFixed(2);
      },
      validation: (value) => {
        const num = parseFloat(value.replace(",", "."));
        return !isNaN(num) && num >= 0;
      },
      required: false,
    },

    taxe: {
      prestashopField: "id_tax_rules_group",
      transformation: async (value, context) => {
        // Transformer taux % en ID groupe taxe Prestashop
        // Exemple: "11.65%" → chercher/créer groupe avec ce taux
        // Retourner l'ID du groupe
        return await context.getTaxGroupIdByRate(value);
      },
      validation: (value) => /^\d+([.,]\d{2})?%$/.test(value),
      required: true,
      // Dépend du contexte (appel API)
      async: true,
    },

    categorie: {
      prestashopField: "id_category_default",
      transformation: async (value, context) => {
        // Transformer nom catégorie en ID
        // Exemple: "Akanjo" → chercher/créer et retourner l'ID
        return await context.getCategoryIdByName(value);
      },
      validation: (value) => value && value.trim().length > 0,
      required: true,
      async: true,
    },
  },

  // Champs multilingues
  multiLangFields: ["name"],

  // Champs à exclure
  excludeFields: ["quantity"], // Stock géré via ps_stock_available

  // ID de la langue par défaut
  defaultLanguageId: 1, // 1 = Français
};

// ============================================================
// FICHIER 2 : DÉCLINAISONS & STOCK
// ============================================================
export const COMBINATIONS_FILE_MAPPING = {
  resourceName: "combinations", // API Prestashop

  columns: {
    reference: {
      prestashopField: "id_product",
      transformation: async (value, context) => {
        // Chercher ID produit via reference (FK vers fichier 1)
        const productId = await context.getProductIdByReference(value);
        if (!productId) {
          throw new Error(
            `Produit avec reference "${value}" introuvable. ` +
              `Assurez-vous que le fichier 1 a été importé d'abord.`,
          );
        }
        return productId;
      },
      validation: (value) => /^[A-Z0-9_]+$/.test(value),
      required: true,
      async: true,
      dependency: "fichier1", // Dépend de fichier 1
    },

    specificité: {
      prestashopField: "id_attribute_group",
      transformation: async (value, context) => {
        // Si valeur vide → produit sans attribut
        if (!value || value.trim() === "") {
          return null;
        }

        // Chercher/créer groupe d'attribut
        // Exemple: "taille" → ID groupe
        return await context.getOrCreateAttributeGroup(value);
      },
      validation: (value) => !value || value.trim().length > 0,
      required: false,
      async: true,
    },

    karazany: {
      prestashopField: "id_attribute",
      transformation: async (value, context) => {
        // Si valeur vide → pas d'attribut
        if (!value || value.trim() === "") {
          return null;
        }

        // Chercher/créer attribut avec sa valeur
        // Nécessite le groupe d'attribut (specificité)
        // Exemple: "ngoza" → ID attribut
        return await context.getOrCreateAttribute(
          value,
          context.getCurrentAttributeGroupId(),
        );
      },
      validation: (value) => !value || value.trim().length > 0,
      required: false,
      async: true,
      dependsOn: ["specificité"], // Dépend du groupe attribut
    },

    stock_initial: {
      prestashopField: "quantity",
      transformation: (value) => {
        // Convertir en nombre entier
        const qty = parseInt(value);
        if (isNaN(qty)) {
          throw new Error(
            `Quantité invalide: "${value}". Attendu: nombre entier.`,
          );
        }
        return qty;
      },
      validation: (value) => {
        const num = parseInt(value, 10);
        return /^\d+$/.test(value) && num >= 0;
      },
      required: true,
    },

    prix_vente_ttc: {
      prestashopField: "price",
      transformation: (value) => {
        // Si valeur vide → utiliser prix produit de base
        if (!value || value.trim() === "") {
          return null;
        }

        // Prix spécifique à la déclinaison
        return parseFloat(value.replace(",", ".")).toFixed(2);
      },
      validation: (value) => {
        if (!value || value.trim() === "") return true;
        const num = parseFloat(value.replace(",", "."));
        return !isNaN(num) && num >= 0;
      },
      required: false,
    },
  },

  multiLangFields: [],
  excludeFields: [],
  defaultLanguageId: 1,
};

// ============================================================
// FICHIER 3 : CLIENTS & COMMANDES (un seul fichier, deux ressources)
// ============================================================

/**
 * Fichier 3 contient CLIENTS ET COMMANDES sur les mêmes lignes
 * Le service transforme chaque ligne en 2 ressources:
 * 1. Customer (client)
 * 2. Order (commande)
 */
export const TRANSACTIONS_FILE_MAPPING = {
  resourceName: "transactions", // Type spécial: génère customers + orders

  columns: {
    // ===== DONNÉES CLIENT =====
    email: {
      prestashopField: "email",
      transformation: (value) => value.trim().toLowerCase(),
      validation: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      required: true,
      resourceType: "customer", // Appartient à la ressource customer
      uniqueKey: true,
    },

    nom: {
      prestashopField: "lastname",
      transformation: (value) => value.trim(),
      validation: (value) => value && value.trim().length > 0,
      required: true,
      resourceType: "customer",
    },

    pwd: {
      prestashopField: "passwd",
      transformation: (value) => value,
      validation: (value) => value && value.trim().length > 0,
      required: true,
      resourceType: "customer",
      sensitive: true,
    },

    adresse: {
      prestashopField: "address_line_1",
      transformation: (value) => value.trim(),
      validation: (value) => value && value.trim().length > 0,
      required: true,
      resourceType: "customer",
    },

    // ===== DONNÉES COMMANDE =====
    date: {
      prestashopField: "date_add",
      transformation: (value) => {
        // Convertir DD/MM/YYYY → YYYY-MM-DD HH:MM:SS
        const [day, month, year] = value.split("/");
        return `${year}-${month}-${day} 00:00:00`;
      },
      validation: (value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value),
      required: true,
      resourceType: "order", // Appartient à la ressource order
    },

    etat: {
      prestashopField: "current_state",
      transformation: async (value, context) => {
        const val = (value || "").trim().toLowerCase();
        let label = val;

        // Normalisation des labels
        if (val === "") label = "dans le panier";
        if (val === "paiement effectué") label = "paiement accepté";

        // Utiliser le mapping d'état du contexte s'il existe (pour TransactionalDataImportService)
        if (context && typeof context.getOrderStateIdByLabel === "function") {
          return await context.getOrderStateIdByLabel(label);
        }

        // Fallback sur le mapping local si pas de contexte
        const mapping = {
          "dans le panier": 1,
          annulé: 6,
          "paiement accepté": 2,
        };
        return mapping[label] || 1;
      },
      validation: (value) => {
        const val = (value || "").trim().toLowerCase();
        const allowed = [
          "",
          "paiement accepté",
          "paiement effectué",
          "annulé",
          "dans le panier",
        ];
        return allowed.includes(val);
      },
      required: false,
      resourceType: "order",
      async: true,
      stateMapping: {
        "dans le panier": 1,
        annulé: 6,
        "paiement accepté": 2,
      },
    },

    achat: {
      prestashopField: "order_details",
      transformation: async (value, context) => {
        // Parser format spécial : "[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"
        return await context.parseOrderItems(value);
      },
      validation: (value) => /^\[\(/.test(value),
      required: true,
      resourceType: "order",
      async: true,
      isComplexFormat: true,
    },
  },

  multiLangFields: [],
  excludeFields: [],
  defaultLanguageId: 1,
};

// ============================================================
// CONFIGURATION GÉNÉRALE
// ============================================================

export const IMPORT_CONFIG = {
  // Ordre d'importation des fichiers (dépendances)
  // Fichier 3 contient à la fois customers ET orders sur les mêmes lignes
  importOrder: [
    "fichier1_products", // Produits d'abord
    "fichier2_combinations", // Puis déclinaisons (dépend fichier1)
    "fichier3_transactions", // Clients & Commandes (un seul fichier, 2 ressources)
  ],

  // Configurations de validation
  validation: {
    throwOnFirstError: false, // Continuer même s'il y a erreur
    maxErrorsPerFile: 100, // Limite d'erreurs avant abandon
    validateBeforeImport: true, // Passer en revue avant d'insérer
  },

  // Configuration API Prestashop
  prestashop: {
    defaultLanguageId: 1, // Français
    defaultShopId: 1, // Boutique par défaut
    defaultCountryId: 136, // Madagascar
  },

  // Configuration transactionnel
  transaction: {
    // Toute erreur = rollback complet (All or Nothing)
    atomicTransaction: true,
    logBeforeInsert: true, // Logger les transformations avant insertion
  },
};
