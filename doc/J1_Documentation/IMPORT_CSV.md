# 📊 Import CSV - Guide Technique

## 🎯 Objectif
Importer 3 fichiers CSV métier vers Prestashop en respectant les contraintes:
- **Pas de tables temporaires** (mapping en mémoire seulement)
- **Transformation**: CSV → Mapping → XML → Insertion
- **All or Nothing**: Une erreur = AUCUNE donnée insérée

---

## 📂 Fichiers Créés/Modifiés

### 1. **Constants - Mapping des données**
📁 `src/features/modules/constants/dataImportConstants.js`

Définit les règles de transformation pour chaque fichier CSV:
- Fichier 1: Produits (7 colonnes)
- Fichier 2: Déclinaisons & Stock (5 colonnes)
- Fichier 3: Clients & Commandes (7 colonnes)

Chaque colonne a:
- `prestashopField` : Nom du champ Prestashop
- `transformation()` : Fonction pour convertir la valeur
- `validation()` : Vérifier que la valeur est valide
- `async` : Si appel API requis

**Exemple:**
```javascript
prix_ttc: {
  prestashopField: "price",
  transformation: (value) => parseFloat(value.replace(",", ".")).toFixed(2),
  validation: (value) => !isNaN(parseFloat(value.replace(",", "."))),
  required: true,
}
```

---

### 2. **Service - CSV → XML**
📁 `src/features/modules/services/csvToXmlTransformationService.js`

Responsabilités:
- Valider chaque ligne CSV
- Transformer selon le mapping
- Générer XML valide Prestashop
- Parser format spécial "achat": `[(""T_01"";3;""ngoza"")]`

**Méthodes clés:**
- `validateRow()` : Vérifier format ligne
- `transformRow()` : Appliquer transformations
- `toXml()` : Convertir en XML
- `transformCsvData()` : Pipeline complet

---

### 3. **Service - Import Transactionnel**
📁 `src/features/modules/services/transactionalDataImportService.js`

Orchestre le flux complet avec politique **All or Nothing**:

**Classe `ImportContext`:**
- Cache les résultats API (évite requêtes doublons)
- Fournit méthodes pour les transformations async:
  - `getTaxGroupIdByRate()` → chercher/créer groupe taxe
  - `getCategoryIdByName()` → chercher/créer catégorie
  - `getProductIdByReference()` → chercher produit
  - `getOrCreateAttributeGroup()` → chercher/créer groupe attribut
  - `getOrCreateAttribute()` → chercher/créer attribut
  - `getCustomerIdByEmail()` → chercher client
  - `getOrderStateIdByLabel()` → mapper état texte → ID

**Classe `TransactionalDataImportService`:**
- `importDataFile()` : Orchestration complète
  1. Parse CSV
  2. Sélectionne mapping
  3. Crée contexte
  4. Transforme données
  5. Valide ALL or NOTHING
  6. Insère en transaction atomique
- `insertDataTransactional()` : Insertion avec rollback si erreur

---

### 4. **Page UI - DataImportPage.jsx**
📁 `src/features/modules/pages/DataImportPage.jsx`

Interface pour l'utilisateur:
- Upload 4 fichiers (ou moins)
- Affiche le log en direct
- Montre résultat (succès/erreurs)
- Explication policy "All or Nothing"

**États:**
- `files` : Fichiers sélectionnés
- `importing` : En cours d'import
- `importLog` : Journaux détaillés
- `results` : Résultat final

---

### 5. **Styles - DataImportPage.css**
📁 `src/features/modules/pages/DataImportPage.css`

Design responsive avec:
- Sections d'upload (drag & drop)
- Viewer de logs avec couleurs
- Résultats (succès/erreurs)
- Info box "All or Nothing"

---

## 🔄 Flux d'Import

```
┌─────────────────────────────────────────────────────────┐
│ Étape 1: USER UPLOAD CSV FILES                          │
│ └─ 4 fichiers sélectionnés dans DataImportPage          │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│ Étape 2: PARSE & MAPPING                                │
│ ├─ parseCsv() : CSV → JSON array                        │
│ └─ getMapping() : Charger règles transformation         │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│ Étape 3: CREATE CONTEXT                                 │
│ └─ Cache + API handlers pour transformations async      │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│ Étape 4: VALIDATE & TRANSFORM                           │
│ ├─ validateRow() : Vérifier chaque ligne                │
│ ├─ transformRow() : Appliquer transformations           │
│ └─ toXml() : Générer XML                                │
│ └─ Résultat: xmlDataList[]                              │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│ Étape 5: CHECK ALL or NOTHING                           │
│ ├─ Si validationErrors.length > 0 → THROW ERROR        │
│ ├─ Si transformationErrors.length > 0 → THROW ERROR    │
│ ├─ SINON → Continuer                                    │
│ └─ Validation échouée = RIEN n'est inséré              │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│ Étape 6: TRANSACTIONAL INSERT                           │
│ ├─ Pour chaque XML:                                     │
│ │  └─ createResource() → API Prestashop                 │
│ ├─ Si UNE erreur: ROLLBACK tout (Nothing)             │
│ ├─ Si ALL OK: COMMIT tout (All)                        │
│ └─ Retourner résultat                                   │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│ Étape 7: DISPLAY RESULTS                                │
│ ├─ Afficher log détaillé                                │
│ ├─ Succès: ✅ + stats                                   │
│ └─ Erreur: ❌ + détails erreurs                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Architecture Données

### Fichier 1 → Produits
```
CSV Columns          →  Prestashop
date_...            →  ps_product.date_add
nom                 →  ps_product_lang.name (multilingue)
reference           →  ps_product.reference (unique key)
prix_ttc            →  ps_product_shop.price
Taxe                →  ps_product.id_tax_rules_group (FK)
categorie           →  ps_category_product (liaison FK)
prix_achat          →  ps_product.wholesale_price
```

### Fichier 2 → Déclinaisons & Stock
```
CSV Columns          →  Prestashop
reference           →  ps_product.id_product (FK vers fichier 1)
specificité         →  ps_attribute_group (Taille, Couleur)
karazany            →  ps_attribute (ngoza, kely, mainty)
stock_initial       →  ps_stock_available.quantity
prix_vente_ttc      →  ps_product_attribute_shop.price (override)
```

### Fichier 3 → Clients & Commandes
```
CSV Columns          →  Prestashop
email               →  ps_customer.email (unique key)
nom                 →  ps_customer.lastname
pwd                 →  ps_customer.passwd
adresse             →  ps_address.address1
date                →  ps_orders.date_add
achat               →  ps_order_detail[] (format spécial parsé)
etat                →  ps_orders.current_state (texte → ID mappé)
```

---

## 🔑 Points Clés de Sécurité

### All or Nothing
```javascript
// SI aucune erreur de validation/transformation
→ INSÉRER tous les XML

// SI UNE SEULE erreur détectée
→ RIEN n'est inséré (ROLLBACK logique)
→ Utilisateur peut corriger et réessayer
```

### Cache en Mémoire (Pas de DB temporaire)
```javascript
// Cache stocké dans ImportContext
context.cache = {
  categories: { "Akanjo": 1, "Accessoire": 2 },
  taxGroups: { 11.65: 5, 5.60: 6 },
  attributeGroups: { "Taille": 10, "Couleur": 11 },
  // ...
}

// Pas de table ps_import_temp ou similaire
```

### Transformations Async avec Contexte Partagé
```javascript
// Chaque transformation peut accéder au contexte
transformation: async (value, context) => {
  // context.getCategoryIdByName(value)
  // context.getProductIdByReference(value)
  // context.getTaxGroupIdByRate(value)
  // etc.
  return await context.getCategoryIdByName(value);
}
```

---

## 🚀 Utilisation

### 1. Créer les fichiers
Copier/créer les 5 fichiers listés ci-dessus dans les répertoires indiqués.

### 2. Ajouter route
```javascript
// src/app/AppRouter.jsx
import DataImportPage from "../features/modules/pages/DataImportPage";

{ path: "/import-data", element: <DataImportPage /> }
```

### 3. Upload & Import
1. Aller sur `/import-data`
2. Sélectionner les 4 fichiers CSV
3. Cliquer "🚀 Lancer l'import"
4. Attendre résultat (All ou Nothing)

---

## ⚠️ Cas d'Erreur

| Erreur | Cause | Résultat |
|--------|-------|---------|
| Email client invalide | Format validation | ❌ Ligne invalide → RIEN inséré |
| Reference produit inexistante | FK violation | ❌ Dépendance fichier 1 → RIEN inséré |
| Format "achat" invalide | Parser regex | ❌ Format non reconnu → RIEN inséré |
| État commande introuvable | Mapping incomplet | ❌ State non mappé → RIEN inséré |
| Taux taxe vide | Transformation échoue | ❌ Transformation error → RIEN inséré |

**Dans TOUS les cas: Aucune donnée n'est insérée** ✅

---

## 📝 Exemple: Fichier 1 - Produit

### CSV Input
```csv
date_availability_produit,nom,reference,prix_ttc,Taxe,categorie,prix_achat
01/12/2025,Tshirt,T_01,"12,5","11,65%",Akanjo,"8,5"
```

### Transformation
```javascript
{
  date_add: "2025-12-01 00:00:00",      // DD/MM/YYYY → ISO format
  name: "Tshirt",                       // Texte simple
  reference: "T_01",                    // Uppercase
  price: "12.50",                       // "12,5" → "12.50"
  id_tax_rules_group: 5,                // "11.65%" → chercher/créer groupe → ID
  id_category_default: 1,               // "Akanjo" → chercher/créer catégorie → ID
  wholesale_price: "8.50"               // "8,5" → "8.50"
}
```

### XML Output
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product>
    <date_add>2025-12-01 00:00:00</date_add>
    <name>
      <language id="1">Tshirt</language>
    </name>
    <reference>T_01</reference>
    <price>12.50</price>
    <id_tax_rules_group>5</id_tax_rules_group>
    <id_category_default>1</id_category_default>
    <wholesale_price>8.50</wholesale_price>
  </product>
</prestashop>
```

### API Call
```javascript
createResource("products", xmlData)
// → POST /api/products avec XML body
// → Retour: { product: { id: 123 } }
```

---

## 🔍 Debug

### Afficher les logs
```javascript
// Console du navigateur
// DataImportPage.jsx met à jour importLog[] en temps réel
[12:34:56] [TRANSFORMATION] Début transformation de 4 lignes...
[12:34:56] [IMPORT CONTEXT] Chercher catégorie "Akanjo"...
[12:34:57] ✓ Contexte créé
[12:34:57] ✓ 4/4 lignes transformées
[12:34:58] 📝 Préparation des insertions (4 items)...
[12:34:59] ✓ Ligne 1: Inséré avec ID 123
[12:34:59] ✓ Ligne 2: Inséré avec ID 124
// etc.
```

### Vérifier en base de données
```sql
-- Fichier 1 produits
SELECT id, reference, name, price FROM ps_product WHERE reference IN ('T_01', 'P_01', 'C_03', 'M_02');

-- Fichier 2 déclinaisons
SELECT id_product, id_product_attribute, quantity FROM ps_stock_available WHERE id_product IN (...);

-- Fichier 3 clients
SELECT id, email, lastname FROM ps_customer WHERE email IN (...);
```

---

## 📊 Summary

| Aspect | Détail |
|--------|--------|
| **Fichiers créés** | 5 (constants, 2 services, 1 page, styles) |
| **Colonnes mappées** | 19 (7+5+7) |
| **Tables Prestashop** | 25+ |
| **Règles transformations** | ~30 |
| **Policy** | All or Nothing (atomique) |
| **Cache** | Mémoire (pas DB temporaire) |
| **Format spécial** | Parser regex pour "achat" |
| **Dépendances** | Fichier 2 → Fichier 1, Fichier 3 → Fichiers 1+2 |

---

## 🎓 Leçons

1. **Mapping ≠ Tables temporaires** → Utiliser memory cache + contexte partagé
2. **Validation avant insertion** → Éviter insertions partielles
3. **Transformations async** → Context pattern pour dépendances API
4. **All or Nothing** → Jeter exception si ANY erreur détectée
5. **Format complexe** → Parser spécifique (regex) avant insertion

