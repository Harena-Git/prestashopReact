/**
 * MODULE_REGISTRY
 *
 * Recense les modules PrestaShop utilisés dans l'import CSV.
 * Chaque entrée correspond à une ressource de l'API webservice.
 *
 * Utilisé par :
 *  - La page de nettoyage  (/admin/modules/cleanup)
 *  - La détection de module depuis les en-têtes CSV
 *  - Le rollback automatique après erreur d'import
 */
export const MODULE_REGISTRY = {
  // ─── IMPORT FICHIER 1 ────────────────────────────────────────────────────
  products: {
    label: "Produits",
    detectionFields: ["id_category_default", "price", "quantity", "reference"],
    multiLangFields: [
      "description",
      "description_short",
      "link_rewrite",
      "meta_description",
      "meta_keywords",
      "meta_title",
      "name",
      "available_now",
      "available_later",
      "delivery_in_stock",
      "delivery_out_stock",
    ],
    // quantity → read_only, géré via stock_availables
    // manufacturer_name → champ calculé
    excludeFields: ["quantity", "manufacturer_name"],
  },

  // ─── IMPORT FICHIER 2 ────────────────────────────────────────────────────
  combinations: {
    label: "Déclinaisons (combinations)",
    detectionFields: ["id_product", "price", "reference"],
    multiLangFields: [],
    excludeFields: [],
  },

  // ─── IMPORT FICHIER 3 ────────────────────────────────────────────────────
  customers: {
    label: "Clients",
    detectionFields: ["id_default_group", "firstname", "lastname", "email"],
    multiLangFields: [],
    // last_passwd_gen et secure_key sont générés automatiquement par PrestaShop
    excludeFields: ["last_passwd_gen", "secure_key"],
  },

  orders: {
    label: "Commandes",
    detectionFields: ["id_customer", "current_state", "payment"],
    multiLangFields: [],
    excludeFields: [],
  },

  addresses: {
    label: "Adresses",
    detectionFields: ["id_customer", "firstname", "lastname", "address1"],
    multiLangFields: [],
    excludeFields: [],
  },

  carts: {
    label: "Paniers (carts)",
    detectionFields: ["id_customer", "id_currency", "id_lang"],
    multiLangFields: [],
    excludeFields: [],
    // Le panier ID 1 est souvent le panier système de PrestaShop
    protectedIds: [1],
  },

  // ─── COMMUN ──────────────────────────────────────────────────────────────
  categories: {
    label: "Catégories",
    detectionFields: ["is_root_category", "name", "link_rewrite"],
    multiLangFields: [
      "name",
      "link_rewrite",
      "description",
      "meta_title",
      "meta_description",
      "meta_keywords",
    ],
    // level_depth et nb_products_recursive sont calculés automatiquement
    excludeFields: ["level_depth", "nb_products_recursive"],
    // IDs 1 (Racine) et 2 (Accueil) sont des catégories système non supprimables
    protectedIds: [1, 2],
  },
};

/**
 * Mapping : nom de fichier d'import → modules à supprimer lors du rollback
 * L'ordre respecte les contraintes FK PrestaShop (enfant avant parent)
 */
export const ROLLBACK_MODULES_BY_FILE = {
  Produits: ["combinations", "products"],
  Déclinaisons: ["combinations"],
  "Clients & Commandes": ["orders", "carts", "addresses", "customers"],
  Images: [], // pas d'endpoint bulk pour les images
};
