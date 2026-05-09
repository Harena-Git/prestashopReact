# prestashopReact

Application web développée avec **React** et **Vite**, conçue comme un outil d’administration pour une boutique e-commerce **PrestaShop**.

## Fonctionnalités principales

- **Intégration PrestaShop** : interaction avec l’API PrestaShop pour gérer les ressources de la boutique (produits, clients, commandes, etc.), notamment via `prestashop.api.js`.
- **Gestion des modules** :
  - importation de modules depuis des fichiers CSV ;
  - détection des modules installés ;
  - suppression de modules.
- **Manipulation de données** : traitement XML avec `fast-xml-parser` et CSV avec `papaparse`.
- **Base de données** : présence d’un fichier `create.sql` pour la structure de données associée.

## Technologies utilisées

- **Frontend** : React, Vite, React Router.
- **Qualité / développement** : ESLint, scripts de développement, build et prévisualisation.
