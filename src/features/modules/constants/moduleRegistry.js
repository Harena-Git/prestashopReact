export const MODULE_REGISTRY = {
  products: {
    // Champs pour la détection
    detectionFields: ["id_category_default", "price", "quantity", "reference"],
    // Champs nécessitant un formatage multilingue
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
    // Champs exclus de l'import :
    // - quantity         → read_only, géré via l'API stock_availables
    // - manufacturer_name → read_only, champ calculé
    // NB: state (0=brouillon, 1=complet) est CONSERVÉ intentionnellement :
    //     sans state=1 dans le XML, l'API crée les produits en brouillon
    //     et ils n'apparaissent pas dans le catalogue admin.
    excludeFields: ["quantity", "manufacturer_name"],
  },
  customers: {
    detectionFields: ["id_default_group", "firstname", "lastname", "email"],
    multiLangFields: [],
    // last_passwd_gen et secure_key sont générés automatiquement par PrestaShop
    excludeFields: ["last_passwd_gen", "secure_key"],
  },
  categories: {
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
  },
  // ... Ajoutez d'autres modules ici (suppliers, manufacturers, etc.)
};
