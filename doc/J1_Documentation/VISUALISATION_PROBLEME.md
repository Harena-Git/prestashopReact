# 📐 VISUALISATION DU PROBLÈME D'IMPORT

## 🎯 LE PROBLÈME EN SCHÉMA SIMPLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  VOS FICHIERS CSV                  vs    BASE PRESTASHOP            │
│  (Format Métier)                         (Structure Technique)      │
│                                                                     │
│  ┌──────────────────┐                    ┌──────────────────────┐  │
│  │ Fichier 1        │                    │ Table ps_product     │  │
│  │ ─────────────    │                    │ ────────────────────│  │
│  │ reference        │───────────────────→│ reference (STRING)   │  │
│  │ nom              │───────────────────→│ name → ps_product_   │  │
│  │ date_...         │───────────────────→│ lang.name            │  │
│  │ prix_ttc         │───────────────────→│ price → ps_product_  │  │
│  │ Taxe (11.65%)    │ ⚠️ PROBLÈME!      │ shop.price           │  │
│  │ prix_achat       │  Texte → ID       │ id_tax_rules_group   │  │
│  │ categorie (nom)  │  🔴 MAPPING       │ → ps_tax_rules_group │  │
│  │                  │                    │ id → category (FK)   │  │
│  └──────────────────┘                    │ → ps_category_product│  │
│                                          └──────────────────────┘  │
│                                                                     │
│  ┌──────────────────┐                    ┌──────────────────────┐  │
│  │ Fichier 2        │                    │ ps_attribute_group   │  │
│  │ ─────────────    │                    │ ─────────────────────│  │
│  │ reference        │───FK───────────────│ (Chercher par nom)   │  │
│  │ specificité      │ ⚠️ MAPPING!        │                      │  │
│  │ (Groupe attr)    │ Texte → Créer      │ ps_attribute         │  │
│  │ karazany         │ Texte → Chercher   │ ─────────────────────│  │
│  │ (Valeur attr)    │                    │ (Créer si absent)    │  │
│  │ stock_initial    │───────────────────→│ ps_stock_available   │  │
│  │ prix_vente_ttc   │───────────────────→│ ps_product_attribute │  │
│  │                  │                    │ _shop.price          │  │
│  └──────────────────┘                    └──────────────────────┘  │
│                                                                     │
│  ┌──────────────────┐                    ┌──────────────────────┐  │
│  │ Fichier 3        │                    │ ps_customer          │  │
│  │ ─────────────    │                    │ ─────────────────────│  │
│  │ nom              │───────────────────→│ lastname (STRING)    │  │
│  │ email            │───UNIQUE──────────→│ email (UNIQUE)       │  │
│  │ pwd              │───────────────────→│ passwd (hash)        │  │
│  │ adresse          │───────────────────→│ ps_address           │  │
│  │ date             │───────────────────→│ ps_orders.date_add   │  │
│  │ achat            │ ⚠️ FORMAT         │ ps_order_detail      │  │
│  │ (format spécial) │ COMPLEXE! PARSER  │ (multi-rows)         │  │
│  │                  │ \"[(ref;qty;attr)]\"│                      │  │
│  │ etat             │ TEXT → state_id    │ ps_orders.current_   │  │
│  │ (\"paiement...\")   │ MAPPING          │ state                │  │
│  └──────────────────┘                    └──────────────────────┘  │
│                                                                     │
│  🔴 = DÉCALAGE = DOIT ÊTRE MAPPÉ                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 LES 3 TYPES DE DÉCALAGES

### **DÉCALAGE 1 : Texte → ID (Chercher/Créer)**

```
CSV INPUT                  TRANSFORMATION             PRESTASHOP OUTPUT
┌─────────────────┐        ┌──────────────────┐      ┌───────────────┐
│ categorie:      │        │ SELECT id FROM   │      │ id_category:  │
│ "Akanjo"        │───────→│ ps_category WHERE│─────→│ 1             │
│                 │        │ name = "Akanjo"  │      │               │
│                 │        │ Si absent → POST │      │               │
│                 │        │ (créer)          │      │               │
└─────────────────┘        └──────────────────┘      └───────────────┘

CSV INPUT                  TRANSFORMATION             PRESTASHOP OUTPUT
┌─────────────────┐        ┌──────────────────┐      ┌───────────────┐
│ Taxe:           │        │ SELECT id FROM   │      │ id_tax_rules_ │
│ "11.65%"        │───────→│ ps_tax_rules_    │─────→│ group: 1      │
│                 │        │ group WHERE      │      │               │
│                 │        │ rate = 11.65     │      │               │
│                 │        │ Si absent → POST │      │               │
└─────────────────┘        └──────────────────┘      └───────────────┘
```

---

### **DÉCALAGE 2 : Structure Multi-Niveaux (Hiérarchie)**

```
FICHIER 1 : 1 produit
    ↓
FICHIER 2 : 6 lignes (3 produits × déclinaisons)

Exemple avec T_01 :

Fichier 2 row 1 :  T_01 + Taille + ngoza → INSERT ps_attribute_group + ps_attribute + ps_product_attribute + stock
Fichier 2 row 2 :  T_01 + Taille + kely  → SKIP ps_attribute_group (existe) + ps_attribute + ps_product_attribute + stock

Fichier 2 row 3 :  P_01 + Couleur + mainty → INSERT ps_attribute_group + ps_attribute + ps_product_attribute + stock
Fichier 2 row 4 :  P_01 + Couleur + fotsy  → SKIP ps_attribute_group + ps_attribute + ps_product_attribute + stock

Fichier 2 row 5 :  C_03 + (vide) → SKIP attributs + stock seulement
Fichier 2 row 6 :  M_02 + (vide) → SKIP attributs + stock seulement

RÉSULTAT :
  Groupe "Taille" : 1 fois créé
  Groupe "Couleur" : 1 fois créé
  Attribut "ngoza" : 1 fois créé
  Attribut "kely" : 1 fois créé
  etc.
```

---

### **DÉCALAGE 3 : Format Personnalisé (Parser)**

```
CSV INPUT                    PARSER                 PRESTASHOP INPUT
┌─────────────────────────┐  ┌────────────────────┐ ┌──────────────────┐
│ achat:                  │  │ Regex extract:     │ │ Array items:     │
│ "[(""T_01"";3;""ngoza"")│  │ \("([^"]+)";"      │ │                  │
│ ,(""C_03"";1;"""")]"    │─→│ (\d+)";"([^"]*)    │→│ [{               │
│                         │  │ \)/g               │ │   ref: "T_01",   │
│ Format très spécial !   │  │                    │ │   qty: 3,        │
│                         │  │ Résultat :         │ │   attr: "ngoza"  │
│                         │  │ [                  │ │ }, {             │
│                         │  │   {                │ │   ref: "C_03",   │
│                         │  │     ref: "T_01",  │ │   qty: 1,        │
│                         │  │     qty: 3,       │ │   attr: null     │
│                         │  │     attr: "ngoza" │ │ }]               │
│                         │  │   },               │ │                  │
│                         │  │   {                │ │                  │
│                         │  │     ref: "C_03",  │ │                  │
│                         │  │     qty: 1,       │ │                  │
│                         │  │     attr: null    │ │                  │
│                         │  │   }                │ │                  │
│                         │  │ ]                  │ │                  │
└─────────────────────────┘  └────────────────────┘ └──────────────────┘
```

---

## 📊 FLUX D'IMPORT SIMPLIFIÉ

```
START
  │
  ├─→ [FICHIER 1] IMPORT PRODUITS
  │   ├─ Lire lignes
  │   ├─ Chercher/Créer catégories (par nom)
  │   ├─ Chercher/Créer groupes taxe (par taux %)
  │   ├─ Créer produits (INSERT ps_product)
  │   ├─ Créer noms produits multilingues (INSERT ps_product_lang)
  │   ├─ Lier à boutique (INSERT ps_product_shop)
  │   └─ Lier catégories (INSERT ps_category_product)
  │
  ├─→ [FICHIER 2] IMPORT DÉCLINAISONS & STOCK
  │   ├─ Lire lignes
  │   ├─ Pour chaque ligne :
  │   │   ├─ Chercher produit via reference (FK)
  │   │   ├─ Créer groupe attribut si absent
  │   │   ├─ Créer attribut si absent
  │   │   ├─ Créer combinaison (déclinaison)
  │   │   ├─ Définir prix spécifique
  │   │   └─ Insérer stock
  │
  ├─→ [FICHIER 3] IMPORT CLIENTS
  │   ├─ Lire lignes
  │   ├─ Pour chaque client :
  │   │   ├─ Chercher par email (UNIQUE)
  │   │   ├─ Si absent → Créer client (INSERT ps_customer)
  │   │   ├─ Créer adresse (INSERT ps_address)
  │
  ├─→ [FICHIER 3] IMPORT COMMANDES
  │   ├─ Lire lignes
  │   ├─ Pour chaque commande :
  │   │   ├─ Parser format "achat" (REGEX)
  │   │   ├─ Chercher états de commande (TEXT → ID)
  │   │   ├─ Créer commande (INSERT ps_orders)
  │   │   ├─ Créer détails pour chaque article (INSERT ps_order_detail multi-rows)
  │
  └─→ VALIDATION POST-IMPORT
      ├─ Vérifier FK intégrité
      ├─ Recalculer stocks
      └─ END ✅

```

---

## 🔍 EXEMPLE CONCRET : T_01 à travers les 3 fichiers

### Fichier 1 : Produit T_01

```
CSV :  01/12/2025  |  Tshirt  |  T_01  |  12,5  |  11,65%  |  Akanjo  |  8,5

INSERT ps_product
  reference = 'T_01'
  name = 'Tshirt' (via ps_product_lang)
  price = 12.50
  wholesale_price = 8.50
  id_tax_rules_group = 1 (ou créer si absent)
  date_add = '2025-12-01 00:00:00'

INSERT ps_category_product
  id_product = 1 (nouveau)
  id_category = 5 (Akanjo, cherché/créé)

→ Produit T_01 créé ✓
```

### Fichier 2 : Déclinaisons de T_01

```
CSV row 1 :  T_01  |  taille  |  ngoza  |  13  |  12,5
CSV row 2 :  T_01  |  taille  |  kely   |  10  |  15

Row 1 (ngoza) :
  Chercher ps_attribute_group "Taille" → absent → créer (id=1)
  Chercher ps_attribute "ngoza" dans groupe 1 → absent → créer (id=8)
  INSERT ps_product_attribute (id_product=1, id_attribute_group=1)
    → id_product_attribute = 15
  INSERT ps_product_attribute_combination
    (id_product_attribute=15, id_attribute=8)
  INSERT ps_stock_available
    (id_product=1, id_product_attribute=15, quantity=13)
  Prix = 12.5 (égal prix produit, ne pas override)

Row 2 (kely) :
  Chercher ps_attribute_group "Taille" → EXISTE (id=1) ✓
  Chercher ps_attribute "kely" dans groupe 1 → absent → créer (id=9)
  INSERT ps_product_attribute (id_product=1, id_attribute_group=1)
    → id_product_attribute = 16
  INSERT ps_product_attribute_combination
    (id_product_attribute=16, id_attribute=9)
  INSERT ps_stock_available
    (id_product=1, id_product_attribute=16, quantity=10)
  Prix = 15 (≠ 12.5, override)
  INSERT ps_product_attribute_shop
    (id_product_attribute=16, price=15.00)

→ 2 déclinaisons de T_01 créées ✓
```

### Fichier 3 : Commande contenant T_01

```
CSV :  09/05/2026  |  Rakoto  |  rakoto@yopmail.com  |  XvzsX...  |  
       Andoharanofotsy  |  [(""T_01"";3;""ngoza"")]  |  en attente paiement

Parse achat :
  Input  : [(""T_01"";3;""ngoza"")]
  Output : [{ ref: "T_01", qty: 3, attr: "ngoza" }]

Chercher client par email :
  SELECT id FROM ps_customer WHERE email = 'rakoto@yopmail.com'
  → absent → INSERT ps_customer

INSERT ps_address (pour client)
  address1 = "Andoharanofotsy"

INSERT ps_orders
  id_customer = (nouveau)
  current_state = 1 (en attente paiement)
  date_add = '2026-05-09 00:00:00'

Pour chaque article parsé (T_01 qty 3 ngoza):
  INSERT ps_order_detail
    id_product = 1 (chercher via reference T_01)
    id_product_attribute = 15 (chercher combinaison ngoza)
    product_quantity = 3

→ Commande créée avec T_01 ✓
```

---

## 📝 RÉSUMÉ EN 4 POINTS

| Point | Problème | Solution |
|-------|----------|----------|
| **1** | Colonnes CSV métier ≠ colonnes Prestashop | Créer tableau de mapping (FAIT) |
| **2** | Valeurs texte CSV → IDs numériques Prestashop | Chercher par clé métier ou créer |
| **3** | Structure hiérarchique (groupes → attributs → produits) | Insérer dans l'ordre, dédupliquer |
| **4** | Format personnalisé (ex: achat) | Parser via regex + transformer |

---

## 🚀 PROCHAINES ÉTAPES

1. **Développer un script Node.js** qui utilise le mapping
2. **Tester sur données de développement**
3. **Exécuter import par phases** (produits → déclinaisons → commandes)
4. **Valider intégrité post-import**

Tous les détails techniques sont dans les fichiers :
- `RESUME_PROBLEME_IMPORT.md` ← Lire EN PREMIER
- `ANALYSE_IMPORT_DONNEES.md` ← Analyse complète
- `MAPPING_DETAILLE_IMPORT.md` ← Tableaux détaillés
- `API_ENDPOINTS_PRESTASHOP.md` ← Appels API

