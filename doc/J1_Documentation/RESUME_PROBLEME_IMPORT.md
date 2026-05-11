# ⚡ RÉSUMÉ EXÉCUTIF : Problème Import de Données

## 🎯 LE PROBLÈME EN 30 SECONDES

Vous avez **3 fichiers CSV avec des colonnes métier** (ex: "karazany", "specificité") qui **ne correspondent PAS** à la structure Prestashop. 

Il faut créer un **système de mapping** pour transformer vos données métier en structure Prestashop standard.

---

## 📊 LES 3 FICHIERS CSV

| Fichier | Contenu | Records | Colonnes Clés |
|---------|---------|---------|---------------|
| **fichier1.csv** | Produits de base | 4 produits | `reference`, `nom`, `prix_ttc`, `categorie`, `prix_achat` |
| **fichier2.csv** | Déclinaisons & Stock | 6 déclinaisons | `reference`, `specificité` (groupe attribut), `karazany` (valeur), `stock_initial` |
| **fichier3.csv** | Commandes & Clients | 3 commandes | `email`, `nom`, `adresse`, `achat` (format spécial), `etat` |

---

## 🗂️ LES API PRESTASHOP CONCERNÉES

### **API 1 : Products** (Fichier 1 + 2)
```
POST   /api/products                      → Créer produit
PUT    /api/products/{id}                 → Mettre à jour
POST   /api/products/{id}/combinations    → Créer déclinaison
```

**Tables Prestashop :**
- `ps_product` (données produit)
- `ps_product_lang` (nom, description)
- `ps_product_shop` (prix par boutique)
- `ps_product_attribute` (combinaisons = déclinaisons)
- `ps_stock_available` (quantité)

---

### **API 2 : Attributes** (Fichier 2)
```
GET    /api/product_attributes           → Lister attributs
POST   /api/product_attributes           → Créer attribut
```

**Tables Prestashop :**
- `ps_attribute_group` (Taille, Couleur, etc.)
- `ps_attribute` (ngoza, kely, mainty, fotsy)
- `ps_attribute_lang` (traductions)
- `ps_product_attribute_combination` (liaisons produit-attribut)

---

### **API 3 : Categories** (Fichier 1)
```
GET    /api/categories                   → Lister catégories
POST   /api/categories                   → Créer catégorie
```

**Tables Prestashop :**
- `ps_category` (catégories)
- `ps_category_lang` (noms)
- `ps_category_product` (liaisons)

---

### **API 4 : Customers** (Fichier 3)
```
GET    /api/customers?email=...          → Chercher par email
POST   /api/customers                    → Créer client
PUT    /api/customers/{id}               → Mettre à jour
```

**Tables Prestashop :**
- `ps_customer` (données client)
- `ps_address` (adresses)
- `ps_customer_group` (groupe client)

---

### **API 5 : Orders** (Fichier 3)
```
POST   /api/orders                       → Créer commande
POST   /api/orders/{id}/order_detail     → Ajouter lignes
```

**Tables Prestashop :**
- `ps_orders` (en-tête commande)
- `ps_order_detail` (lignes produits)
- `ps_order_state_lang` (états)

---

## 🔴 LES DÉCALAGES COLONNE / TABLE

### Exemple 1 : Fichier 1 → Produit

```
CSV Column          →  Prestashop Table.Column       → Type
──────────────────────────────────────────────────────────
reference          →  ps_product.reference           STRING
nom                →  ps_product_lang.name           STRING
date_availability  →  ps_product.date_add            DATETIME
prix_ttc           →  ps_product_shop.price          DECIMAL
Taxe (%)           →  ps_product.id_tax_rules_group  FK
prix_achat         →  ps_product.wholesale_price     DECIMAL
categorie (nom)    →  ps_category_lang.name + liaison FK
```

**Problème :**
- `categorie` en CSV = **NOM** ("Akanjo")
- Prestashop = **ID** (foreign key)
- Il faut : **Chercher l'ID par le nom** ou **créer la catégorie**

---

### Exemple 2 : Fichier 2 → Déclinaison

```
CSV Column      →  Prestashop           → Processus
────────────────────────────────────────────────────────────────
reference       →  ps_product.id        Chercher ID produit
specificité     →  ps_attribute_group   Créer si absent (Taille, Couleur)
karazany        →  ps_attribute         Créer si absent (ngoza, kely)
stock_initial   →  ps_stock_available   Insérer stock par déclinaison
prix_vente_ttc  →  ps_product_attribute_shop.price   Si ≠ prix base
```

**Processus complexe :**
```
1. Chercher produit via reference
   SELECT id_product FROM ps_product WHERE reference = 'T_01'
   
2. Créer groupe attribut "Taille"
   INSERT INTO ps_attribute_group...
   
3. Créer attribut "ngoza"
   INSERT INTO ps_attribute...
   
4. Créer combinaison (produit + attributs)
   INSERT INTO ps_product_attribute...
   
5. Créer stock pour cette combinaison
   INSERT INTO ps_stock_available...
```

---

### Exemple 3 : Fichier 3 → Commande

```
CSV Format                  →  Prestashop          → Transformation
──────────────────────────────────────────────────────────────────
"[(""T_01"";3;""ngoza"")]" →  ps_order_detail     Parser + 1 row/article
"paiement accepté"         →  ps_orders.current_state  TEXT → state_id
rakoto@yopmail.com         →  ps_customer.email   Créer si absent
```

**Parser le format achat :**
```javascript
// CSV Input: "[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"

// Regex: /\("([^"]+)";"(\d+)";"([^"]*)"\)/g
// Groups: [reference, quantity, attribute]

// Output array:
[
  { reference: 'T_01', quantity: 3, attribute: 'ngoza' },
  { reference: 'C_03', quantity: 1, attribute: '' }
]
```

---

## ✅ SOLUTION PROPOSÉE

### **4 Phases d'Import**

| Phase | Étape | Entrée | Sortie |
|-------|-------|--------|--------|
| **1** | Validation | 3 CSV | Rapport conformité |
| **2** | Import Produits | fichier1 + 2 | ✅ Produits + Attributs + Stock |
| **3** | Import Clients | fichier3 (clients) | ✅ Customers + Addresses |
| **4** | Import Commandes | fichier3 (commandes) | ✅ Orders + Order Details |

### **Implémentation : Approche Hybride Recommandée**

```
ÉTAPE A : Valider via API REST Prestashop
├─ Vérifier intégrité données
├─ Détecter doublons
└─ Collecter les IDs existants

ÉTAPE B : Insérer via SQL Transactionnel
├─ Performance optimale
├─ Batch insert
└─ Rollback si erreur

ÉTAPE C : Ré-valider Post-Import
├─ Vérifier tous les IDs
├─ Recalculer stocks
└─ Ré-indexer cache
```

---

## 🚀 PROCHAINES ÉTAPES (Si demandé)

1. **Créer service d'import Node.js/React**
   - Parser CSV
   - Valider contre Prestashop API
   - Générer SQL transactionnel

2. **Implémenter le mapping**
   - Référencer documents `ANALYSE_IMPORT_DONNEES.md` et `MAPPING_DETAILLE_IMPORT.md`
   - Créer tables de mapping temporaires

3. **Exécuter import**
   - Phase par phase
   - Avec rollback test

4. **Tests post-import**
   - Vérifier intégrité
   - Synchroniser stocks
   - Valider commandes

---

## 📚 DOCUMENTS DE RÉFÉRENCE

- **`ANALYSE_IMPORT_DONNEES.md`** : Analyse complète + mapping détaillé + SQL exemples
- **`MAPPING_DETAILLE_IMPORT.md`** : Tableau mapping + parsers + checklist
- **Fichiers API XML** : `Les_AIP.xml` (endpoints Prestashop)
- **Structure DB** : `create.sql` (tables SQL)

