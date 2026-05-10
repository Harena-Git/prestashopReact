import { useState, useEffect } from "react";
import { listAllProducts } from "../services/moduleListe";
import ProductSelectionList from "../components/ProductSelectionList";

/**
 * C'est notre page React pour afficher la liste des produits.
 * Elle est maintenant beaucoup plus simple !
 */
function ModuleProductList() {
  // --- États ---
  // Un "état" (state) est une mémoire pour notre composant.

  // 'products' gardera la liste de tous nos produits une fois chargée.
  const [products, setProducts] = useState([]);
  
  // 'selectedProduct' gardera le produit que l'utilisateur a cliqué dans la liste.
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // 'loading' nous dit si on est en train de charger les données.
  const [loading, setLoading] = useState(true);

  // --- Effet de chargement ---
  // useEffect est un crochet (hook) qui lance du code à un certain moment.
  // Ici, on l'utilise pour charger les données quand la page s'affiche pour la première fois.
  useEffect(() => {
    const loadData = async () => {
      console.log("Chargement des produits...");
      const productsData = await listAllProducts();
      setProducts(productsData); // On sauvegarde les produits dans notre état.
      setLoading(false); // On a fini de charger.
      console.log("Produits chargés !", productsData);
    };

    loadData();
  }, []); // Le tableau vide [] signifie : "lance ce code une seule fois au début".

  // --- Gestion de la sélection ---
  // Cette fonction sera appelée par notre composant ProductSelectionList
  // quand un utilisateur clique sur un produit.
  const handleProductSelect = (productId) => {
    // On cherche le produit cliqué dans notre liste de produits.
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product); // Et on le sauvegarde dans l'état 'selectedProduct'.
  };

  // --- Affichage (Render) ---

  // Si on est en train de charger, on affiche un message simple.
  if (loading) {
    return <div>Chargement de la liste des produits...</div>;
  }

  // Une fois chargé, on affiche notre page.
  return (
    <div>
      <h1>Liste des Produits</h1>
      <p>Voici la liste des produits récupérés depuis l'API de PrestaShop. Cliquez sur un produit pour voir ses détails.</p>
      
      <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Colonne de gauche : La liste des produits */}
        <div style={{ flex: 1 }}>
          <ProductSelectionList
            products={products}
            onSelectProduct={handleProductSelect}
            title="Produits disponibles"
          />
        </div>

        {/* Colonne de droite : Les détails du produit sélectionné */}
        <div style={{ flex: 2, border: '1px solid #eee', padding: '1rem', borderRadius: '8px' }}>
          {selectedProduct ? (
            // Si un produit est sélectionné, on affiche ses détails
            <div>
              <h2>Détails du produit</h2>
              <h3>{selectedProduct.name}</h3>
              <p><strong>Référence :</strong> {selectedProduct.reference}</p>
              <p><strong>Prix :</strong> {selectedProduct.price} €</p>
              <p><strong>Description :</strong></p>
              <p>{selectedProduct.description}</p>
            </div>
          ) : (
            // Sinon, on affiche une invitation
            <p>Sélectionnez un produit dans la liste pour voir les détails ici.</p>
          )}
        </div>

      </div>
    </div>
  );
}

export default ModuleProductList;