import React from "react";

function ProductSearchSidebar({
  categories,
  filters,
  onFilterChange,
  onReset,
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <aside
      style={{
        width: "280px",
        padding: "20px",
        borderLeft: "1px solid #ddd",
        backgroundColor: "#f9f9f9",
        height: "fit-content",
        position: "sticky",
        top: "20px",
      }}
    >
      <h3>Recherche avancée</h3>

      {/* Recherche par nom */}
      <div style={{ marginBottom: "15px" }}>
        <label
          style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
        >
          Nom du produit
        </label>
        <input
          type="text"
          name="name"
          value={filters.name}
          onChange={handleChange}
          placeholder="Ex: T-shirt..."
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Recherche par catégorie */}
      <div style={{ marginBottom: "15px" }}>
        <label
          style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
        >
          Catégorie
        </label>
        <select
          name="category"
          value={filters.category}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Intervalle de prix */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
        >
          Prix (€)
        </label>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleChange}
            placeholder="Min"
            style={{
              width: "45%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
          <span>-</span>
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleChange}
            placeholder="Max"
            style={{
              width: "45%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#6c757d",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Réinitialiser les filtres
      </button>
    </aside>
  );
}

export default ProductSearchSidebar;
