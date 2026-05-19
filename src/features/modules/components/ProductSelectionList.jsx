import { useContext, useState } from "react";
import "./ProductSelectionList.css";
import { ClientContext } from "../../../contexts/ClientContext";

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
  const { addToCart } = useContext(ClientContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  // Quantité par produit (clé = product.id, valeur = nombre saisi)
  const [quantities, setQuantities] = useState({});

  // S'assurer que products est toujours un tableau.
  const validProducts = Array.isArray(products) ? products : [];

  // Filtrer les produits en fonction du terme de recherche.
  const filteredProducts = validProducts.filter((product) =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()),
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

  // Fonction utilitaire pour obtenir le badge ('HOT', 'NEW' ou null)
  const getProductBadge = (dateString) => {
    if (!dateString) return null;

    const productDate = new Date(dateString);
    const now = new Date(); // La date du jour

    // Différence en millisecondes
    const diffTime = now.getTime() - productDate.getTime();
    // Calcule la différence en jours (1000 ms * 60 s * 60 min * 24 h)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1 && diffDays >= 0) {
      return "HOT";
    } else if (diffDays > 1 && diffDays <= 7) {
      return "NEW";
    }
    return null; // Pas de badge si c'est plus vieux qu'une semaine
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
          filteredProducts.map((product) => {
            const badge = getProductBadge(product.date_add); // Ou product.date_availability selon l'API

            return (
              <li
                key={product.id}
                className={product.id === selectedId ? "selected" : ""}
                onClick={() => handleProductClick(product.id)}
              >
                {/* Colonne gauche : infos du produit */}
                <div className="product-info">
                  <div
                    className="product-name"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {product.name}
                    {badge === "HOT" && (
                      <span className="badge badge-hot">🔥 HOT</span>
                    )}
                    {badge === "NEW" && (
                      <span className="badge badge-new">✨ NEW</span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "center",
                    }}
                  >
                    <div className="product-price">{product.price}€</div>
                    <div
                      className="product-stock"
                      style={{
                        fontSize: "0.85rem",
                        color: product.quantity > 0 ? "#28a745" : "#dc3545",
                        fontWeight: "500",
                      }}
                    >
                      Stock: {product.quantity}
                    </div>
                  </div>
                </div>

                {/* Colonne droite : boutons d'action */}
                {(() => {
                  const qty = quantities[product.id] ?? 1;
                  const outOfStock = product.quantity === 0;
                  const insufficientStock = !outOfStock && qty > product.quantity;
                  const cantAdd = outOfStock || insufficientStock;
                  return (
                    <div className="product-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {outOfStock ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            backgroundColor: "#f8d7da",
                            color: "#721c24",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Rupture
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max={product.quantity}
                          value={qty}
                          onChange={(e) => {
                            e.stopPropagation();
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setQuantities((prev) => ({ ...prev, [product.id]: val }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          title="Quantité à ajouter au panier"
                          style={{
                            width: "60px",
                            padding: "5px 6px",
                            borderRadius: "4px",
                            border: `1px solid ${insufficientStock ? "#dc3545" : "#ccc"}`,
                            textAlign: "center",
                            fontSize: "0.9rem",
                          }}
                        />
                      )}
                      {insufficientStock && (
                        <span style={{ fontSize: "0.75rem", color: "#dc3545", whiteSpace: "nowrap" }}>
                          Max {product.quantity}
                        </span>
                      )}
                      <button
                        className="btn-edit"
                        disabled={cantAdd}
                        onClick={(e) =>
                          handleActionClick(
                            e,
                            () => addToCart(product, qty),
                            product.id,
                          )
                        }
                        title={
                          outOfStock
                            ? "Produit en rupture de stock"
                            : insufficientStock
                            ? `Quantité demandée supérieure au stock (${product.quantity})`
                            : "Ajouter le produit au panier"
                        }
                        style={{
                          opacity: cantAdd ? 0.5 : 1,
                          cursor: cantAdd ? "not-allowed" : "pointer",
                        }}
                      >
                        Ajouter au panier
                      </button>
                    </div>
                  );
                })()}
              </li>
            );
          })
        ) : (
          <li className="no-results">Aucun produit trouvé</li>
        )}
      </ul>
    </div>
  );
}

export default ProductSelectionList;
