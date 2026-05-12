# API PRESTASHOP — ENDPOINTS UTILISÉS

## Configuration

```javascript
// src/api/prestashop.api.js
const API_KEY = "25Wx5346ZgrYsaaNnPYiIh2s565qH2ui";
const BASE_URL = "/api/";  // proxy Vite → localhost/prestashop_new/api/
```

**GET** → format JSON via `PrestashopClient.get(endpoint)`
**POST / PUT** → format XML via `postXml()` / `putXml()` dans `prestashopCache.js`

---

## Produits

### GET — lister ou filtrer
```
GET /api/products?filter[reference]=[T_01]&display=full&output_format=JSON
```

### POST — créer un produit
```
POST /api/products?ws_key=...
Content-Type: application/xml
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop><product>
  <id_category_default>3</id_category_default>
  <id_shop_default>1</id_shop_default>
  <reference>T_01</reference>
  <price>11.195906</price>          <!-- HT = TTC / (1 + taux/100) -->
  <wholesale_price>8.500000</wholesale_price>
  <id_tax_rules_group>5</id_tax_rules_group>
  <state>1</state>
  <active>1</active>
  <visibility>both</visibility>
  <available_for_order>1</available_for_order>
  <date_add>2025-12-01 00:00:00</date_add>
  <name><language id="1">Tshirt</language></name>
  <description><language id="1"><![CDATA[]]></language></description>
  <description_short><language id="1"><![CDATA[]]></language></description_short>
  <link_rewrite><language id="1">tshirt</language></link_rewrite>
  <associations>
    <categories><category><id>3</id></category></categories>
  </associations>
</product></prestashop>
```

---

## Combinaisons (déclinaisons)

### POST — créer une combinaison
```
POST /api/combinations?ws_key=...
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop><combination>
  <id_product>20</id_product>
  <price>2.240000</price>             <!-- delta vs prix produit de base -->
  <reference>T_01-kely</reference>
  <minimal_quantity>1</minimal_quantity>
  <default_on>0</default_on>
  <available_date>0000-00-00</available_date>
  <associations>
    <product_option_values>
      <product_option_value><id>16</id></product_option_value>
    </product_option_values>
  </associations>
</combination></prestashop>
```

---

## Stock

### GET — trouver le stock d'un produit / combinaison
```
GET /api/stock_availables?filter[id_product]=[20]&filter[id_product_attribute]=[40]&display=full&output_format=JSON
```

### PUT — mettre à jour la quantité
```
PUT /api/stock_availables/55?ws_key=...
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop><stock_available>
  <id>55</id>
  <id_product>20</id_product>
  <id_product_attribute>40</id_product_attribute>
  <id_shop>1</id_shop>
  <quantity>13</quantity>
  <depends_on_stock>0</depends_on_stock>
  <out_of_stock>2</out_of_stock>
</stock_available></prestashop>
```

---

## Catégories

### GET — chercher par nom
```
GET /api/categories?display=full&output_format=JSON
```
Puis filtrage JS : `cats.find(c => extractName(c.name) === "Akanjo")`

### POST — créer une catégorie
```
POST /api/categories?ws_key=...
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop><category>
  <id_parent>2</id_parent>
  <active>1</active>
  <name><language id="1">Akanjo</language></name>
  <link_rewrite><language id="1">akanjo</language></link_rewrite>
  <description><language id="1"><![CDATA[]]></language></description>
</category></prestashop>
```

---

## Groupes d'attributs (`product_options`)

### GET
```
GET /api/product_options?display=full&output_format=JSON
```

### POST
```xml
<prestashop><product_option>
  <is_color_group>0</is_color_group>
  <group_type>select</group_type>
  <name><language id="1">taille</language></name>
  <public_name><language id="1">taille</language></public_name>
</product_option></prestashop>
```

---

## Valeurs d'attributs (`product_option_values`)

### GET — filtrer par groupe
```
GET /api/product_option_values?filter[id_attribute_group]=[10]&display=full&output_format=JSON
```

### POST
```xml
<prestashop><product_option_value>
  <id_attribute_group>10</id_attribute_group>
  <name><language id="1">ngoza</language></name>
</product_option_value></prestashop>
```

---

## Taxes

### Lookup du groupe de taxe par taux — séquence réelle dans le code
```
1. GET /api/taxes?filter[rate]=[11.650]&display=full&output_format=JSON
         → trouve la taxe avec rate=11.650

2. GET /api/tax_rules?filter[id_tax]=[TAX_ID]&display=full&output_format=JSON
         → trouve la règle → champ id_tax_rules_group

3. Retourner id_tax_rules_group (ex: 5)
```

> **Erreur ancienne** : le code précédent cherchait `tax_rules_groups?filter[rate]=11`
> → 400 Bad Request car `rate` n'existe pas dans `tax_rule_groups` (il est dans `taxes`)

---

## Clients

### GET — chercher par email
```
GET /api/customers?filter[email]=[rakoto@yopmail.com]&display=full&output_format=JSON
```

### POST — créer un client
```xml
<prestashop><customer>
  <id_default_group>3</id_default_group>
  <id_lang>1</id_lang>
  <id_gender>1</id_gender>
  <id_shop>1</id_shop>
  <firstname>Rakoto</firstname>
  <lastname>Rakoto</lastname>
  <email>rakoto@yopmail.com</email>
  <passwd>XvzsX5O0!GBD0uXQ</passwd>
  <active>1</active>
  <deleted>0</deleted>
  <is_guest>0</is_guest>
</customer></prestashop>
```

---

## Adresses

### POST
```xml
<prestashop><address>
  <id_customer>3</id_customer>
  <id_country>119</id_country>      <!-- Madagascar — à vérifier selon l'installation -->
  <alias>Domicile</alias>
  <lastname>Rakoto</lastname>
  <firstname>Rakoto</firstname>
  <address1>Andoharanofotsy</address1>
  <postcode>101</postcode>
  <city>Andoharanofotsy</city>
  <active>1</active>
  <deleted>0</deleted>
</address></prestashop>
```

---

## Paniers

### POST — requis avant toute création de commande
```xml
<prestashop><cart>
  <id_shop>1</id_shop>
  <id_lang>1</id_lang>
  <id_currency>1</id_currency>
  <id_customer>3</id_customer>
  <id_address_delivery>12</id_address_delivery>
  <id_address_invoice>12</id_address_invoice>
  <secure_key>a1b2c3d4e5f6...</secure_key>   <!-- 32 chars hex aléatoires -->
</cart></prestashop>
```

---

## Commandes

### POST
```xml
<prestashop><order>
  <id_address_delivery>12</id_address_delivery>
  <id_address_invoice>12</id_address_invoice>
  <id_cart>8</id_cart>                         <!-- OBLIGATOIRE -->
  <id_currency>1</id_currency>
  <id_lang>1</id_lang>
  <id_customer>3</id_customer>
  <id_carrier>0</id_carrier>
  <current_state>9</current_state>
  <conversion_rate>1.000000</conversion_rate>  <!-- OBLIGATOIRE, erreur code 41 sans -->
  <payment>Import CSV</payment>
  <module>ps_checkpayment</module>
  <total_paid>33.585000</total_paid>
  <total_paid_real>33.585000</total_paid_real>
  <date_add>2026-05-09 00:00:00</date_add>
  <associations>
    <order_rows>
      <order_row>
        <id_product>20</id_product>
        <id_product_attribute>40</id_product_attribute>
        <product_name>Tshirt</product_name>
        <product_quantity>3</product_quantity>
        <product_price>11.195000</product_price>
        <unit_price_tax_incl>11.195000</unit_price_tax_incl>
        <unit_price_tax_excl>11.195000</unit_price_tax_excl>
      </order_row>
    </order_rows>
  </associations>
</order></prestashop>
```

---

## Erreurs courantes

| Code HTTP | Message | Cause | Solution |
|-----------|---------|-------|----------|
| 400 | `parameter "conversion_rate" required` | Champ manquant dans order XML | Ajouter `<conversion_rate>1.000000</conversion_rate>` |
| 400 | `Bad Request` sur `tax_rules_groups?filter[rate]=...` | Mauvais endpoint + mauvais champ | Chercher via `/api/taxes?filter[rate]=` |
| 404 | Not Found | Ressource ou ID inexistant | Vérifier l'ID / la FK |
| 403 | Forbidden | Clé API invalide ou permission manquante | Vérifier `ws_key` dans l'admin PrestaShop |
