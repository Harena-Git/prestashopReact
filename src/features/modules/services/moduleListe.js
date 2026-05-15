import {
  fetchModuleIds,
  fetchModuleRecord,
  PrestashopClient,
} from "../../../api/prestashop.api";

/**
 * Récupère les IDs de tous les produits, puis les détails de chaque produit.
 * C'est une approche simple, mais qui peut être lente si vous avez beaucoup de produits.
 *
 * @returns {Promise<object[]>} Une liste d'objets produits.
 */
export async function listAllProducts() {
  try {
    // 1. On récupère la liste de tous les numéros (ID) de produits.
    const productIds = await fetchModuleIds("products");

    // 2. Pour chaque numéro, on va chercher les détails complets.
    // Promise.all est une technique pour lancer plusieurs requêtes en même temps,
    // c'est beaucoup plus rapide que de les faire une par une.
    const products = await Promise.all(
      productIds.map((id) => getProductDetailsService(id)),
    );

    // 3. On retourne la liste des produits qui ont bien été trouvés (on filtre les "null").
    return products.filter((p) => p !== null);
  } catch (error) {
    console.error("Erreur en listant les produits:", error);
    return []; // On retourne une liste vide en cas de problème.
  }
}

/**
 * Récupère toutes les catégories pour le filtre de recherche.
 */
export async function listAllCategories() {
  try {
    const client = new PrestashopClient();
    // On utilise display=full pour avoir les noms des catégories directement
    const data = await client.get("categories?display=full");

    // PrestaShop retourne les données dans un objet 'categories'
    // On s'assure que c'est un tableau
    const categoriesRaw = data.categories
      ? Array.isArray(data.categories)
        ? data.categories
        : [data.categories]
      : [];

    // On simplifie pour l'UI
    return categoriesRaw.map((cat) => ({
      id: cat.id,
      name: Array.isArray(cat.name?.language)
        ? cat.name.language.find((l) => l["@_id"] === "1")?.["#text"]
        : cat.name?.language?.["#text"] || "Sans nom",
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    return [];
  }
}

/**
 * Service pour récupérer les informations détaillées d'un produit spécifique.
 *
 * @param {number} productId - L'ID du produit à récupérer.
 * @returns {Promise<object|null>} Un objet avec les détails du produit, ou null si non trouvé.
 */
export async function getProductDetailsService(productId) {
  try {
    // On appelle la fonction API généralisée avec le nom du module "products"
    const productData = await fetchModuleRecord("products", productId);

    if (!productData) {
      return null;
    }

    // --- CORRECTIF ---
    // On sécurise l'accès aux champs multilingues.
    // On transforme le champ en tableau s'il n'en est pas un, puis on cherche la langue.
    const getName = (field) => {
      if (!field || !field.language) return "Nom non disponible";
      const languages = Array.isArray(field.language)
        ? field.language
        : [field.language];
      const lang = languages.find((l) => l["@_id"] === "1");
      return lang ? lang["#text"] : "Nom non trouvé";
    };

    // On transforme les données brutes en un objet simple et facile à utiliser.
    const simplifiedProduct = {
      id: productData.id,
      name: getName(productData.name),
      price: parseFloat(productData.price),
      reference: productData.reference,
      description: getName(productData.description),
      categoryId: productData.id_category_default, // Ajout du categoryId
    };

    return simplifiedProduct;
  } catch (error) {
    console.error(
      `Erreur dans getProductDetailsService pour l'ID ${productId}:`,
      error,
    );
    throw error;
  }
}
