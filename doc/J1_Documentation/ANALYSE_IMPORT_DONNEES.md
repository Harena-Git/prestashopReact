# 📋 Analyse Complète du Plan d'Import de Données Prestashop

## 🔴 RÉSUMÉ DU PROBLÈME

**Situation actuelle :**
- Vous disposez de **3 fichiers CSV** avec des colonnes spécifiques à votre domaine métier
- Ces colonnes **ne correspondent PAS directement** à la structure de la base de données Prestashop
- Les colonnes CSV utilisent des libellés métier (exemple: "karazany", "specificité") qui doivent être mappées aux tables Prestashop réelles

**Exemple du décalage :**
```
Fichier CSV          →  Table Prestashop
reference            →  ps_product.reference
specificité          →  ps_attribute_group.name (groupe d'attributs)
karazany             →  ps_attribute_lang.name (valeur d'attribut)
stock_initial        →  ps_stock_available.quantity
```

**Défi principal :** Créer un **mapping bidirectionnel** (CSV ↔ DB) pour transformer vos données métier en structure Prestashop standard.

---

## 📊 FICHIERS CSV ANALYSÉS

### **FICHIER 1 : Produits de base**
📁 `import-data-mai-26 - fichier1.csv`

| Colonne | Type | Destination Prestashop | Notes |
|---------|------|------------------------|-------|
| `date_availability_produit` | DATE | `ps_product.date_add` | Date de disponibilité du produit |
| `nom` | STRING | `ps_product_lang.name` | Nom du produit (multilingue) |
| `reference` | STRING | `ps_product.reference` | Référence produit unique |
| `prix_ttc` | DECIMAL | `ps_product.price` ou `ps_product_shop.price` | Prix TTC (doit calculer HT) |
| `Taxe` | DECIMAL (%) | `ps_tax_rules_group` + `ps_tax_rule` | Taux de taxe (11.65% ou 5.6%) |
| `categorie` | STRING | `ps_category_lang.name` | Catégorie produit (Akanjo, Accessoire) |
| `prix_achat` | DECIMAL | Champ personnalisé ou `ps_product.wholesale_price` | Prix d'achat (coût) |

**Données exemple :**
- T_01 : T-shirt, prix TTC 12.50€, catégorie Akanjo
- M_02 : Montre, prix 56€, catégorie Accessoire

---

### **FICHIER 2 : Déclinaisons & Stock**
📁 `import-data-mai-26 - fichier2.csv`

| Colonne | Type | Destination Prestashop | Notes |
|---------|------|------------------------|-------|
| `reference` | STRING | `ps_product.reference` (FK) | Lien vers produit fichier1 |
| `specificité` | STRING | `ps_attribute_group_lang.name` | Groupe d'attribut (Taille, Couleur) |
| `karazany` | STRING | `ps_attribute_lang.name` | Valeur d'attribut (ngoza=grand, kely=petit) |
| `stock_initial` | INT | `ps_stock_available.quantity` | Quantité en stock |
| `prix_vente_ttc` | DECIMAL | `ps_product_attribute_shop.price` | Prix spécifique pour la déclinaison |

**Données exemple :**
```
T_01 + Taille:ngoza (grand) + Stock:13 + Prix:12.50€
T_01 + Taille:kely (petit) + Stock:10 + Prix:15€
P_01 + Couleur:mainty (noir) + Stock:5 + Prix:23.49€
```

**Relation :**
- Créer/lier `ps_attribute_group` (Taille, Couleur)
- Créer/lier `ps_attribute` (ngoza, kely, mainty, fotsy)
- Créer `ps_product_attribute` (combinaisons)
- Mettre à jour `ps_stock_available`

---

### **FICHIER 3 : Commandes & Clients**
📁 `import-data-mai-26 - fichier3.csv`

| Colonne | Type | Destination Prestashop | Notes |
|---------|------|------------------------|-------|
| `date` | DATE | `ps_orders.date_add` | Date de la commande |
| `nom` | STRING | `ps_customer.lastname` | Nom client (ou créer si inexistant) |
| `email` | STRING | `ps_customer.email` | Email unique client |
| `pwd` | STRING | `ps_customer.passwd` | Hash du mot de passe |
| `adresse` | STRING | `ps_address.address1` ou `city` | Adresse de livraison |
| `achat` | CUSTOM FORMAT | `ps_order_detail` (multiple rows) | Format: `[(ref;qty;attr)]` |
| `etat` | STRING | `ps_orders.current_state` (FK) | État de la commande (Pending payment, Paid, Error) |

**Données exemple :**
```
Rakoto → Commande du 09/05/2026
  - 3x T_01 (ngoza) 
  - État: "en attente paiement à la livraison"
  
Rajao → Commande du 16/04/2026
  - 2x T_01 (kely)
  - 1x C_03
  - État: "paiement accepté"
```

**Format spécial à parser :**
```javascript
// Format CSV: "[(""T_01"";3;""ngoza"")]"
// Doit être converti en:
[
  { reference: "T_01", quantity: 3, attribute: "ngoza" },
  { reference: "C_03", quantity: 1, attribute: "" }
]
```

---

## 🗂️ TABLES PRESTASHOP CONCERNÉES

### **CATÉGORIE 1 : PRODUITS & DÉCLINAISONS**

| Table | Rôle | Lien Fichier |
|-------|------|--------------|
| `ps_product` | Produit principal | Fichier 1 |
| `ps_product_lang` | Nom/Description produit (multilingue) | Fichier 1 |
| `ps_product_shop` | Produit par boutique | Fichier 1 |
| `ps_attribute_group` | Groupes d'attributs (Taille, Couleur) | Fichier 2 |
| `ps_attribute_group_lang` | Noms groupes (multilingue) | Fichier 2 |
| `ps_attribute` | Valeurs d'attributs (ngoza, kely, etc.) | Fichier 2 |
| `ps_attribute_lang` | Noms attributs (multilingue) | Fichier 2 |
| `ps_product_attribute` | Déclinaisons/Combinaisons | Fichier 2 |
| `ps_product_attribute_shop` | Déclinaison par boutique (prix spécifique) | Fichier 2 |
| `ps_stock_available` | Stock par déclinaison | Fichier 2 |

### **CATÉGORIE 2 : CATÉGORIES**

| Table | Rôle | Lien Fichier |
|-------|------|--------------|
| `ps_category` | Catégories produits | Fichier 1 |
| `ps_category_lang` | Noms catégories (multilingue) | Fichier 1 |
| `ps_category_product` | Liaison produit-catégorie | Fichier 1 |
| `ps_category_shop` | Catégorie par boutique | Fichier 1 |

### **CATÉGORIE 3 : TAXES**

| Table | Rôle | Lien Fichier |
|-------|------|--------------|
| `ps_tax_rules_group` | Groupes de taux | Fichier 1 |
| `ps_tax_rule` | Règles tax détaillées | Fichier 1 |

### **CATÉGORIE 4 : CLIENTS & ADRESSES**

| Table | Rôle | Lien Fichier |
|-------|------|--------------|
| `ps_customer` | Données client | Fichier 3 |
| `ps_address` | Adresses client | Fichier 3 |
| `ps_customer_group` | Groupe client (défaut: Clients) | Fichier 3 |

### **CATÉGORIE 5 : COMMANDES**

| Table | Rôle | Lien Fichier |
|-------|------|--------------|
| `ps_orders` | En-tête commande | Fichier 3 |
| `ps_order_detail` | Lignes de commande (produits commandés) | Fichier 3 |
| `ps_order_state_lang` | États possibles de commande | Fichier 3 |

---

## 🗺️ MAPPING DÉTAILLÉ CSV → PRESTASHOP

### **FICHIER 1 → Tables Produits & Catégories**

```
CSV Fichier 1                    → Prestashop
├─ reference                     → ps_product.reference (clé de jointure)
├─ nom                           → ps_product_lang.name
├─ date_availability_produit     → ps_product.date_add
├─ prix_ttc                      → ps_product_shop.price (ou calculer HT)
├─ Taxe (taux %)                 → ps_tax_rules_group + ps_tax_rule
├─ prix_achat                    → ps_product.wholesale_price
└─ categorie (nom)               → ps_category_lang.name
                                   → ps_category_product (liaison)
```

**Ordre d'insertion :**
1. `ps_category` + `ps_category_lang` (si n'existe pas)
2. `ps_tax_rules_group` (si n'existe pas) 
3. `ps_product` + `ps_product_lang` + `ps_product_shop`
4. `ps_category_product` (liaison)

---

### **FICHIER 2 → Tables Déclinaisons & Stock**

```
CSV Fichier 2
├─ reference                     → Chercher ps_product.id_product
├─ specificité (groupe)          → ps_attribute_group + ps_attribute_group_lang
├─ karazany (valeur)             → ps_attribute + ps_attribute_lang
├─ stock_initial                 → ps_stock_available.quantity
└─ prix_vente_ttc               → ps_product_attribute_shop.price
```

**Logique :**
```
Pour chaque ligne du fichier 2:
  1. Trouver id_product via reference (fichier 1)
  2. Si groupe d'attributs n'existe pas → créer ps_attribute_group
  3. Si attribut n'existe pas → créer ps_attribute
  4. Créer/Lier ps_product_attribute (combinaison)
  5. Mettre à jour ps_stock_available
  6. Définir prix spécifique si != prix de base
```

---

### **FICHIER 3 → Tables Commandes & Clients**

```
CSV Fichier 3
├─ nom, email, pwd, adresse      → ps_customer + ps_address
├─ date                          → ps_orders.date_add
├─ achat (format spécial)        → Parser + ps_order_detail (multi-lignes)
└─ etat (text)                   → Mapper texte → ps_order_state id
                                   "en attente paiement" → state_id:1
                                   "paiement accepté" → state_id:2
                                   "erreur de paiement" → state_id:14
```

**Parser le format achat :**
```javascript
// Input: "[(""T_01"";3;""ngoza"")]"
// Regex: /\("([^"]+)";"(\d+)";"([^"]*)"\)/g
// Output: [
//   { ref: "T_01", qty: 3, attr: "ngoza" },
//   { ref: "C_03", qty: 1, attr: "" }
// ]
```

---

## ✅ SOLUTION PROPOSÉE

### **Architecture Import 4 Étapes**

```
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : VALIDATION & PRÉPARATION                     │
│  ├─ Valider format CSV                                   │
│  ├─ Détecter doublons/conflits                           │
│  └─ Créer table de mapping temporaire                    │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  ÉTAPE 2 : IMPORT PRODUITS (Fichier 1 + 2)             │
│  ├─ Créer categories manquantes                         │
│  ├─ Créer produits + liaisons                          │
│  ├─ Créer groupes attributs + attributs                 │
│  ├─ Créer déclinaisons (product_attribute)             │
│  └─ Mettre à jour stocks                               │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  ÉTAPE 3 : IMPORT CLIENTS & ADRESSES (Fichier 3)       │
│  ├─ Créer/Mettre à jour clients                        │
│  ├─ Créer/Mettre à jour adresses                       │
│  └─ Valider intégrité données                          │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  ÉTAPE 4 : IMPORT COMMANDES (Fichier 3)                │
│  ├─ Parser format achat                                 │
│  ├─ Créer commandes + détails                          │
│  ├─ Lier aux clients/produits                          │
│  └─ Vérifier états de commande                         │
└─────────────────────────────────────────────────────────┘
```

### **Implémentation Recommandée**

**Option A : Via API Prestashop (Recommandée)**
```
✅ Avantages:
  - Validation intégrée Prestashop
  - Respects des règles métier
  - Traçabilité complète
  
❌ Inconvénients:
  - Plus lent pour gros volumes
  - Appels réseau multiples

📝 Approche: Service Node.js/React qui appelle l'API REST Prestashop
```

**Option B : Via Requêtes SQL Directes**
```
✅ Avantages:
  - Plus rapide pour gros volumes
  - Contrôle fin sur les données
  
❌ Inconvénients:
  - Bypass validation Prestashop
  - Risque d'incohérence DB
  
📝 Approche: Script SQL généré depuis CSV (transaction)
```

**Option C : Hybride (MEILLEUR COMPROMIS)**
```
1. Valider via API (intégrité)
2. Insérer via SQL (performance)
3. Ré-indexer/valider post-import
```

---

## 📈 ORDRE D'EXÉCUTION

```
FICHIER 1 (Produits) :
  └─ ps_tax_rules_group → ps_category → ps_product 
     → ps_product_lang → ps_product_shop → ps_category_product

FICHIER 2 (Déclinaisons) :
  └─ ps_attribute_group → ps_attribute_group_lang
     → ps_attribute → ps_attribute_lang
     → ps_product_attribute → ps_product_attribute_shop
     → ps_stock_available

FICHIER 3 (Commandes) :
  └─ ps_customer → ps_address
     → ps_orders → ps_order_detail
```

---

## 🔧 CONSIDÉRATIONS TECHNIQUES

### **Points Critiques**

| Point | Solution |
|-------|----------|
| **Doublons de produits** | Chercher par `reference` avant création |
| **Clients existants** | Email unique → PUT (mise à jour) au lieu de POST |
| **Prix TTC vs HT** | Formule: `prix_ht = prix_ttc / (1 + taux_taxe)` |
| **Format date** | DD/MM/YYYY → YYYY-MM-DD HH:MM:SS |
| **Stock par déclinaison** | Chaque attribut a son propre `ps_stock_available` |
| **États de commande** | Créer/mapper les états manquants |
| **Caractères spéciaux** | Échapper quotes/guillemets (fichier 3) |

---

## 📝 RÉSUMÉ FINAL

| Aspect | Détail |
|--------|--------|
| **Fichiers** | 3 CSV à importer |
| **Tables Prestashop** | 25+ tables impliquées |
| **API utilisées** | Products, Attributes, Categories, Customers, Orders, Cart Rules |
| **Défi principal** | Mapping métier → Prestashop + gestion des relations |
| **Solution** | 4 étapes avec validation + approche hybride API/SQL |
| **Temps estimé** | 2-3 semaines (dev + test) |

