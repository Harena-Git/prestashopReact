# Resume des changements

## 1) Actions realisees

- Reorganisation du dossier `src/` pour une structure plus propre et plus maintenable.
- Deplacement de l'ancienne logique de `src/crud/` vers une architecture par responsabilite.
- Simplification de `src/App.jsx` pour ne garder que le point d'entree de la page principale.
- Conservation des commentaires importants deja presents dans le code.
- Clarification des noms de fonctions et fichiers pour rendre le projet plus lisible.
- Verification technique effectuee:
  - `npm run lint` OK
  - `npm run build` OK

## 2) Nouvelle structure

```text
src/
├── api/
│   └── prestashop.api.js
├── features/
│   └── modules/
│       ├── components/
│       │   ├── DeleteModulesButton.jsx
│       │   └── ModuleSelectionList.jsx
│       ├── constants/
│       │   └── availableModules.js
│       ├── pages/
│       │   └── ModuleCleanupPage.jsx
│       ├── services/
│       │   └── moduleDeletion.service.js
│       └── utils/
│           └── selection.js
├── App.jsx
└── main.jsx
```

## 3) Role de chaque partie

- `api/`
  - Contient les appels HTTP vers PrestaShop (fetch XML, parse XML, suppression par ID).
  - Fichier principal: `src/api/prestashop.api.js`.

- `features/modules/`
  - Contient toute la logique metier liee a la suppression des donnees de modules.
  - `pages/`: orchestration de la page (etat, actions, alertes).
  - `components/`: elements UI reutilisables de la feature.
  - `services/`: logique metier (suppression en lot, gestion des resultats).
  - `constants/`: liste des modules disponibles.
  - `utils/`: fonctions utilitaires (toggle de selection, verification "tout selectionne").

- `App.jsx`
  - Point d'entree UI simplifie, charge la page `ModuleCleanupPage`.

## 4) Comment utiliser la nouvelle architecture

- Ajouter une nouvelle action API:
  - Ajouter la fonction dans `src/api/prestashop.api.js`.
- Ajouter une nouvelle regle metier:
  - Ajouter/adapter un service dans `src/features/modules/services/`.
- Ajouter une nouvelle partie d'interface:
  - Creer un composant dans `src/features/modules/components/`.
- Ajouter une nouvelle page pour la feature:
  - Creer une page dans `src/features/modules/pages/`.
- Ajouter des donnees statiques:
  - Utiliser `src/features/modules/constants/`.
- Ajouter une fonction utilitaire:
  - Utiliser `src/features/modules/utils/`.

## 5) Guide rapide selon le type de question

- "Je veux afficher une liste (ex: liste de modules, liste d'elements a cocher)":
  - Aller dans `src/features/modules/components/` pour creer ou modifier un composant de liste.
  - Exemple actuel: `ModuleSelectionList.jsx`.
  - Si la liste utilise des donnees fixes, verifier aussi `src/features/modules/constants/`.

- "Je veux creer un bouton (ex: bouton supprimer, bouton reset, bouton valider)":
  - Creer/modifier le bouton dans `src/features/modules/components/`.
  - Exemple actuel: `DeleteModulesButton.jsx`.
  - Si le bouton declenche une action metier, relier le bouton a un service dans `src/features/modules/services/`.

- "Je veux creer un formulaire (ex: champs + bouton submit)":
  - Construire le composant de formulaire dans `src/features/modules/components/`.
  - Gerer l'etat et la logique d'orchestration dans la page `src/features/modules/pages/ModuleCleanupPage.jsx`.
  - Si le formulaire envoie des donnees vers PrestaShop, ajouter l'appel dans `src/api/prestashop.api.js`.

- "Je veux creer un dashboard / une vue complete":
  - Creer une nouvelle page dans `src/features/modules/pages/`.
  - Composer cette page avec des composants de `components/`.
  - Si cette vue devient une nouvelle feature metier, reproduire la meme structure sous `src/features/<nouvelle-feature>/`.

- "Je veux modifier la logique metier (traitements, regles, enchainements)":
  - Aller dans `src/features/modules/services/`.
  - Mettre la logique reutilisable dans un service (et non directement dans le composant).

- "Je veux ajouter des utilitaires (tri, filtre, selection, helpers)":
  - Aller dans `src/features/modules/utils/`.
  - Garder ces fonctions pures et reutilisables.

- "Je veux appeler une nouvelle API PrestaShop":
  - Ajouter la fonction dans `src/api/prestashop.api.js`.
  - Puis consommer cette fonction dans un service (`services/`) ou dans la page si necessaire.

- "Je veux modifier la page principale de l'application":
  - `src/App.jsx` sert de point d'entree UI.
  - Eviter d'y mettre la logique metier complexe: la laisser dans `features/`.

## 6) Nettoyage des anciens elements

- Ancienne logique retiree de `src/crud/`.
- Le projet fonctionne maintenant avec la nouvelle organisation modulaire.

