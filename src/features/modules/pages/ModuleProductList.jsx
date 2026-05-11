import { useState, useEffect } from "react";
import { listAllProducts } from "../services/moduleListe";
import ProductSelectionList from "../components/ProductSelectionList";
import { deleteModuleRecord } from "../../../api/prestashop.api";

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

  const [isDeleting, setIsDeleting] = useState(false); // Pour gérer l'état pendant la suppression
  const [message, setMessage] = useState("");  // Pour afficher succès/erreur
  const [messageType, setMessageType] = useState("");  // "success" ou "error"

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

  // fonrtion @ ilay suppression :
  const handleDeleteProduct = async (productId) => {
    // 1. Demander une confirmation (éviter les suppressions accidentelles)
    const confirmDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce produit ?\nCette action est irréversible."
    );
    
    if (!confirmDelete) {
      return; // L'utilisateur a annulé
    }

    try {
      // 2. Activer l'état "en cours de suppression"
      setIsDeleting(true);
      setMessage("");

      // 3. Appeler l'API pour supprimer
      console.log(`Suppression du produit ${productId}...`);
      await deleteModuleRecord("products", productId);

      // 4. Mettre à jour la liste locale (supprimer le produit de l'état)
      setProducts(prevProducts => 
        prevProducts.filter(p => p.id !== productId)
      );

      // 5. Si le produit supprimé était sélectionné, réinitialiser la sélection
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
      }

      // 6. Afficher un message de succès
      setMessage("✅ Produit supprimé avec succès !");
      setMessageType("success");
      
      console.log(`Produit ${productId} supprimé avec succès.`);

    } catch (error) {
      // En cas d'erreur...
      console.error("Erreur lors de la suppression :", error);
      setMessage(`❌ Erreur : ${error.message}`);
      setMessageType("error");
      
    } finally {
      // 7. Désactiver l'état de chargement (qu'il y ait succès ou erreur)
      setIsDeleting(false);

      // 8. Effacer le message après 3 secondes
      setTimeout(() => setMessage(""), 3000);
    }
  };

  //  Gestion de la modification (placeholder pour Phase 3)
  const handleEditProduct = (productId) => {
    console.log(`Édition du produit ${productId} - À implémenter en Phase 3`);
    // À remplir en Phase 3
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
      
      {/* ← Affichage du message de succès/erreur */}
      {message && (
        <div style={{
          marginTop: '1rem',
          padding: '10px 15px',
          borderRadius: '4px',
          backgroundColor: messageType === "success" ? "#d4edda" : "#f8d7da",
          color: messageType === "success" ? "#155724" : "#721c24",
          border: `1px solid ${messageType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Colonne de gauche : La liste des produits */}
        <div style={{ flex: 1 }}>
          <ProductSelectionList
            products={products}
            onSelectProduct={handleProductSelect}
            onEdit={handleEditProduct}           
            onDelete={handleDeleteProduct}       
            title="Produits disponibles"
          />
          {/* État de chargement */}
          {isDeleting && (
            <div style={{ 
              marginTop: '10px', 
              textAlign: 'center', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              ⏳ Suppression en cours...
            </div>
          )}
        </div>

        {/* Colonne de droite : Les détails du produit sélectionné */}
        <div style={{ flex: 2, border: '1px solid #eee', padding: '1rem', borderRadius: '8px' }}>
          {selectedProduct ? (
            <div>
              <h2>Détails du produit</h2>
              <h3>{selectedProduct.name}</h3>
              <p><strong>Référence :</strong> {selectedProduct.reference}</p>
              <p><strong>Prix :</strong> {selectedProduct.price} €</p>
              <p><strong>Description :</strong></p>
              <p>{selectedProduct.description}</p>
            </div>
          ) : (
            <p>Sélectionnez un produit dans la liste pour voir les détails ici.</p>
          )}
        </div>

      </div>
    </div>
  );
}

export default ModuleProductList;