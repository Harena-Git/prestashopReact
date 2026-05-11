# 🗺️ TABLEAU DE MAPPING DÉTAILLÉ CSV → PRESTASHOP

## FICHIER 1 : Produits de Base

### Mapping Colonne par Colonne

```
┌─────────────────────────┬──────────────────────┬──────────────────────────────────────────┐
│ CSV Colonne             │ Préstashop Table     │ Détails                                  │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ reference               │ ps_product           │ → reference (string, unique)             │
│                         │                      │   Clé pour jointure fichier 2 & 3       │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ nom                     │ ps_product_lang      │ → name (string)                          │
│                         │ (id_lang=1 FR)       │   Multilingue (stocker id_lang)         │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ date_availability_      │ ps_product           │ → date_add (datetime)                    │
│ produit                 │                      │   Format: 01/12/2025 → 2025-12-01       │
│ (DD/MM/YYYY)            │                      │   Heure: 00:00:00                       │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ prix_ttc                │ ps_product_shop      │ → price (decimal 10,2)                   │
│ (12,5)                  │ (id_shop=1)          │   Valeur directe ou convertir format    │
│                         │                      │   "12,5" → 12.50                        │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Taxe (11,65%)           │ ps_tax_rules_group + │ Créer groupe taxe si inexistant         │
│                         │ ps_tax_rule          │ Taux= 11.65 ou 5.60 %                  │
│                         │ + ps_product         │ → id_tax_rules_group (FK)               │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ prix_achat              │ ps_product           │ → wholesale_price (decimal 10,2)        │
│ (8,5)                   │ ou champ custom      │   OU créer colonne personnalisée        │
├─────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ categorie               │ ps_category_lang     │ 1. Chercher catégorie par nom           │
│ (Akanjo, Accessoire)    │ + ps_category_       │ 2. Si absent → créer ps_category        │
│                         │ product (liaison)    │ 3. Créer liaison ps_category_product    │
│                         │ + ps_category_shop   │ 4. Lier à la boutique (id_shop=1)      │
└─────────────────────────┴──────────────────────┴──────────────────────────────────────────┘
```

### Exemple d'Insertion Fichier 1

```sql
-- Étape 1 : Créer catégories
INSERT INTO ps_category (id_parent, date_add, date_upd, active)
VALUES (2, NOW(), NOW(), 1); -- id_parent=2 (racine)
-- Récupérer id_category généré

-- Étape 2 : Créer ou retrouver groupe taxe (11.65%)
SELECT id_tax_rules_group FROM ps_tax_rules_group WHERE name = 'Taxe 11.65%';
-- Si absent → INSERT

-- Étape 3 : Insérer produit
INSERT INTO ps_product (
  reference, 
  price,
  wholesale_price,
  id_tax_rules_group,
  date_add,
  active
) VALUES (
  'T_01',
  12.50,
  8.50,
  1, -- ou id réel
  '2025-12-01 00:00:00',
  1
);
-- Récupérer id_product

-- Étape 4 : Insérer traduction
INSERT INTO ps_product_lang (id_product, id_lang, name, description)
VALUES (
  @id_product,
  1, -- FR
  'Tshirt',
  'Description...'
);

-- Étape 5 : Lier à boutique
INSERT INTO ps_product_shop (id_product, id_shop, id_category_default, price, active)
VALUES (@id_product, 1, @id_category, 12.50, 1);

-- Étape 6 : Lier catégorie
INSERT INTO ps_category_product (id_category, id_product)
VALUES (@id_category, @id_product);

-- Étape 7 : Lier catégorie à boutique
INSERT INTO ps_category_shop (id_category, id_shop, position)
VALUES (@id_category, 1, 0);
```

---

## FICHIER 2 : Déclinaisons & Stock

### Mapping Colonne par Colonne

```
┌──────────────────┬──────────────────────────┬────────────────────────────────────────────┐
│ CSV Colonne      │ Prestashop Table         │ Détails                                    │
├──────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ reference        │ FOREIGN KEY              │ Chercher id_product via ps_product.reference│
│ (T_01, P_01...)  │ → ps_product.id_product  │ Si absent → ERREUR (dépend fichier 1)    │
├──────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ specificité      │ ps_attribute_group_lang  │ Groupe d'attribut (Taille, Couleur)      │
│ (taille, couleur)│ + ps_attribute_group     │ Chercher par nom, créer si absent        │
│                  │ + ps_attribute_group_shop│ Lier à boutique (id_shop=1)              │
├──────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ karazany         │ ps_attribute_lang        │ Valeur d'attribut (ngoza, kely, etc.)    │
│ (ngoza, kely)    │ + ps_attribute           │ Chercher par nom + id_attribute_group    │
│                  │ + ps_attribute_shop      │ Créer si absent                          │
├──────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ stock_initial    │ ps_stock_available       │ IMPORTANT : Par déclinaison (combinaison)│
│ (13, 10, 5...)   │                          │ quantity = stock_initial                 │
│                  │                          │ Pour la combinaison produit+attribut     │
├──────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ prix_vente_ttc   │ ps_product_attribute_shop│ Si ≠ prix produit → prix override        │
│ (12,5, 15, 23.49)│ + ps_product_attribute   │ Prix spécifique à la déclinaison         │
│                  │                          │ Si vide/égal → utiliser prix produit     │
└──────────────────┴──────────────────────────┴────────────────────────────────────────────┘
```

### Logique de Création Déclinaison

```
Pour T_01 + Taille + ngoza :

1. Trouver id_product (T_01)
   SELECT id_product FROM ps_product WHERE reference = 'T_01';

2. Trouver/Créer groupe attribut "Taille"
   SELECT id_attribute_group FROM ps_attribute_group_lang 
   WHERE name = 'Taille';
   
3. Trouver/Créer attribut "ngoza" dans groupe
   SELECT id_attribute FROM ps_attribute 
   WHERE id_attribute_group = @id_attr_group;
   
4. Créer combinaison (product_attribute)
   INSERT INTO ps_product_attribute (id_product, id_attribute_group)
   VALUES (@id_product, @id_attr_group);
   
5. Lier attribut à combinaison
   INSERT INTO ps_product_attribute_combination 
   (id_product_attribute, id_attribute)
   VALUES (@id_product_attribute, @id_attribute);
   
6. Créer stock
   INSERT INTO ps_stock_available (
     id_product,
     id_product_attribute,
     quantity
   ) VALUES (@id_product, @id_product_attribute, 13);
   
7. Si prix spécifique (15 vs 12.50)
   INSERT INTO ps_product_attribute_shop (
     id_product_attribute,
     id_shop,
     price
   ) VALUES (@id_product_attribute, 1, 15.00);
```

### Résultat Final Fichier 2

```
Produit T_01 :
├─ Taille:ngoza → Quantité:13  → Prix:12.50€ (hérita prix produit)
└─ Taille:kely  → Quantité:10  → Prix:15.00€ (prix spécifique)

Produit P_01 :
├─ Couleur:mainty → Quantité:5   → Prix:23.49€
└─ Couleur:fotsy  → Quantité:3   → Prix:18.99€

Produit C_03 :
└─ (pas d'attribut) → Quantité:10 → Prix:5.00€

Produit M_02 :
└─ (pas d'attribut) → Quantité:11 → Prix:56.00€
```

---

## FICHIER 3 : Commandes & Clients

### Mapping Colonne par Colonne

```
┌──────────────┬─────────────────────────┬────────────────────────────────────────────┐
│ CSV Colonne  │ Prestashop Table        │ Détails                                    │
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ nom          │ ps_customer             │ → lastname (string)                        │
│ (Rakoto)     │ + ps_address            │   firstName = "" (si absent)               │
│              │                         │   Utilisé aussi pour adresse               │
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ email        │ ps_customer             │ → email (UNIQUE)                           │
│              │                         │   Si existe déjà → PUT (mise à jour)      │
│              │                         │   Sinon → POST (création)                 │
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ pwd          │ ps_customer             │ → passwd (hash bcrypt/MD5)                │
│              │                         │   ⚠️  Checker format : plaintext vs hash  │
│              │                         │   Si plaintext → hasher avant insert      │
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ adresse      │ ps_address              │ → address1 ou city (string)               │
│ (Andoharanofo│                         │   Splitscreen si contient séparateur      │
│ tsy)         │                         │   "Ville, Rue" → address1=Rue, city=Ville│
│              │                         │   country_id = Madagascar (par défaut)    │
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ date         │ ps_orders               │ → date_add (datetime)                      │
│ (09/05/2026) │                         │   Format: 09/05/2026 → 2026-05-09 00:00:00│
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ achat        │ ps_order_detail (multi) │ Format complexe → parser                  │
│ (format)     │ + ps_orders             │   "[(""T_01"";3;""ngoza"")]"              │
│              │                         │   → 1 ligne par article                   │
│              │                         │   Voir parsing ci-après                   │
├──────────────┼─────────────────────────┼────────────────────────────────────────────┤
│ etat         │ ps_orders               │ → current_state (FK → ps_order_state_lang)│
│ (text)       │ + ps_order_state_lang   │   "en attente paiement" → state_id = ?   │
│              │                         │   Mapper texte → ID état                  │
└──────────────┴─────────────────────────┴────────────────────────────────────────────┘
```

### Parser Format "achat"

**Format d'entrée :**
```
"[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"
```

**Règles de parsing :**
- Format: `[(reference;quantité;attribut), ...]`
- Guillemets échappés: `""` = `"`
- Attribut peut être vide: `""` (pour produits sans attribut)

**Regex pour extraction :**
```javascript
const regex = /\("([^"]+)";"(\d+)";"([^"]*)"\)/g;
// Groupes: 1=reference, 2=quantité, 3=attribut

// Exemple:
// Input: "[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"
// Output:
[
  { reference: "T_01", quantity: 3, attribute: "ngoza" },
  { reference: "C_03", quantity: 1, attribute: "" }
]
```

**Transformation en order_detail :**
```sql
-- Pour chaque élément parsé:
INSERT INTO ps_order_detail (
  id_order,
  id_product,
  id_product_attribute, -- Si attribut
  product_name,
  product_quantity,
  unit_price_tax_excl,
  unit_price_tax_incl
) VALUES (
  @id_order,
  (SELECT id_product FROM ps_product WHERE reference = 'T_01'),
  @id_product_attribute, -- Si exists
  'T-shirt',
  3,
  10.71, -- Prix HT
  12.50  -- Prix TTC
);
```

### Mapping États de Commande

```
┌─────────────────────────────────┬──────────┬─────────────────────────┐
│ CSV État                        │ state_id │ Prestashop State        │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│ "en attente paiement à la       │    1     │ Pending payment         │
│  livraison"                     │          │                         │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│ "paiement accepté"              │    2     │ Payment accepted        │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│ "erreur de paiement"            │   14     │ Payment error           │
└─────────────────────────────────┴──────────┴─────────────────────────┘

IMPORTANT : Vérifier les IDs réels dans ps_order_state_lang
```

### Exemple Complet d'Insertion Fichier 3

```sql
-- CLIENT 1 : Rakoto

-- 1. Insérer/Mettre à jour client
INSERT INTO ps_customer (
  firstname,
  lastname,
  email,
  passwd,
  date_add,
  active
) VALUES (
  '',
  'Rakoto',
  'rakoto@yopmail.com',
  SHA1('XvzsX5O0!GBD0uXQ'), -- ou bcrypt selon config
  '2026-05-09 00:00:00',
  1
) ON DUPLICATE KEY UPDATE
  passwd = VALUES(passwd),
  date_upd = NOW();

-- Récupérer id_customer
SET @id_customer = LAST_INSERT_ID();

-- 2. Insérer adresse
INSERT INTO ps_address (
  id_customer,
  id_country,
  alias,
  lastname,
  firstname,
  address1,
  city,
  postcode,
  date_add,
  date_upd,
  active
) VALUES (
  @id_customer,
  136, -- Madagascar
  'Livraison',
  'Rakoto',
  '',
  'Andoharanofotsy',
  'Andoharanofotsy',
  '',
  NOW(),
  NOW(),
  1
);
SET @id_address = LAST_INSERT_ID();

-- 3. Insérer commande
INSERT INTO ps_orders (
  id_customer,
  id_address_invoice,
  id_address_delivery,
  current_state,
  date_add,
  valid
) VALUES (
  @id_customer,
  @id_address,
  @id_address,
  1, -- "en attente paiement"
  '2026-05-09 00:00:00',
  1
);
SET @id_order = LAST_INSERT_ID();

-- 4. Insérer détails commande
-- Article 1 : 3x T_01 (ngoza)
INSERT INTO ps_order_detail (id_order, id_product, id_product_attribute, product_name, product_quantity, unit_price_tax_excl, unit_price_tax_incl)
VALUES (@id_order, 1, 1, 'T-shirt - ngoza', 3, 10.71, 12.50);

-- Article 2 : 2x T_01 (kely) - RAJAO
-- ...
```

---

## 🔄 RÉSUMÉ FLUX D'IMPORT

```
CSV FILES                 VALIDATION              DATABASE INSERTION        OUTPUT
      │                        │                           │                   │
      ├─ fichier1.csv    │  Format check         │  1. Categories         │ ✅ Products
      │ (produits)       │  Encoding UTF-8       │  2. Tax groups         │ ✅ Attributes
      │                  │  Doublons             │  3. Products           │ ✅ Stock
      │                  │  Dates valides       │  4. Lang/Shop links     │
      │                  │                      │                         │
      ├─ fichier2.csv    │  FK de fichier1       │  5. Attr groups        │ ✅ Combinations
      │ (déclinaisons)   │  Stock > 0           │  6. Attributes         │
      │                  │  Prix numérique      │  7. Combinations       │
      │                  │                      │  8. Stock               │
      │                  │                      │                         │
      └─ fichier3.csv    │  Format achat ok?     │  9. Customers          │ ✅ Orders
        (commandes)       │  Email unique        │ 10. Addresses          │ ✅ Order details
                          │  FK fichier1+2       │ 11. Orders             │
                          │  États valides       │ 12. Order details      │
```

---

## 📋 CHECKLIST PRÉ-IMPORT

- [ ] Fichiers CSV encodés en UTF-8
- [ ] Séparateur = virgule `,`
- [ ] Guillemets = guillemets doubles `"`
- [ ] Dates au format DD/MM/YYYY
- [ ] Prix: décimal avec virgule (12,5) ou point (12.5) → normaliser
- [ ] Pas de BOM en début fichier
- [ ] Vérifier que toutes les références fichier 2 existent dans fichier 1
- [ ] États de commande fichier 3 existent dans ps_order_state
- [ ] Country_id par défaut défini pour adresses
- [ ] Mode "développement" : transaction ROLLBACK si erreur

