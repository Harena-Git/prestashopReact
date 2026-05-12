# 📚 Documentation de la Base de Données PrestaShop E-Commerce

## 🎯 Vue d'ensemble
PrestaShop est une plateforme e-commerce open source. Ce document explique la structure complète de sa base de données en mettant en contexte chaque table dans un scénario d'e-commerce réel.

---

## 📊 Architecture Générale

### Principes Fondamentaux
- **Multi-langue** : Chaque contenu traduit est stocké dans des tables `*_lang`
- **Multi-boutique** : Chaque élément peut être spécifique à une ou plusieurs boutiques (`*_shop`)
- **Flexibilité** : Structure modulaire permettant des extensions

---

## 👥 GESTION DES UTILISATEURS

### `ps_customer` - Clients
**API** : /customers
**Contexte** : Table principale contenant tous les clients inscrits sur votre boutique.

```
Structure :
- id_customer : Identifiant unique du client
- firstname, lastname : Prénom et nom du client
- email : Email unique (clé de connexion)
- passwd : Mot de passe hashé
- date_add, date_upd : Dates de création et modification
- active : Le compte est-il actif ?
- newsletter : Le client a-t-il accepté la newsletter ?
```

**Exemple** : Un client achète sur votre site → création d'une ligne `ps_customer`.

---

### `ps_customer_group` - Groupes de Clients
**API** : /groups
**Contexte** : Association des clients à des groupes pour appliquer des réductions.

```
Utilité dans l'e-commerce :
- Groupe "VIP" → réduction 20%
- Groupe "Entreprise" → réduction 15%
- Groupe "Normal" → prix standard
```

---

### `ps_address` - Adresses
**API** : /addresses
**Contexte** : Stocke toutes les adresses (livraison, facturation).

```
Exemples d'adresses stockées :
- Adresse de livraison principale
- Adresse de facturation différente
- Plusieurs adresses de livraison possibles

Champs clés :
- alias : "Domicile", "Bureau", "Entreprise"
- id_customer : Lié au client
- country, state, city : Localisation
```

---

### `ps_employee` - Employés et Administrateurs
**API** : /employees
**Contexte** : Gestion du personnel de la boutique.

```
Exemples de profils :
- Admin (accès total)
- Gestionnaire de stock (gestion produits/stock)
- Support client (gestion des commandes)
```

---

## 🛍️ GESTION DES PRODUITS

### `ps_product` - Produits
**API** : /products
**Contexte** : Référence principale de chaque produit vendu.

```
Exemple de produit : Smartphone XYZ
- id_product : Identifiant unique
- reference : Code interne (ex: SMART-001)
- ean13 : Code-barres
- price : Prix de vente
- cost_price : Prix de revient
- active : Produit en ligne ou masqué ?
- quantity : Stock total
```

---

### `ps_product_lang` - Traductions de Produits
**API** : /products
**Contexte** : Descriptions dans plusieurs langues.

```
Même produit, plusieurs langues :
- Français : "Smartphone haute performance"
- Anglais : "High-performance smartphone"
- Espagnol : "Smartphone de alto rendimiento"

Champs :
- name : Nom du produit
- description : Description longue (catalogue)
- description_short : Résumé court
- meta_description : Pour le SEO
- meta_keywords : Pour le SEO
```

---

### `ps_product_shop` - Produits par Boutique
**API** : /products
**Contexte** : Si vous gérez plusieurs boutiques.

```
Exemple :
- Même produit peut avoir des prix différents par boutique
- Produit visible en France, caché en Italie
- Stock différent par localisation
```

---

### `ps_category` et `ps_category_lang` - Catégories
**API** : /categories
**Contexte** : Structuration du catalogue.

```
Hiérarchie exemple :
📁 Électronique
  📁 Smartphones
    - iPhone 15
    - Samsung Galaxy
  📁 Accessoires
    - Coques
    - Chargeurs

Champs :
- id_parent : Catégorie parente (pour hiérarchie)
- position : Ordre d'affichage
- active : Visible sur le site ?
```

---

### `ps_combination` - Variantes de Produits
**API** : /combinations
**Contexte** : Gestion des variantes (taille, couleur, etc).

```
Exemple : T-shirt disponible en :
- Tailles : XS, S, M, L, XL
- Couleurs : Blanc, Noir, Bleu

Une combinaison = Une variante spécifique (ex: T-shirt blanc taille M)
Champs :
- id_product : Référence au produit
- reference : Code spécifique à la variante
- ean13 : Code-barres de la variante
- price : Prix additionnel si différent
```

---

### `ps_attribute` et `ps_attribute_group` - Attributs
**API** : /product_option_values
**Contexte** : Définition des caractéristiques (couleur, taille, etc).

```
Exemple :
Groupe "Couleur" contient :
  - Attribut "Rouge"
  - Attribut "Bleu"
  - Attribut "Noir"

Groupe "Taille" contient :
  - Attribut "XS"
  - Attribut "S"
  - Attribut "M"
```

---

### `ps_feature` et `ps_feature_value` - Caractéristiques
**API** : /product_features
**Contexte** : Détails purement informatifs (différent des attributs).

```
Exemple pour un Smartphone :
Caractéristique "Processeur" → Valeur "Snapdragon 8"
Caractéristique "RAM" → Valeur "8GB"
Caractéristique "Écran" → Valeur "6.7 pouces"

⚠️ Différence avec Attributs :
- Attributs = Varient le produit (affecte le prix)
- Caractéristiques = Info descriptive seulement
```

---

### `ps_image` et `ps_image_lang` - Images Produits
**API** : /images
**Contexte** : Gestion des images d'un produit.

```
Pour un t-shirt blanc :
- image 1 : Vue de face (cover image)
- image 2 : Vue arrière
- image 3 : Détail du tissu

Champs :
- position : Ordre d'affichage
- cover : Image par défaut?
- legend : Texte alternatif par langue
```

---

### `ps_manufacturer` - Marques
**API** : /manufacturers
**Contexte** : Association des produits à leurs marques.

```
Exemples :
- Apple
- Samsung
- Sony
- Nike
```

---

### `ps_supplier` - Fournisseurs
**API** : /suppliers
**Contexte** : Suivi des sources d'approvisionnement.

```
Un fournisseur fournit plusieurs produits
Un produit peut être fourni par plusieurs fournisseurs
Utile pour la gestion des commandes de réapprovisionnement
```

---

## 🛒 GESTION DES COMMANDES ET PANIER

### `ps_cart` - Paniers
**API** : /carts
**Contexte** : Stockage des paniers en cours.

```
Exemple :
- Client ajoute 3 produits dans son panier
- Panier stocké en base avant paiement
- Panier peut avoir une durée de validité

Champs :
- id_customer : Client propriétaire du panier
- id_address_delivery : Adresse de livraison choisie
- id_address_invoice : Adresse de facturation choisie
- id_carrier : Transporteur sélectionné
```

---

### `ps_cart_product` - Produits dans le Panier
**API** : /carts
**Contexte** : Détail des articles du panier.

```
Champs :
- id_cart : Référence au panier
- id_product : Le produit
- id_product_attribute : La variante spécifique
- quantity : Quantité commandée
- customization_id : Si le produit est personnalisé
```

---

### `ps_order` - Commandes Finalisées
**API** : /orders
**Contexte** : Historique de toutes les commandes passées.

```
Exemple de commande :
- Numéro : #100001
- Client : Jean Dupont
- Date : 2025-12-15
- Total : 249,99 €
- Statut : Livrée

Champs :
- id_customer : Client qui a commandé
- current_state : Statut (en attente, confirmée, livrée, etc)
- payment : Moyen de paiement
- total_paid : Montant payé
- shipping_number : Numéro de suivi transporteur
```

---

### `ps_order_detail` - Articles de la Commande
**API** : /order_details
**Contexte** : Détail ligne par ligne d'une commande.

```
Commande #100001 contient :
- 1x T-shirt blanc taille M → 49,99€
- 2x Chaussettes → 9,99€ l'unité
- 1x Casquette → 29,99€

Champs :
- id_order : Commande d'origine
- id_product : Produit commandé
- quantity : Quantité
- unit_price_tax_excl : Prix unitaire HT
- total_price_tax_incl : Total TTC de la ligne
```

---

### `ps_order_state` et `ps_order_state_lang` - États de Commande
**API** : /order_states
**Contexte** : Statuts possibles d'une commande.

```
Cycle de vie :
1. Paiement en attente
2. Paiement accepté
3. Préparation en cours
4. Expédié
5. Livré
6. (Optionnel) Annulée
7. (Optionnel) Remboursée
```

---

### `ps_order_history` - Historique d'État
**API** : /order_histories
**Contexte** : Trace complète des changements d'état.

```
Trace d'une commande :
- 15-12-2025 10:00 → Paiement accepté
- 15-12-2025 14:30 → Expédié
- 16-12-2025 09:00 → Livré
```

---

### `ps_order_payment` - Paiements
**API** : /order_payments
**Contexte** : Enregistrement des transactions.

```
Exemple :
- Commande #100001
- Montant : 249,99€
- Mode : Carte bancaire (CB)
- Référence transaction : TXN-12345
- Statut : Validé
```

---

## 💳 GESTION DES PAIEMENTS ET RÈGLES

### `ps_cart_rule` - Codes Promotionnels
**API** : /cart_rules
**Contexte** : Gestion des réductions et codes promo.

```
Exemples :
1. Code "NOEL2025" → Réduction 20% (valide jusqu'au 25/12)
2. Code "LIVRAISON" → Livraison gratuite (toute commande)
3. Code "BIENVENUE" → 10€ de réduction (1ère commande uniquement)

Champs :
- name : Nom visible
- code : Code à saisir
- discount : Montant de la réduction
- reduction_percent : Pourcentage de réduction
- free_shipping : Livraison gratuite ?
- date_from, date_to : Période de validité
- active : Code actif ?
```

---

### `ps_group_reduction` - Réductions par Groupe
**API** : /specific_price_rules
**Contexte** : Appliquer des remises à un groupe client.

```
Exemple :
- Groupe "VIP" : 15% de réduction sur la catégorie "Électronique"
- Groupe "Entreprise" : 10% sur tous les produits
```

---

## 🚚 GESTION DE LA LIVRAISON

### `ps_carrier` - Transporteurs
**API** : /carriers
**Contexte** : Modes de livraison disponibles.

```
Exemples :
1. Chronopost
   - 24h
   - 10€

2. Colissimo
   - 2-3 jours
   - 5€

3. UPS
   - 24/48h
   - 15€

4. Retraite en magasin
   - Gratuit
```

---

### `ps_carrier_zone` - Zones de Livraison
**API** : /carrier_zones
**Contexte** : Où livrer et à quel coût.

```
Exemple :
Chronopost :
- France métro → 10€
- Corse → 25€
- Belgique → 15€
- Suisse → 20€
- Reste Europe → 30€
```

---

### `ps_delivery` - Tables de Livraison
**API** : /deliveries
**Contexte** : Tarification par zone et poids/prix.

```
Exemple :
Colissimo France :
- 0-500g → 5€
- 500g-1kg → 7€
- 1kg-2kg → 10€
```

---

### `ps_country` et `ps_country_lang` - Pays
**API** : /countries
**Contexte** : Référentiel des pays de livraison.

```
Champs :
- iso_code : Code ISO (FR, DE, ES, etc)
- call_prefix : Indicatif téléphonique
- contains_states : Le pays contient des états ? (ex: USA)
- need_zip_code : Code postal obligatoire ?
- zip_code_format : Format du code postal
```

---

### `ps_state` - Régions/États
**API** : /states
**Contexte** : États/Provinces pour les pays en ayant.

```
Exemples :
USA :
- California
- New York
- Texas

Australie :
- New South Wales
- Victoria
```

---

## 💰 GESTION COMMERCIALE

### `ps_currency` et `ps_currency_lang` - Devises
**API** : /currencies
**Contexte** : Monnaies supportées par la boutique.

```
Exemples :
- EUR (Euro) - 1€
- USD (Dollar) - 1.1$
- GBP (Livre) - 0.85£
- CHF (Franc Suisse) - 0.95CHF

Champs :
- iso_code : Code ISO (EUR, USD, etc)
- sign : Symbole (€, $, £)
- conversion_rate : Taux de change
```

---

### `ps_tax` et `ps_tax_lang` - Taxes
**API** : /taxes
**Contexte** : Gestion des taux de TVA.

```
Exemple France :
- TVA normale : 20%
- TVA réduite : 5.5% (aliments)
- TVA super-réduite : 2.1% (journaux)

Exemple Belgique :
- TVA standard : 21%
- TVA réduite : 12% ou 6%
```

---

### `ps_tax_rule` - Règles Fiscales
**API** : /tax_rules
**Contexte** : Application des taxes selon produit/destination.

```
Exemple :
Produit "Livre" (TVA 5.5%)
- Vendu en France → 5.5%
- Vendu en Belgique → 6%
- Vendu en Suisse → 7.7%
```

---

## 📞 GESTION CLIENT

### `ps_contact` et `ps_contact_lang` - Centres de Contact
**API** : /contacts
**Contexte** : Sujets de support client.

```
Exemples :
- Service client
- Réclamations
- Retours/Remboursements
- Facturation
- Technique
```

---

### `ps_customer_message` - Messages Clients
**API** : /customer_messages
**Contexte** : Support/SAV par ticket.

```
Exemple :
- Client : Jean Dupont
- Sujet : "Problème avec la commande #100001"
- Message : "Le colis n'est pas arrivé..."
- Date : 2025-12-20
- Statut : En attente de réponse
```

---

### `ps_customer_thread` - Discussions
**API** : /customer_threads
**Contexte** : Fil de discussion complet entre client et support.

```
Une discussion = Multiple messages
- Message 1 (Client) : "Où est mon colis ?"
- Message 2 (Support) : "Voici le numéro de suivi..."
- Message 3 (Client) : "Merci !"
```

---

## 🏪 GESTION MULTI-BOUTIQUE

### `ps_shop` - Boutiques
**API** : /shops
**Contexte** : Si vous gérez plusieurs boutiques.

```
Exemples :
1. Shop "Boutique FR" (France)
   - Domaine : boutique-fr.com
   - Langue : Français
   - Devise : EUR

2. Shop "Store EN" (UK)
   - Domaine : store-en.com
   - Langue : Anglais
   - Devise : GBP
```

---

## 📝 CONTENU STATIQUE

### `ps_cms` et `ps_cms_lang` - Pages Statiques
**API** : /cms
**Contexte** : Pages informatives (À propos, CGV, Confidentialité, etc).

```
Exemples :
- "À propos de nous"
- "Conditions Générales de Vente"
- "Politique de Confidentialité"
- "Mentions Légales"
- "Aide et FAQ"
```

---

### `ps_cms_category` et `ps_cms_category_lang` - Catégories CMS
**API** : /cms_categories
**Contexte** : Organisation des pages en catégories.

```
Hiérarchie :
📁 Informations Légales
  - CGV
  - Mentions Légales
  - Politique de Confidentialité

📁 Aide
  - FAQ
  - Comment retourner
  - Garantie
```

---

## 📧 NEWSLETTER ET EMAIL

### `ps_emailsubscription` - Abonnements Newsletter
**API** : /emailsubscription
**Contexte** : Gestion des abonnements email.

```
Exemple :
- Email : jean@example.com
- Abonné : Oui
- Date d'abonnement : 2025-10-01
```

---

### `ps_mailalert_customer_oos` - Alertes Stock
**API** : /mailalert_customer_oos
**Contexte** : Avertir les clients quand un produit rupturé revient en stock.

```
Scénario :
- Client : Intéressé par iPhone 15
- Produit : En rupture
- Client s'inscrit pour alerte
- iPhone 15 de nouveau en stock
- Email d'alerte envoyé au client
```

---

## 🎯 CONFIGURATION ET SYSTÈME

### `ps_configuration` et `ps_configuration_lang` - Configuration
**API** : /configurations
**Contexte** : Paramètres de la boutique.

```
Exemples :
- Nom boutique : "Ma Boutique"
- Logo : URL du logo
- Adresse boutique : "123 rue de France"
- Email support : "support@boutique.com"
- Fuseau horaire : Europe/Paris
- TVA : Affichée ou masquée dans les prix ?
```

---

### `ps_info` et `ps_info_lang` - Informations
**API** : /infos
**Contexte** : Contenu personnalisé par langue/boutique.

```
Exemple ps_info_lang :
- id_info : 1
- id_lang : 1 (Français)
- id_shop : 1 (Boutique FR)
- text : "Bienvenue sur notre boutique..."
```

---

### `ps_hook` et `ps_hook_module` - Système d'Extension
**API** : /hooks
**Contexte** : Architecture de plugins via "hooks".

```
Exemple :
Hook "displayProductActions" → Affiche des boutons sur la page produit
Hook "actionValidateOrder" → Exécuté après validation d'une commande

Les modules se "branchent" sur ces hooks pour étendre les fonctionnalités
```

---

## 🔒 SÉCURITÉ ET ACCÈS

### `ps_access` - Permissions
**API** : /access
**Contexte** : Contrôle d'accès par profil.

```
Profil "Admin" :
- Accès total

Profil "Gestionnaire Stock" :
- Gestion produits/stock
- Visualisation commandes
- PAS accès facturation

Profil "Support" :
- Gestion commandes
- Messages clients
- Historique commandes
```

---

### `ps_employee_session` - Sessions Employé
**API** : /employee_sessions
**Contexte** : Suivi des connexions admin.

```
Champs :
- id_employee : Employé connecté
- token : Jeton de session
- date_add : Heure de connexion
- date_upd : Dernière activité
```

---

## 📊 STATISTIQUES

### `ps_guest` - Visiteurs
**API** : /guests
**Contexte** : Tracking des visiteurs anonymes.

```
Informations collectées :
- Système d'exploitation
- Navigateur web
- Résolution écran
- Plugins (Flash, Java, etc)
- Langue acceptée
```

---

## 🎨 APPARENCE

### `ps_theme` - Thèmes
**API** : /themes
**Contexte** : Gestion des thèmes graphiques.

```
Exemple :
- Thème "Fashion" (couleurs vives)
- Thème "Luxury" (noir et or)
- Thème "Light" (minimaliste)
```

---

### `ps_tab` - Onglets Admin
**API** : /tabs
**Contexte** : Navigation du back-office.

```
Onglets visibles selon profil :
- Profil Admin : Tous les onglets
- Profil Support : Seulement "Commandes" et "Clients"
```

---

## 📈 RÉSUMÉ FLUX E-COMMERCE

```
┌─────────────────────────────────────┐
│   CLIENT VISITE LA BOUTIQUE         │
│   (ps_guest → ps_customer)          │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌─────────────────────────┐
        │  CONSULTE PRODUITS      │
        │ (ps_product             │
        │  ps_category            │
        │  ps_image)              │
        └──────────────┬──────────┘
                       │
                       ▼
                ┌────────────────────┐
                │  AJOUTE AU PANIER  │
                │  (ps_cart          │
                │   ps_cart_product) │
                └─────────┬──────────┘
                          │
                          ▼
                  ┌──────────────────────┐
                  │  SAISIT PROMO CODE   │
                  │  (ps_cart_rule)      │
                  └─────────┬────────────┘
                            │
                            ▼
                    ┌────────────────────┐
                    │  CHOISIT LIVRAISON │
                    │  (ps_carrier       │
                    │   ps_address)      │
                    └─────────┬──────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │  PAIEMENT        │
                      │  (ps_currency    │
                      │   ps_tax)        │
                      └─────────┬────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  COMMANDE CRÉÉE          │
                    │  (ps_order              │
                    │   ps_order_detail       │
                    │   ps_order_payment)     │
                    │  État : Paiement validé │
                    └─────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │  EXPÉDITION             │
                    │  (ps_order_history      │
                    │   État : Expédié)       │
                    └─────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │  LIVRAISON              │
                    │  État : Livré           │
                    └─────────────────────────┘
```

---

## 🔗 RELATIONS PRINCIPALES

```
ps_customer ──→ ps_customer_group
   ↓
   ├─→ ps_address (livraison/facturation)
   │
   ├─→ ps_cart ──→ ps_cart_product
   │
   └─→ ps_order ──→ ps_order_detail ──→ ps_product
        ↓                                  ↓
        ps_order_payment                   ps_category
        ps_order_history                   ps_image
        ps_order_state                     ps_combination
                                          ps_attribute
                                          ps_feature
```

---

## 📋 CHECKLIST TABLES ESSENTIELLES

Pour un fonctionnement minimal d'e-commerce, assurez-vous d'avoir :

- ✅ `ps_product` : Sans produits, pas de boutique
- ✅ `ps_customer` : Pour les utilisateurs
- ✅ `ps_order` : Pour tracer les commandes
- ✅ `ps_category` : Pour organiser le catalogue
- ✅ `ps_carrier` : Pour la livraison
- ✅ `ps_currency` : Pour les prix
- ✅ `ps_tax` : Pour les calculs fiscaux
- ✅ `ps_lang` : Pour le multilangue
- ✅ `ps_country` : Référentiel de pays
- ✅ `ps_configuration` : Paramètres de la boutique

---

## 🛠️ CONSEILS DE MAINTENANCE

### Sauvegarder Régulièrement
```sql
-- Sauvegarde complète
BACKUP DATABASE prestashop TO DISK = '/path/to/backup/prestashop.bak';
```

### Nettoyer les Anciennes Sessions
```sql
-- Supprimer les sessions de plus de 30 jours
DELETE FROM ps_customer_session 
WHERE date_upd < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Optimiser les Indexes
```sql
-- Les tables principales doivent être indexées
ANALYZE TABLE ps_product;
ANALYZE TABLE ps_order;
ANALYZE TABLE ps_customer;
```

---

## 📞 Support et Ressources

- **Site officiel** : https://www.prestashop.com
- **Documentation** : https://devdocs.prestashop.com
- **Forum** : https://www.prestashop.com/forums
- **GitHub** : https://github.com/prestashop_new/PrestaShop

---

**Document généré le** : 2025-12-05  
**Version PrestaShop** : 8.x  
**Base de données** : MySQL/MariaDB

---