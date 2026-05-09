# Documentation Import CSV

## Objectif

Cette documentation explique le fonctionnement de l'import CSV dans le projet, depuis l'appel API PrestaShop jusqu'a l'affichage dans l'application React (`App.jsx`).

---

## Vue globale du flux

1. L'application demarre dans `src/App.jsx` et affiche le routeur principal.
2. Le routeur `src/app/AppRouter.jsx` mappe l'URL `/modules/import` vers la page `ModuleImportPage`.
3. Sur cette page, l'utilisateur choisit un module cible (ex: `products`) puis selectionne un fichier CSV via `ImportCsvButton`.
4. Le fichier est envoye a `importCsvToPrestashop` (service metier).
5. Le service parse le CSV en JSON (avec PapaParse), transforme chaque ligne en XML PrestaShop, puis appelle l'API `createResource` pour chaque ligne.
6. La page affiche le resultat final (succes total, partiel ou echec).

---

## 1) Point d'entree de l'application (`App.jsx`)

Fichier: `src/App.jsx`

- `App` retourne `AppRouter`.
- Cela signifie que toute la navigation de l'app passe par le systeme de routes.

En resume:
- `App.jsx` ne gere pas l'import directement.
- Il delegue l'affichage a `AppRouter`.

---

## 2) Routage vers la page d'import (`AppRouter.jsx`)

Fichier: `src/app/AppRouter.jsx`

La route d'import est:

- `path="/modules/import"`
- `element={<ModuleImportPage />}`

Donc, quand l'utilisateur visite `/modules/import`, React affiche `ModuleImportPage`.

---

## 3) Page metier d'import (`ModuleImportPage.jsx`)

Fichier: `src/features/modules/pages/ModuleImportPage.jsx`

Role de cette page:

- Charger la liste des modules disponibles (`AVAILABLE_MODULES`).
- Permettre la selection d'un module cible (liste `<select>`).
- Lancer l'import via le bouton/fichier (`ImportCsvButton`).
- Afficher les messages utilisateur (alerts) selon le resultat.

### Etats React utilises

- `selectedModule`: module cible choisi (ex: `products`).
- `loading`: bloque l'UI pendant l'import.

### Fonction cle: `onImportCsv(file)`

Cette fonction:

1. Verifie qu'un module est selectionne.
2. Demande confirmation utilisateur (`window.confirm`).
3. Active `loading`.
4. Appelle `importCsvToPrestashop(file, selectedModule)`.
5. Interprete le resultat:
   - 0 erreur => succes total.
   - 0 succes => echec total.
   - sinon => succes partiel + erreurs.
6. Desactive `loading` dans `finally`.

---

## 4) Composant de selection de fichier (`ImportCsvButton.jsx`)

Fichier: `src/features/modules/components/ImportCsvButton.jsx`

Role:

- Afficher un bouton "Importer un fichier CSV".
- Ouvrir le selecteur de fichier (`input type="file"`).
- Accepter seulement les fichiers `.csv`.
- Desactiver l'action si `loading` ou `disabled`.

### Comportement important

- `onFileChange` recupere le premier fichier: `event.target.files?.[0]`.
- Si un fichier existe, il appelle `onImport(file)` recu en prop depuis la page.
- `event.target.value = ""` remet l'input a zero pour permettre de recharger le meme fichier ensuite.

---

## 5) Service d'import CSV (`moduleImportationservice.js`)

Fichier: `src/features/modules/services/moduleImportationservice.js`

Fonction principale: `importCsvToPrestashop(file, resourceName)`

Cette fonction retourne une `Promise` avec:

- `successCount`: nombre de lignes creees avec succes.
- `errors`: tableau des erreurs par ligne.

### Etapes internes

1. **Parse CSV vers JSON**  
   Utilise `Papa.parse` avec:
   - `header: true` (la premiere ligne du CSV devient les cles JSON),
   - `skipEmptyLines: true`.

2. **Boucle sur chaque ligne JSON**  
   Pour chaque `item`:
   - construit un objet XML compatible PrestaShop:
     - racine `prestashop`,
     - nom de ressource au singulier (`resourceName.slice(0, -1)`),
     - contenu de la ligne via `...item`.

3. **Transformation JSON vers XML**  
   `XMLBuilder` genere le texte XML (`xmlData`).

4. **Envoi API**  
   Appel de `createResource(resourceName, xmlData)`.

5. **Suivi des resultats**
   - succes => `successCount++`
   - erreur => push dans `errors`

---

## 6) Couche API PrestaShop (`prestashop.api.js`)

Fichier: `src/api/prestashop.api.js`

Fonction utilisee pour l'import: `createResource(resourceName, xmlData)`

### Ce que fait cette fonction

- Envoie une requete HTTP `POST` vers:
  - `${BASE_URL}${resourceName}?ws_key=${API_KEY}`
- Header:
  - `"Content-Type": "application/xml"`
- Body:
  - `xmlData` (XML construit par le service).

Si la reponse est OK:
- retourne le XML texte de la reponse.

Si la reponse est en erreur:
- log l'erreur puis `throw` une exception.

### Attention importante dans le code actuel

Dans le bloc d'erreur de `createResource`, il y a:

- `const errorText = await res.text();`

Alors que la variable s'appelle `response`.
Il faut donc corriger en:

- `const errorText = await response.text();`

Sinon, en cas d'erreur API, le code peut echouer avec une erreur JavaScript supplementaire (`res is not defined`) au lieu de remonter correctement la vraie erreur API.

---

## 7) Sequence complete (resume)

1. `App.jsx` affiche `AppRouter`.
2. `AppRouter` route `/modules/import` vers `ModuleImportPage`.
3. `ModuleImportPage` recupere `file` + `selectedModule`.
4. `ModuleImportPage` appelle `importCsvToPrestashop(file, selectedModule)`.
5. `importCsvToPrestashop`:
   - parse CSV -> JSON,
   - convertit chaque ligne JSON -> XML,
   - appelle `createResource` pour chaque ligne.
6. `createResource` fait le `POST` vers l'API PrestaShop.
7. Resultat final renvoye a la page et affiche a l'utilisateur.

---

## Mots difficiles (Glossaire)

- **API**: interface qui permet a deux applications de communiquer.
- **Endpoint**: URL precise d'une API (ex: `/api/products`).
- **Resource / Ressource**: type de donnees cible cote API (ex: `products`, `customers`).
- **CSV**: fichier texte tabulaire, colonnes separees par virgule/point-virgule.
- **JSON**: format de donnees base sur paires cle/valeur.
- **XML**: format de donnees balise, attendu par PrestaShop Webservice.
- **Parser**: outil qui lit/convertit un format vers un autre (ex: CSV -> JSON).
- **Serialize / Builder XML**: transformation d'un objet JavaScript en texte XML.
- **HTTP POST**: methode HTTP pour creer une ressource cote serveur.
- **Header HTTP**: metadonnees de requete/reponse (ex: type de contenu).
- **Payload / Body**: contenu principal envoye dans une requete.
- **Promise**: objet JavaScript representant une operation asynchrone.
- **Asynchrone (`async/await`)**: code qui attend des operations longues (API, parsing) sans bloquer l'UI.
- **State React (`useState`)**: memoire locale d'un composant React.
- **`useMemo`**: memorise une valeur calculee pour eviter des recalculs inutiles.
- **Props**: donnees/fonctions passees d'un composant parent a un enfant.
- **`try/catch/finally`**: structure pour gerer les erreurs et executer un nettoyage final.
- **Routage (`react-router-dom`)**: mecanisme de navigation entre pages React via URL.
- **`window.confirm`**: boite de dialogue navigateur pour confirmer une action.
- **`alert`**: message simple affiche a l'utilisateur.

---

## Bonnes pratiques recommandees (optionnel)

- Valider les colonnes attendues du CSV avant l'import.
- Normaliser les donnees (types, dates, valeurs vides) avant conversion XML.
- Limiter l'import par lots si le fichier est tres volumineux.
- Afficher un journal d'erreurs plus lisible dans l'UI (au lieu de seulement `console.table`).
- Externaliser `API_KEY` et `BASE_URL` dans les variables d'environnement.

