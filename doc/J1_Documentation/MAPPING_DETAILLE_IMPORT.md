# MAPPING CSV → PRESTASHOP

## Fichier 1 — Produits (`1-Produits.csv`)

Colonnes : `date_availability_produit`, `nom`, `reference`, `prix_ttc`, `Taxe`, `categorie`, `prix_achat`

| Colonne CSV | Traitement dans le code | Champ PrestaShop |
|-------------|------------------------|-----------------|
| `date_availability_produit` | `formatDate("01/12/2025")` → `"2025-12-01 00:00:00"` | `<date_add>` |
| `nom` | `.trim()` + slugify pour `link_rewrite` | `<name><language id="1">` |
| `reference` | `.trim().toUpperCase()` | `<reference>` |
| `prix_ttc` | `parseFloat("12,5") / (1 + taxRate/100)` = prix HT | `<price>` |
| `Taxe` | `findTaxGroupId("11,65%")` via `taxes` → `tax_rules` | `<id_tax_rules_group>` |
| `categorie` | `findOrCreateCategory("Akanjo")` via `categories` | `<id_category_default>` + `associations/categories` |
| `prix_achat` | `parseFloat("8,5")` — stocké en HT directement | `<wholesale_price>` |

**Exemple de données test :**
```
01/12/2025, Tshirt, T_01, "12,5", "11,65%", Akanjo, "8,5"
  → price_ht = 12.5 / 1.1165 = 11.1959...
  → wholesale = 8.5
  → produit T_01 créé avec ID 20
```

---

## Fichier 2 — Déclinaisons & Stock (`2-Déclinaisons&Stock.csv`)

Colonnes : `reference`, `specificité`, `karazany`, `stock_initial`, `prix_vente_ttc`

| Colonne CSV | Traitement dans le code | Champ PrestaShop |
|-------------|------------------------|-----------------|
| `reference` | `getProductInfo(ref)` ← cache fichier 1 | `<id_product>` |
| `specificité` | `findOrCreateAttrGroup("taille")` → `product_options` | `associations/product_option_values` |
| `karazany` | `findOrCreateAttrValue("ngoza", groupId)` → `product_option_values` | idem |
| `stock_initial` | `parseInt` → PUT `stock_availables/{id}` | `<quantity>` |
| `prix_vente_ttc` | `combHt - productInfo.price_ht` = delta | `<price>` (delta, pas valeur absolue) |

**Cas sans attributs** (specificité et karazany vides) :
- Pas de combinaison créée
- Juste PUT `stock_availables` pour le produit (id_product_attribute = 0)

**Exemple de données test :**
```
T_01, taille, ngoza, 13, "12,5"
  → groupId = findOrCreate("taille")
  → valueId = findOrCreate("ngoza", groupId)
  → combinaison créée ID 40
  → stock 13 mis à jour

C_03, , , 10,              ← sans attributs
  → updateStock(productId=22, combinationId=0, qty=10)
```

**Calcul du delta de prix :**
```
combTtc   = 15
combHt    = 15 / (1 + 11.65/100) = 13.435...
priceDelta = 13.435 - 11.195 = +2.24
→ <price>2.240000</price>  (s'ajoute au prix de base)
```

---

## Fichier 3 — Clients & Commandes (`3-Clients&Commandes.csv`)

Colonnes : `date`, `nom`, `email`, `pwd`, `adresse`, `achat`, `etat`

### Données client

| Colonne CSV | Traitement | Ressource PrestaShop |
|-------------|-----------|---------------------|
| `email` | `.toLowerCase()` + findOrCreate | `<email>` dans `customers` |
| `nom` | split → `firstname` + `lastname` | `<firstname>`, `<lastname>` |
| `pwd` | transmis tel quel | `<passwd>` |
| `adresse` | transmis tel quel | `<address1>` + `<city>` dans `addresses` |

### Données commande

| Colonne CSV | Traitement | Ressource PrestaShop |
|-------------|-----------|---------------------|
| `date` | `formatDate("09/05/2026")` | `<date_add>` dans `orders` |
| `etat` | mapping statique texte → ID | `<current_state>` |
| `achat` | regex parser (voir ci-dessous) | `associations/order_rows` |

### Parser du champ `achat`

**Format brut CSV** (avant parsing PapaParse) :
```
"[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"
```

**Après parsing PapaParse** (les `""` deviennent `"`) :
```
[("T_01";3;"ngoza"),("C_03";1;"")]
```

**Regex appliquée** dans `parseOrderItems()` :
```javascript
const regex = /\("([^"]+)";(\d+);"([^"]*)"\)/g;
// Groupe 1 → reference
// Groupe 2 → quantity
// Groupe 3 → attribute (peut être vide)
```

**Résultat** :
```javascript
[
  { reference: "T_01", quantity: 3, attribute: "ngoza" },
  { reference: "C_03", quantity: 1, attribute: null }
]
```

### Mapping des états de commande

| Texte CSV | ID PrestaShop | Description |
|-----------|:------------:|-------------|
| `en attente paiement à la livraison` | `9` | On backorder (paid) |
| `paiement accepté` | `2` | Payment accepted |
| `erreur de paiement` | `8` | Payment error |
| (valeur inconnue) | `1` | Awaiting check payment |

---

## Champ obligatoire non documenté

**`conversion_rate`** dans les commandes : taux de conversion de la devise.
Valeur par défaut : `1.000000` (boutique en devise unique).
Sans ce champ → erreur PrestaShop code 41 : *"parameter conversion_rate required"*.

---

## Dépendances entre fichiers

```
Fichier 1 (produits)
    └─ fournit : setProductInfo(reference, { id, price_ht, tax_rate, name })

Fichier 2 (déclinaisons) dépend de fichier 1
    └─ lit     : getProductInfo(reference)     → produit existant
    └─ fournit : setCombinationId(ref, attr, id)

Fichier 3 (commandes) dépend de fichiers 1 et 2
    └─ lit     : getProductInfo(reference)     → nom + prix pour order_rows
    └─ lit     : getCombinationId(ref, attr)   → id_product_attribute
```

Le cache mémoire (`prestashopCache.js`) remplace les tables temporaires.
Il est réinitialisé par `resetCache()` au début de chaque import.
