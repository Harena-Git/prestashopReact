import { useState } from "react";
import "./ProductSelectionList.css";

/**
 * Affiche une liste de produits cliquables avec un champ de recherche.
 * Cet composant est spécifique pour les produits et n'interfère pas avec ModuleSelectionList.
 * 
 * @param {object[]} products - La liste des produits à afficher.
 * @param {function} onSelectProduct - La fonction à appeler avec l'ID du produit cliqué.
 * @param {string} title - Le titre à afficher au-dessus de la liste.
 * @param {function} onEdit - La fonction à appeler quand on clique sur "Modifier".
 * @param {function} onDelete - La fonction à appeler quand on clique sur "Supprimer".
 */
function ProductSelectionList({
  products,
  onSelectProduct,
  onEdit = () => {},      
  onDelete = () => {},    
  title = "Liste des Produits",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // S'assurer que products est toujours un tableau.
  const validProducts = Array.isArray(products) ? products : [];

  // Filtrer les produits en fonction du terme de recherche.
  const filteredProducts = validProducts.filter((product) =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fonction appelée quand on clique sur un produit.
  const handleProductClick = (productId) => {
    setSelectedId(productId);
    onSelectProduct(productId);
  };

  // ← Nouvelle fonction : éviter que les boutons déselectionent
  const handleActionClick = (e, callback, productId) => {
    e.stopPropagation(); // Arrête la propagation du clic
    callback(productId);
  };

  return (
    <div className="product-selection-list">
      <h3>{title}</h3>
      <input
        type="text"
        placeholder="Rechercher un produit..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      <ul className="product-list">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <li
              key={product.id}
              className={product.id === selectedId ? "selected" : ""}
              onClick={() => handleProductClick(product.id)}
            >
              {/* Colonne gauche : infos du produit */}
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-price">{product.price}€</div>
              </div>

              {/* Colonne droite : boutons d'action */}
              <div className="product-actions">
                <button
                  className="btn-edit"
                  onClick={(e) => handleActionClick(e, onEdit, product.id)}
                  title="Modifier ce produit"
                >
                  ✏️ Modifier
                </button>
                <button
                  className="btn-delete"
                  onClick={(e) => handleActionClick(e, onDelete, product.id)}
                  title="Supprimer ce produit"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </li>
          ))
        ) : (
          <li className="no-results">Aucun produit trouvé</li>
        )}
      </ul>
    </div>
  );
}

export default ProductSelectionList;
