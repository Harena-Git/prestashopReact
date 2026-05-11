# ARCHITECTURE — IMPORT CSV VERS PRESTASHOP

## Page d'accès

```
http://localhost:5173/admin/modules/data-import
```

---

## Fichiers du système d'import

```
src/features/modules/
├── pages/
│   ├── DataImportPage.jsx        — Interface : upload, log en direct, résultats
│   └── DataImportPage.css        — Styles de la page
└── services/
    ├── csvParser.js              — Parse un fichier CSV → tableau de lignes
    ├── prestashopCache.js        — Cache mémoire + lookups API (findOrCreate)
    ├── xmlBuilder.js             — Constructeurs XML par ressource PrestaShop
    ├── importProducts.js         — Import fichier 1 (produits)
    ├── importCombinations.js     — Import fichier 2 (déclinaisons + stock)
    ├── importCustomersOrders.js  — Import fichier 3 (clients + commandes)
    └── importOrchestrator.js     — Séquencement + politique All or Nothing
```

---

## Flux complet

```
[Utilisateur choisit 1, 2 ou 3 fichiers CSV]
          │
          ▼
   importOrchestrator.runImport(files, onLog)
          │
          ├─ 1. resetCache()
          │
          ├─ 2. parseCsvFile(fichier1) → rows
          │       └─ importProducts(rows, log)
          │             ├─ findOrCreateCategory(row.categorie)
          │             ├─ findTaxGroupId(row.Taxe)
          │             ├─ buildProductXml({...})
          │             ├─ postXml("products", xml) → productId
          │             └─ setProductInfo(reference, { id, price_ht, tax_rate })
          │
          ├─ 3. parseCsvFile(fichier2) → rows
          │       └─ importCombinations(rows, log)
          │             ├─ getProductInfo(reference) ← cache du fichier 1
          │             ├─ findOrCreateAttrGroup(row.specificité)
          │             ├─ findOrCreateAttrValue(row.karazany, groupId)
          │             ├─ buildCombinationXml({...})
          │             ├─ postXml("combinations", xml) → combinationId
          │             ├─ setCombinationId(reference, karazany, combinationId)
          │             └─ updateStock(productId, combinationId, quantity)
          │
          └─ 4. parseCsvFile(fichier3) → rows
                  └─ importCustomersOrders(rows, log)
                        ├─ findOrCreateCustomer(email, ...)
                        ├─ postXml("addresses", buildAddressXml(...)) → addressId
                        ├─ postXml("carts", buildCartXml(...)) → cartId
                        ├─ parseOrderItems(row.achat) → [{reference, qty, attr}]
                        ├─ getProductInfo(reference)  ← cache fichier 1
                        ├─ getCombinationId(ref, attr) ← cache fichier 2
                        └─ postXml("orders", buildOrderXml(...)) → orderId
```

---

## Rôle de chaque fichier

### `csvParser.js`
```javascript
parseCsvFile(file) → Promise<rows[]>
```
Enveloppe `Papa.parse` avec `header: true`. Retourne un tableau d'objets JS avec les noms de colonnes comme clés.

---

### `prestashopCache.js`
Cache mémoire unique par session d'import. Évite les requêtes doublons.

| Fonction | Rôle |
|----------|------|
| `resetCache()` | Vide le cache avant chaque import |
| `postXml(resource, xml)` | POST XML → retourne le texte XML de réponse |
| `putXml(resourcePath, xml)` | PUT XML sur un ID existant (stock, etc.) |
| `findOrCreateCategory(name)` | Cherche par nom, crée si absent |
| `findTaxGroupId(rateStr)` | Lookup `taxes` → `tax_rules` → `id_tax_rules_group` |
| `setProductInfo(ref, info)` | Stocke `{ id, price_ht, tax_rate, name }` en cache |
| `getProductInfo(ref)` | Récupère les infos produit du cache |
| `findOrCreateAttrGroup(name)` | Cherche/crée dans `product_options` |
| `findOrCreateAttrValue(name, groupId)` | Cherche/crée dans `product_option_values` |
| `setCombinationId(ref, attr, id)` | Stocke `"T_01:ngoza" → combinationId` |
| `getCombinationId(ref, attr)` | Retourne l'ID combinaison (0 si sans attribut) |
| `findOrCreateCustomer(email, ...)` | Cherche par email, crée si absent |

---

### `xmlBuilder.js`
Fonctions pures qui retournent des chaînes XML valides pour l'API PrestaShop.

| Fonction | Ressource créée |
|----------|----------------|
| `buildProductXml({reference, name, price_ht, ...})` | `POST /api/products` |
| `buildCombinationXml({product_id, option_value_id, price_delta})` | `POST /api/combinations` |
| `buildStockXml({id, product_id, combination_id, quantity})` | `PUT /api/stock_availables/{id}` |
| `buildAddressXml({customer_id, firstname, ...})` | `POST /api/addresses` |
| `buildCartXml({customer_id, address_id, date_add})` | `POST /api/carts` |
| `buildOrderXml({customer_id, address_id, cart_id, ...})` | `POST /api/orders` |
| `formatDate(ddmmyyyy)` | `"01/12/2025"` → `"2025-12-01 00:00:00"` |

> **Note prix** : PrestaShop stocke le prix SANS taxe (HT).
> Calcul : `prix_ht = prix_ttc / (1 + taux / 100)`

---

### `importProducts.js`
```javascript
importProducts(rows, log) → { inserted, total, errors }
```

Pour chaque ligne du fichier 1 :
1. `findOrCreateCategory(row.categorie)`
2. `findTaxGroupId(row.Taxe)` — lookup correct via `taxes` + `tax_rules`
3. Calcul prix HT depuis TTC et taux
4. `buildProductXml(...)` + `postXml("products", xml)`
5. `setProductInfo(reference, { id, price_ht, tax_rate, name })`

---

### `importCombinations.js`
```javascript
importCombinations(rows, log) → { inserted, total, errors }
```

Pour chaque ligne du fichier 2 :
- **Sans attributs** (specificité/karazany vides) : `updateStock(productId, 0, qty)`
- **Avec attributs** :
  1. `findOrCreateAttrGroup(specificité)` → `product_options`
  2. `findOrCreateAttrValue(karazany, groupId)` → `product_option_values`
  3. Calcul delta prix : `combHt - productInfo.price_ht`
  4. `buildCombinationXml(...)` + `postXml("combinations", xml)`
  5. `setCombinationId(ref, karazany, combinationId)`
  6. `updateStock(productId, combinationId, qty)` via GET + PUT `stock_availables`

---

### `importCustomersOrders.js`
```javascript
importCustomersOrders(rows, log) → { inserted, customers, orders, total, errors }
```

Pour chaque ligne du fichier 3 :
1. `findOrCreateCustomer(email, nom, pwd, dateAdd)`
2. `postXml("addresses", buildAddressXml(...))`
3. `postXml("carts", buildCartXml(...))` — requis par PrestaShop pour créer une commande
4. `parseOrderItems(row.achat)` — regex : `/\("([^"]+)";(\d+);"([^"]*)"\)/g`
5. Résolution IDs depuis le cache (produits + combinaisons)
6. `postXml("orders", buildOrderXml(...))` — inclut `conversion_rate: 1.000000`

**Mapping état commande :**

| Texte CSV | ID PrestaShop |
|-----------|--------------|
| `en attente paiement à la livraison` | `9` |
| `paiement accepté` | `2` |
| `erreur de paiement` | `8` |
| (autre) | `1` (défaut) |

---

### `importOrchestrator.js`
```javascript
runImport(files, onLog) → results[]
```

Séquencement avec **All or Nothing** par fichier :
- Si fichier 1 a des erreurs → arrêt, fichiers 2 et 3 non traités
- Si fichier 2 a des erreurs → arrêt, fichier 3 non traité
- Les erreurs dans fichier 3 ne bloquent pas les autres lignes (chaque commande est indépendante)

---

## Politique All or Nothing

L'insertion n'est **pas transactionnelle au niveau SQL** (chaque ressource est insérée via l'API REST indépendamment). La politique s'applique au niveau du fichier :

- Si un fichier contient des erreurs → l'orchestrateur s'arrête
- Les lignes déjà insérées avant l'erreur restent en base
- Pour annuler : utiliser le script SQL dans `RESUME_PROBLEME_IMPORT.md`
