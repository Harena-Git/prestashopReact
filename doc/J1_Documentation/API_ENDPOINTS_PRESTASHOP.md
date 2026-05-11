# 🔌 ENDPOINTS API PRESTASHOP À UTILISER

## Base URL
```
http://localhost/prestashop_new/api/
```

---

## 📦 API : PRODUCTS

### Lister Produits
```bash
GET /api/products
Query: ?limit=100&sort=id_DESC
Response: { products: [{id, reference, name, price, ...}] }
```

### Créer Produit
```bash
POST /api/products
Body: {
  "product": {
    "reference": "T_01",
    "name": "T-shirt",
    "price": "12.50",
    "wholesale_price": "8.50",
    "id_tax_rules_group": 1,
    "active": 1,
    "date_add": "2025-12-01T00:00:00+00:00"
  }
}
```

### Mettre à Jour Produit
```bash
PUT /api/products/1
Body: { "product": { ...modifications... } }
```

### Lister Stock (Stock_available)
```bash
GET /api/stock_availables?filter[id_product]=1
Response: { stock_available: [{id, quantity, ...}] }
```

### Créer Stock
```bash
POST /api/stock_availables
Body: {
  "stock_available": {
    "id_product": 1,
    "id_product_attribute": 0,  // 0 = produit simple
    "quantity": 10
  }
}
```

---

## 🎨 API : ATTRIBUTES

### Lister Groupes d'Attributs
```bash
GET /api/product_options  # Groupes
Response: { product_options: [{id, name, is_color_group, ...}] }
```

### Créer Groupe d'Attributs
```bash
POST /api/product_options
Body: {
  "product_option": {
    "name": "Taille",
    "public_name": "Taille",
    "group_type": "select"
  }
}
```

### Lister Attributs (Valeurs)
```bash
GET /api/product_option_values?filter[id_attribute_group]=1
Response: { product_option_values: [{id, name, ...}] }
```

### Créer Attribut (Valeur)
```bash
POST /api/product_option_values
Body: {
  "product_option_value": {
    "id_attribute_group": 1,  # Groupe "Taille"
    "name": "ngoza"           # Valeur "grand"
  }
}
```

### Créer Combinaison (Déclinaison)
```bash
POST /api/products/1/combinations
Body: {
  "combination": {
    "associations": {
      "product_option_values": [
        {"id": 5}  # ID attribut "ngoza"
      ]
    },
    "price": "15.00",           # Si prix spécifique
    "quantity": 13
  }
}
```

---

## 📂 API : CATEGORIES

### Lister Catégories
```bash
GET /api/categories
Response: { categories: [{id, name, id_parent, ...}] }
```

### Chercher Catégorie par Nom
```bash
GET /api/categories?filter[name]=Akanjo
Response: { categories: [{id, name, ...}] }
```

### Créer Catégorie
```bash
POST /api/categories
Body: {
  "category": {
    "name": "Akanjo",
    "id_parent": 2,       # Racine
    "active": 1
  }
}
```

### Ajouter Produit à Catégorie
```bash
# Méthode 1 : Via création catégorie
POST /api/categories
Body: {
  "category": {
    "name": "Akanjo",
    "associations": {
      "products": [
        {"id": 1}  # ID produit
      ]
    }
  }
}

# Méthode 2 : Via mise à jour produit
PUT /api/products/1
Body: {
  "product": {
    "associations": {
      "categories": [
        {"id": 1}  # ID catégorie
      ]
    }
  }
}
```

---

## 👥 API : CUSTOMERS

### Lister Clients
```bash
GET /api/customers
Response: { customers: [{id, email, firstname, lastname, ...}] }
```

### Chercher Client par Email
```bash
GET /api/customers?filter[email]=rakoto@yopmail.com
Response: { customers: [{...}] }  # Peut être vide
```

### Créer Client
```bash
POST /api/customers
Body: {
  "customer": {
    "firstname": "",
    "lastname": "Rakoto",
    "email": "rakoto@yopmail.com",
    "passwd": "XvzsX5O0!GBD0uXQ",  # Hash ou plaintext selon config
    "active": 1
  }
}
```

### Mettre à Jour Client
```bash
PUT /api/customers/1
Body: { "customer": { ...modifications... } }
```

### Lister Adresses Client
```bash
GET /api/addresses?filter[id_customer]=1
Response: { addresses: [{id, id_customer, address1, city, ...}] }
```

### Créer Adresse
```bash
POST /api/addresses
Body: {
  "address": {
    "id_customer": 1,
    "alias": "Livraison",
    "lastname": "Rakoto",
    "firstname": "",
    "address1": "Andoharanofotsy",
    "city": "Andoharanofotsy",
    "id_country": 136,  # Madagascar
    "active": 1
  }
}
```

---

## 📋 API : ORDERS

### Lister Commandes
```bash
GET /api/orders
Response: { orders: [{id, id_customer, current_state, date_add, ...}] }
```

### Lister États de Commande
```bash
GET /api/order_states
Response: { order_states: [{id, name, ...}] }
# Exemples:
# 1 = Pending payment
# 2 = Payment accepted
# 14 = Payment error
```

### Créer Commande
```bash
POST /api/orders
Body: {
  "order": {
    "id_customer": 1,
    "id_address_invoice": 1,
    "id_address_delivery": 1,
    "current_state": 1,  # Pending payment
    "date_add": "2026-05-09T00:00:00+00:00",
    "associations": {
      "order_rows": [
        {
          "id_product": 1,
          "id_product_attribute": 1,  # Si combinaison
          "product_quantity": 3
        }
      ]
    }
  }
}
```

### Ajouter Ligne à Commande
```bash
POST /api/orders/1/order_detail
Body: {
  "order_detail": {
    "id_product": 2,
    "product_quantity": 2
  }
}
```

---

## 🔍 API : TAXES

### Lister Groupes Taxe
```bash
GET /api/tax_rules_groups
Response: { tax_rules_groups: [{id, name, ...}] }
```

### Créer Groupe Taxe
```bash
POST /api/tax_rules_groups
Body: {
  "tax_rules_group": {
    "name": "Taxe 11.65%"
  }
}
```

### Lister Taux Taxe
```bash
GET /api/tax_rules?filter[id_tax_rules_group]=1
Response: { tax_rules: [{id, rate, ...}] }
```

### Créer Taux Taxe
```bash
POST /api/tax_rules
Body: {
  "tax_rule": {
    "id_tax_rules_group": 1,
    "id_country": 136,  # Madagascar
    "rate": "11.65"
  }
}
```

---

## 🔐 AUTHENTIFICATION API

### Configuration de Base
```bash
# Headers requis
Authorization: Basic base64(API_KEY:)
Content-Type: application/json

# Ou via URL (moins sécurisé)
GET /api/products?api_key=YOUR_API_KEY
```

### Récupérer API Key
```
Admin Panel → Préférences → Clés API Web Service
```

---

## 📊 RÉSUMÉ APPELS POUR IMPORT

### Import Fichier 1 (Produits)

```javascript
// Pseudo-code
for (const row of file1) {
  // 1. Créer/chercher taxe
  const taxGroup = await api.getTaxGroup(row.taxRate);
  if (!taxGroup) {
    await api.createTaxGroup(row.taxRate);
  }

  // 2. Créer/chercher catégorie
  const category = await api.getCategory(row.categorie);
  if (!category) {
    await api.createCategory(row.categorie);
  }

  // 3. Créer produit
  const product = await api.createProduct({
    reference: row.reference,
    name: row.nom,
    price: row.prix_ttc,
    wholesale_price: row.prix_achat,
    tax_group_id: taxGroup.id,
    date_add: parseDate(row.date_availability_produit)
  });

  // 4. Lier catégorie
  await api.addProductToCategory(product.id, category.id);
}
```

### Import Fichier 2 (Déclinaisons)

```javascript
for (const row of file2) {
  // 1. Chercher produit
  const product = await api.getProductByReference(row.reference);

  // 2. Créer/chercher groupe attribut
  let attrGroup = await api.getAttributeGroup(row.specificité);
  if (!attrGroup) {
    attrGroup = await api.createAttributeGroup(row.specificité);
  }

  // 3. Créer/chercher attribut
  let attr = await api.getAttribute(row.karazany, attrGroup.id);
  if (!attr) {
    attr = await api.createAttribute(row.karazany, attrGroup.id);
  }

  // 4. Créer combinaison
  const combination = await api.createCombination(product.id, {
    attributes: [attr.id],
    price: row.prix_vente_ttc,
    quantity: row.stock_initial
  });
}
```

### Import Fichier 3 (Commandes)

```javascript
for (const row of file3) {
  // 1. Créer/chercher client
  let customer = await api.getCustomerByEmail(row.email);
  if (!customer) {
    customer = await api.createCustomer({
      lastname: row.nom,
      email: row.email,
      passwd: row.pwd
    });
  }

  // 2. Créer adresse
  const address = await api.createAddress({
    id_customer: customer.id,
    address1: row.adresse,
    id_country: 136
  });

  // 3. Parser achat
  const items = parseAchat(row.achat);

  // 4. Créer commande
  const order = await api.createOrder({
    id_customer: customer.id,
    id_address_invoice: address.id,
    id_address_delivery: address.id,
    current_state: mapState(row.etat),
    items: items
  });
}
```

---

## ⚠️ ERREURS COURANTES

| Erreur | Cause | Solution |
|--------|-------|----------|
| 404 Not Found | Ressource inexistante | Vérifier l'ID/FK |
| 400 Bad Request | Format JSON invalide | Vérifier structure body |
| 401 Unauthorized | API Key manquante/invalide | Vérifier authentification |
| 409 Conflict | Doublon (email unique) | Chercher avant créer |
| 422 Unprocessable | Données invalides | Valider avant envoi |
| Foreign Key Error | FK n'existe pas | Insérer parent d'abord |

---

## 🛠️ UTILITAIRE : FORMAT CONVERSION

### Dates
```javascript
// CSV → SQL
"01/12/2025" → "2025-12-01 00:00:00"
parseDate = (d) => {
  const [d, m, y] = d.split('/');
  return new Date(y, m-1, d).toISOString();
}
```

### Décimales
```javascript
// CSV format français → SQL
"12,5" → 12.50
normalize = (v) => parseFloat(v.replace(',', '.'))
```

### Format Achat
```javascript
// Parser format complexe
"[(""T_01"";3;""ngoza""),(""C_03"";1;"""")]"

regex = /\("([^"]+)";"(\d+)";"([^"]*)"\)/g
const parse = (str) => {
  const results = [];
  let match;
  while ((match = regex.exec(str))) {
    results.push({
      reference: match[1],
      quantity: parseInt(match[2]),
      attribute: match[3] || null
    });
  }
  return results;
}
```

