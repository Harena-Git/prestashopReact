# Guide : Ajouter une Nouvelle Fonctionnalité

Ce document explique comment ajouter une nouvelle fonctionnalité dans le projet PrestaShop React, du backend jusqu'au frontend.

---

## 📊 Architecture du Projet

```
src/
├── api/                          ← Couche API (appels HTTP)
│   └── prestashop.api.js
├── app/
│   └── AppRouter.jsx             ← Routage principal
├── layouts/
│   └── MainLayout.jsx            ← Layout global (Sidebar + Outlet)
├── features/modules/             ← Feature module (Module métier)
│   ├── components/               ← Composants réutilisables
│   │   ├── DeleteModulesButton.jsx
│   │   ├── ImportCsvButton.jsx
│   │   ├── ModuleSelectionList.jsx
│   │   └── Sidebar.jsx
│   ├── constants/                ← Données statiques
│   │   ├── availableModules.js
│   │   └── sidebarPages.js
│   ├── pages/                    ← Pages principales
│   │   ├── ModuleCleanupPage.jsx
│   │   └── ModuleImportPage.jsx
│   ├── services/                 ← Logique métier
│   │   ├── moduleDeletion.service.js
│   │   └── moduleImportationservice.js
│   └── utils/                    ← Fonctions utilitaires
│       └── selection.js
├── hooks/                        ← Hooks personnalisés (à développer)
├── styles/                       ← Fichiers CSS
└── main.jsx
```

---

## 🔄 Flux de Données

```
[User Interaction]
       ↓
[React Component (Page)]
       ↓
[Service Layer] (Logique métier)
       ↓
[API Layer] (Appels HTTP)
       ↓
[PrestaShop API (Backend)]
       ↓
[Réponse XML/Données]
       ↓
[Affichage dans le composant]
```

---

## 📋 Checklist : Ajouter une Nouvelle Fonctionnalité

### Étape 1 : Définir la Route
**Fichier** : `src/app/AppRouter.jsx`

```javascript
import MyNewPage from "../features/modules/pages/MyNewPage";

// Dans le composant AppRouter :
<Route path="/modules/mynew" element={<MyNewPage />} />
```

---

### Étape 2 : Créer la Page Principale
**Dossier** : `src/features/modules/pages/`
**Fichier** : `MyNewPage.jsx`

```javascript
import { useState } from "react";
import { fetchMyData } from "../services/myFeature.service";

function MyNewPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchMyData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Ma Nouvelle Fonctionnalité</h1>
      <button onClick={loadData}>Charger les données</button>
      {loading && <p>Chargement...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {data.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default MyNewPage;
```

---

### Étape 3 : Créer les Composants Réutilisables
**Dossier** : `src/features/modules/components/`
**Fichier** : `MyComponent.jsx`

```javascript
function MyComponent({ data, onAction }) {
  return (
    <div>
      <p>{data.name}</p>
      <button onClick={() => onAction(data.id)}>Action</button>
    </div>
  );
}

export default MyComponent;
```

---

### Étape 4 : Créer le Service (Logique Métier)
**Dossier** : `src/features/modules/services/`
**Fichier** : `myFeature.service.js`

Ce fichier **fait le lien** entre les appels API et les composants :

```javascript
import { 
  listModuleElements, 
  deleteModuleRecord 
} from "../../../api/prestashop.api";

// Exemple 1 : Récupérer et filtrer des données
export async function fetchMyData() {
  const allItems = await listModuleElements("products");
  // Filtrer, transformer, etc.
  return allItems.filter(item => item.active === "1");
}

// Exemple 2 : Effectuer plusieurs actions
export async function deleteAndLog(moduleName, itemId) {
  try {
    await deleteModuleRecord(moduleName, itemId);
    console.log(`Item ${itemId} supprimé`);
    return { success: true, message: "Suppression réussie" };
  } catch (error) {
    console.error("Erreur de suppression:", error);
    throw error;
  }
}

// Exemple 3 : Traitement batch
export async function processBatch(itemIds) {
  const results = await Promise.all(
    itemIds.map(id => deleteModuleRecord("products", id))
  );
  return results;
}
```

---

### Étape 5 : Ajouter les Appels API
**Fichier** : `src/api/prestashop.api.js`

```javascript
// Si vous avez besoin d'une nouvelle fonctionnalité API

// Exemple : Récupérer un élément par ID
export async function fetchModuleById(moduleName, id) {
  const response = await requestXml(
    `${BASE_URL}${moduleName}/${id}?ws_key=${API_KEY}`
  );
  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(
      `Erreur GET ${moduleName}/${id}: ${response.status} ${details}`.trim()
    );
  }

  const xmlPayload = await response.text();
  const parsedPayload = parser.parse(xmlPayload);
  const singleName = toSingleName(moduleName);
  
  return parsedPayload?.prestashop?.[singleName] || null;
}
```

---

### Étape 6 : Ajouter les Constantes (si nécessaire)
**Dossier** : `src/features/modules/constants/`
**Fichier** : `myFeature.constants.js`

```javascript
export const MY_FEATURE_STATUSES = {
  ACTIVE: "1",
  INACTIVE: "0",
};

export const MY_FEATURE_DEFAULTS = {
  defaultLimit: 50,
  defaultSort: "name",
};
```

---

### Étape 7 : Ajouter les Utilitaires (si nécessaire)
**Dossier** : `src/features/modules/utils/`
**Fichier** : `myFeature.utils.js`

```javascript
// Fonctions de transformation, filtrage, etc.

export function formatItemName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function filterActiveItems(items) {
  return items.filter(item => item.active === "1");
}

export function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
```

---

### Étape 8 : Mettre à Jour la Sidebar (Navigation)
**Fichier** : `src/features/modules/components/Sidebar.jsx`

```javascript
// Ajouter le lien vers votre nouvelle page
<Link to="/modules/mynew">Ma Nouvelle Fonctionnalité</Link>
```

Ou ajouter dans `src/features/modules/constants/sidebarPages.js` :

```javascript
export const SIDEBAR_PAGES = [
  { label: "Dashboard", path: "/" },
  { label: "Nettoyage", path: "/modules/cleanup" },
  { label: "Import", path: "/modules/import" },
  { label: "Ma Nouvelle Fonctionnalité", path: "/modules/mynew" }, // ← Ajouter ici
];
```

---

## 🔄 Exemple Complet : Ajouter une Page "Liste des Produits"

### 1. Route
```javascript
// src/app/AppRouter.jsx
<Route path="/modules/products-list" element={<ProductListPage />} />
```

### 2. Page
```javascript
// src/features/modules/pages/ProductListPage.jsx
import { useState, useEffect } from "react";
import { fetchAllProducts } from "../services/products.service";
import ProductCard from "../components/ProductCard";

function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchAllProducts();
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Liste des Produits</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default ProductListPage;
```

### 3. Service
```javascript
// src/features/modules/services/products.service.js
import { listModuleElements } from "../../../api/prestashop.api";

export async function fetchAllProducts() {
  return await listModuleElements("products");
}
```

### 4. Composant
```javascript
// src/features/modules/components/ProductCard.jsx
function ProductCard({ product }) {
  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
      <h3>{product.name}</h3>
      <p>Prix: {product.price}</p>
      <p>Stock: {product.quantity}</p>
    </div>
  );
}

export default ProductCard;
```

---

## 📁 Ordre d'Implémentation Recommandé

1. ✅ **API** (`prestashop.api.js`) - Créer la fonction pour appeler l'endpoint
2. ✅ **Service** (`*.service.js`) - Wrapper la logique métier
3. ✅ **Composants** (`components/`) - Créer les UI réutilisables
4. ✅ **Page** (`pages/`) - Assembler les composants
5. ✅ **Route** (`AppRouter.jsx`) - Connecter la page au routeur
6. ✅ **Navigation** (`Sidebar.jsx`) - Ajouter le lien

---

## 🎯 Bonnes Pratiques

| ❌ À Éviter | ✅ À Faire |
|---|---|
| Appels API directs dans les composants | Passer par le service |
| Logic métier dans les pages | Logic dans les services |
| Données brutes sans validation | Utiliser les utilitaires pour transformer |
| Hard-coder les URLs | Utiliser les constantes |
| Composants trop volumineux | Découper en sous-composants |

---

## 🐛 Déboguer

### Vérifier le flux API
```javascript
// Dans la console
const data = await fetch("/api/products?ws_key=YOUR_KEY");
console.log(await data.text()); // Voir la réponse XML
```

### Vérifier le service
```javascript
// Importer et tester
import { fetchAllProducts } from "./services/products.service";
fetchAllProducts().then(console.log).catch(console.error);
```

### Vérifier les états React
```javascript
// Ajouter des logs
useEffect(() => {
  console.log("Data:", data);
  console.log("Loading:", loading);
  console.log("Error:", error);
}, [data, loading, error]);
```

---

## 📚 Ressources

- **XMLParser** : `fast-xml-parser` (conversion XML → JS)
- **Router** : `react-router-dom` (navigation)
- **Styling** : CSS inline ou fichiers CSS dans `src/styles/`
- **Variables d'env** : `.env` (VITE_API_KEY, VITE_API_BASE_URL)

---

## ✅ Checklist Finale

Avant de commiter votre code :

- [ ] Route créée dans `AppRouter.jsx`
- [ ] Appels API dans `prestashop.api.js` (si nécessaire)
- [ ] Service créé avec logique métier
- [ ] Composants réutilisables créés
- [ ] Page créée et testée
- [ ] Navigation mise à jour (Sidebar)
- [ ] Pas d'appels API directs dans les composants
- [ ] Gestion des erreurs implémentée
- [ ] États de chargement (loading/error) gérés
- [ ] Code commenté si nécessaire
