// Ce fichier serait à l'emplacement : src/features/products/services/product.service.js

import { fetchModuleRecord } from "../../../api/prestashop.api";

/**
 * Service pour récupérer les informations détaillées d'un produit spécifique.
 * 
 * @param {number} productId - L'ID du produit à récupérer.
 * @returns {Promise<object|null>} Un objet avec les détails du produit, ou null si non trouvé.
 */
export async function getProductDetailsService(productId) {
  try {
    console.log(`Tentative de récupération du produit avec l'ID : ${productId}`);

    // On appelle la fonction API généralisée avec le nom du module "products"
    const productData = await fetchModuleRecord("products", productId);

    if (!productData) {
      console.warn(`Le produit avec l'ID ${productId} n'a pas été trouvé.`);
      return null;
    }

    // Ici, on pourrait transformer les données si nécessaire avant de les envoyer au composant React.
    // Par exemple, extraire seulement les champs qui nous intéressent.
    const simplifiedProduct = {
      id: productData.id,
      name: productData.name.language.find(l => l['@_id'] === '1')['#text'], // Récupérer le nom en français
      price: parseFloat(productData.price),
      reference: productData.reference,
      description: productData.description.language.find(l => l['@_id'] === '1')['#text'], // Desc en français
    };

    console.log("Produit récupéré et simplifié :", simplifiedProduct);
    return simplifiedProduct;

  } catch (error) {
    console.error(`Erreur dans getProductDetailsService pour l'ID ${productId}:`, error);
    // On propage l'erreur pour que le composant React puisse l'afficher à l'utilisateur.
    throw error;
  }
}