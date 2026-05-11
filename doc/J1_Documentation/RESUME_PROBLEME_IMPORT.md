# RÉSUMÉ — IMPORT CSV VERS PRESTASHOP

## Résultat de l'import (données test)

| Fichier | Lignes | Insertions | Statut |
|---------|--------|-----------|--------|
| `1-Produits.csv` | 4 | 4 produits (IDs 20–23) | ✅ OK |
| `2-Déclinaisons&Stock.csv` | 6 | 4 combinaisons + 2 stocks | ✅ OK |
| `3-Clients&Commandes.csv` | 3 | 3 clients, 3 commandes | ✅ OK (après fix `conversion_rate`) |

---

## Flux CSV → PrestaShop

```
CSV fichier 1 ──→ importProducts       ──→ POST /api/products
CSV fichier 2 ──→ importCombinations   ──→ POST /api/combinations + PUT /api/stock_availables
CSV fichier 3 ──→ importCustomersOrders──→ POST /api/customers + addresses + carts + orders
```

## Ordre obligatoire

```
1. Produits (fichier 1)
      ↓ cache les IDs produits
2. Déclinaisons & Stock (fichier 2)
      ↓ cache les IDs combinaisons
3. Clients & Commandes (fichier 3)
      ↓ résout les IDs produits + combinaisons pour les order_rows
```

Si le fichier 1 échoue → les fichiers 2 et 3 ne sont pas traités (All or Nothing).

---

## Transformations appliquées

| Colonne CSV | Valeur exemple | Transformation | Résultat |
|-------------|---------------|----------------|---------|
| `date_availability_produit` | `01/12/2025` | DD/MM/YYYY → YYYY-MM-DD | `2025-12-01 00:00:00` |
| `prix_ttc` | `12,5` | virgule → point, TTC → HT | `11.193...` |
| `Taxe` | `11,65%` | lookup via `/api/taxes` → `id_tax_rules_group` | `5` |
| `categorie` | `Akanjo` | findOrCreate `/api/categories` | `3` |
| `specificité` | `taille` | findOrCreate `/api/product_options` | `10` |
| `karazany` | `ngoza` | findOrCreate `/api/product_option_values` | `15` |
| `prix_vente_ttc` | `15` | delta HT vs produit de base | `+1.61...` |
| `achat` | `[("T_01";3;"ngoza")]` | regex parser | `[{ref, qty, attr}]` |
| `etat` | `paiement accepté` | mapping statique | `2` |

---

## Erreur rencontrée et corrigée

**`conversion_rate` required (code 41)** lors du POST `/api/orders`.

Cause : PrestaShop exige ce champ pour toutes les commandes, même avec une seule devise.
Fix : ajout de `<conversion_rate>1.000000</conversion_rate>` dans `buildOrderXml()`.

---

## Script de nettoyage (si besoin de ré-importer)

```sql
-- Combinaisons
DELETE FROM ps_product_attribute_combination WHERE id_product_attribute IN (40,41,42,43);
DELETE FROM ps_product_attribute_shop         WHERE id_product_attribute IN (40,41,42,43);
DELETE FROM ps_stock_available                WHERE id_product_attribute IN (40,41,42,43);
DELETE FROM ps_product_attribute              WHERE id_product_attribute IN (40,41,42,43);

-- Produits
DELETE FROM ps_category_product WHERE id_product IN (20,21,22,23);
DELETE FROM ps_stock_available  WHERE id_product IN (20,21,22,23) AND id_product_attribute = 0;
DELETE FROM ps_product_shop     WHERE id_product IN (20,21,22,23);
DELETE FROM ps_product_lang     WHERE id_product IN (20,21,22,23);
DELETE FROM ps_product          WHERE id_product IN (20,21,22,23);

-- Clients / adresses / paniers (IDs 3 et 4)
DELETE FROM ps_cart_product WHERE id_cart IN (SELECT id_cart FROM ps_cart WHERE id_customer IN (3,4));
DELETE FROM ps_cart     WHERE id_customer IN (3,4);
DELETE FROM ps_address  WHERE id_customer IN (3,4);
DELETE FROM ps_customer WHERE id_customer IN (3,4);
```

> Les groupes d'attributs (`taille`, `couleur`) et leurs valeurs ne sont pas supprimés
> car ils pourraient déjà exister. Vérifier leurs IDs avant de les supprimer.
