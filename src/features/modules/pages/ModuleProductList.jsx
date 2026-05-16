import { useState, useEffect } from "react";
import { listAllProducts, listAllCategories } from "../services/moduleListe";
import ProductSelectionList from "../components/ProductSelectionList";
import ProductSearchSidebar from "../components/ProductSearchSidebar";
import { deleteModuleRecord } from "../../../api/prestashop.api";

/**
 * Page React pour afficher la liste des produits avec recherche multicritère.
 */
function ModuleProductList() {
  // --- États ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // État pour les filtres de recherche
  const [filters, setFilters] = useState({
    name: "",
    category: "",
    minPrice: "",
    maxPrice: "",
  });

  // --- Chargement des données ---
  useEffect(() => {
    const loadData = async () => {
      console.log("Chargement des produits et catégories...");
      try {
        const [productsData, categoriesData] = await Promise.all([
          listAllProducts(),
          listAllCategories(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // --- Gestion des filtres ---
  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ name: "", category: "", minPrice: "", maxPrice: "" });
  };

  // --- Logique de filtrage ---
  const filteredProducts = products.filter((product) => {
    const matchName = product.name
      .toLowerCase()
      .includes(filters.name.toLowerCase());
    const matchCategory =
      filters.category === "" ||
      String(product.categoryId) === String(filters.category);
    const matchMinPrice =
      filters.minPrice === "" || product.price >= parseFloat(filters.minPrice);
    const matchMaxPrice =
      filters.maxPrice === "" || product.price <= parseFloat(filters.maxPrice);

    return matchName && matchCategory && matchMinPrice && matchMaxPrice;
  });

  // --- Handlers ---
  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product);
  };

  const handleDeleteProduct = async (productId) => {
    const confirmDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce produit ?",
    );
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      await deleteModuleRecord("products", productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (selectedProduct?.id === productId) setSelectedProduct(null);
      setMessage("✅ Produit supprimé !");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ Erreur : ${error.message}`);
      setMessageType("error");
    } finally {
      setIsDeleting(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEditProduct = (productId) => {
    console.log(`Édition du produit ${productId}`);
  };

  if (loading) {
    return <div>Chargement de la liste des produits...</div>;
  }

  return (
    <div>
      <h1>Liste des Produits</h1>
      <p>
        Utilisez la barre latérale à droite pour filtrer les produits par nom,
        catégorie ou prix.
      </p>

      {message && (
        <div
          style={{
            marginTop: "1rem",
            padding: "10px 15px",
            borderRadius: "4px",
            backgroundColor: messageType === "success" ? "#d4edda" : "#f8d7da",
            color: messageType === "success" ? "#155724" : "#721c24",
            border: `1px solid ${messageType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        {/* Colonne de gauche : La liste des produits filtrés */}
        <div style={{ flex: 2 }}>
          <ProductSelectionList
            products={filteredProducts}
            onSelectProduct={handleProductSelect}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            title="Résultats de la recherche"
          />
          {isDeleting && (
            <div style={{ marginTop: "10px", fontStyle: "italic" }}>
              ⏳ Suppression en cours...
            </div>
          )}
        </div>

        {/* Colonne du milieu : Détails */}
        <div
          style={{
            flex: 2,
            border: "1px solid #eee",
            padding: "1rem",
            borderRadius: "8px",
            height: "fit-content",
          }}
        >
          {selectedProduct ? (
            <div>
              <h2>Détails du produit</h2>
              <h3>{selectedProduct.name}</h3>
              <p>
                <strong>Prix :</strong> {selectedProduct.price} €
              </p>
              <p>
                <strong>Stock disponible :</strong> {selectedProduct.quantity}
              </p>
              <p>
                <strong>Référence :</strong> {selectedProduct.reference}
              </p>
              <p>
                <strong>Description :</strong>
              </p>
              <p>{selectedProduct.description}</p>
            </div>
          ) : (
            <p>Sélectionnez un produit pour voir les détails.</p>
          )}
        </div>

        {/* NOUVELLE SIDEBAR DE RECHERCHE (À DROITE) */}
        <ProductSearchSidebar
          categories={categories}
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
        />
      </div>
    </div>
  );
}

export default ModuleProductList;
