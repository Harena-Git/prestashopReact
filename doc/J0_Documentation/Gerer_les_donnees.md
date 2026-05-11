# Gerer_les_donnees.md

Guide generalise pour recuperer et envoyer des donnees dans ce projet React avec un backend XML (PrestaShop Webservice), en passant par des objets JSON dans le code.

---

## 1) Objectif

Dans ce projet, l'application frontend travaille surtout en objets JavaScript (JSON), alors que l'API PrestaShop expose des payloads XML.

Le flux standard est donc :

- **Lecture** : XML (API) -> parse -> JSON (frontend)
- **Ecriture** : JSON (frontend) -> build -> XML (API)

Ce document sert de reference pour implementer ces 2 sens proprement.

---

## 2) Rappel de l'existant dans le projet

Le fichier `src/api/prestashop.api.js` contient deja une base solide :

- usage de `fast-xml-parser` (`XMLParser`)
- `requestXml()` pour centraliser `fetch` + headers
- `safeReadText()` pour logs d'erreur robustes
- exemples de lecture (`fetchModuleIds`) et suppression (`deleteModuleRecord`)

Il est recommande de conserver cette logique centralisee dans la couche `api/`.

---

## 3) Architecture recommandee

Separons les responsabilites :

- `src/api/` : appels HTTP + conversion XML/JSON
- `src/features/.../services/` : orchestration metier (enchainements, regroupements)
- `src/features/.../pages/` : UI (loading, erreurs, feedback utilisateur)

Regle cle : **la page React ne parle pas directement XML**.

---

## 4) Dependances XML

Package principal :

```bash
npm install fast-xml-parser
```

Utilisation recommandee :

- `XMLParser` : XML -> JS (JSON)
- `XMLBuilder` : JS (JSON) -> XML

---

## 5) Configuration centrale API

Exemple de base reutilisable :

```js
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/";

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
});
```

Bonnes pratiques :

- privilegier `.env` pour la cle API
- garder `attributeNamePrefix: "@_"` coherent partout
- centraliser parser/builder pour eviter des configurations divergentes

---

## 6) Lecture de donnees (GET) : XML -> JSON

### 6.1 Pattern de requete XML

```js
async function requestXml(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 403) {
    throw new Error("Acces refuse. Verifiez la cle et les permissions Webservice.");
  }

  return response;
}
```

### 6.2 Parser la reponse

```js
const response = await requestXml(`${BASE_URL}products?ws_key=${API_KEY}`);
if (!response.ok) throw new Error(`Erreur GET: ${response.status}`);

const xmlPayload = await response.text();
const parsed = xmlParser.parse(xmlPayload);
```

### 6.3 Mapper vers un JSON metier

L'important n'est pas seulement de parser, mais de **normaliser** :

```js
function mapProductsFromPrestashop(parsed) {
  const raw = parsed?.prestashop?.products?.product || [];
  const list = Array.isArray(raw) ? raw : [raw];

  return list
    .map((item) => ({
      id: Number(item?.["@_id"]),
    }))
    .filter((item) => Number.isFinite(item.id));
}
```

Resultat : les composants React recoivent une structure propre et stable.

---

## 7) Ecriture de donnees (POST/PUT) : JSON -> XML

### 7.1 Construire le payload JS

Exemple logique (creation d'un produit, simplifie) :

```js
const payload = {
  prestashop: {
    product: {
      name: {
        language: {
          "@_id": "1",
          "#text": "Produit demo",
        },
      },
      price: "49.90",
      active: "1",
    },
  },
};
```

### 7.2 Convertir en XML

```js
const xmlBody = xmlBuilder.build(payload);
```

### 7.3 Envoyer a l'API

```js
const response = await requestXml(`${BASE_URL}products?ws_key=${API_KEY}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/xml",
  },
  body: xmlBody,
});

if (!response.ok) {
  const details = await response.text();
  throw new Error(`Erreur POST products: ${response.status} ${details}`.trim());
}
```

Pour update :

- meme logique mais `method: "PUT"`
- endpoint avec id (`products/{id}`)

---

## 8) Suppression (DELETE)

Le pattern deja utilise dans le projet est bon :

1. appel `DELETE /resource/{id}`
2. verification optionnelle via `GET /resource/{id}` attendu en 404

Cette verification est utile quand on veut garantir la coherence des suppressions en lot.

---

## 9) Pattern service metier recommande

Dans `features/.../services/`, on orchestre plusieurs appels API.

Exemple dans le projet :

- `deleteSelectedModules()` lance des suppressions en parallele
- renvoie un tableau avec `success`, `error`, `deleted`

Regle : le service renvoie des objets exploitables directement par l'UI.

Format type conseille :

```js
{
  success: true | false,
  data: ...,
  error: null | "message",
  meta: { ... }
}
```

---

## 10) Gestion d'erreurs (obligatoire)

Toujours couvrir :

- erreurs HTTP (`!response.ok`)
- erreurs de permission (`403`)
- erreurs de parsing XML (XML invalide)
- timeouts ou indisponibilite reseau

Recommandations :

- centraliser les messages techniques dans la couche `api`
- afficher des messages utilisateur clairs dans la couche `page`
- logger le detail technique en `console.error` pour debug

---

## 11) Validation avant envoi (POST/PUT)

Avant de construire le XML :

- valider les champs obligatoires
- normaliser les types (nombre, booleen, string)
- supprimer les champs vides non necessaires

Objectif : eviter les erreurs serveur difficiles a diagnostiquer.

---

## 12) Exemple complet de cycle

### Lecture

- UI appelle `service.getProducts()`
- Service appelle `api.fetchProductsXml()`
- API parse XML -> JSON normalise
- UI affiche la liste

### Ecriture

- UI envoie un objet formulaire JSON
- Service applique la logique metier
- API convertit JSON -> XML puis envoie POST/PUT
- API retourne un resultat normalise
- UI affiche succes/erreur et rafraichit la liste

---

## 13) Checklist implementation

Quand vous ajoutez une nouvelle ressource (ex: categories, clients, commandes), suivre cette checklist :

1. Ajouter fonctions API dans `src/api/...`
   - GET (liste/details)
   - POST/PUT si besoin
   - DELETE si besoin
2. Ajouter mapping XML -> JSON
3. Ajouter mapping JSON -> XML (pour POST/PUT)
4. Ajouter service metier dans `src/features/.../services/`
5. Brancher la page React (loading, erreurs, feedback)
6. Tester cas nominal + cas erreur (403/404/500)

---

## 14) Points de vigilance pour ce projet

- Ne pas laisser la cle API en dur dans le code de production
- Harmoniser les noms de ressources (singulier/pluriel) dans les mappers
- Toujours traiter le cas "objet unique" vs "tableau"
- Eviter de melanger logique XML dans les composants UI

---

## 15) Resume rapide

La methode robuste dans ce projet est :

- **API layer** : parle XML et gere `fetch`
- **Service layer** : applique la logique metier
- **UI layer** : consomme du JSON propre

En pratique :

- GET : XML -> parse -> JSON normalise
- POST/PUT : JSON -> build XML -> envoi API
- DELETE : suppression + verification selon besoin

Avec cette approche, votre code reste maintenable, testable et evolutif pour toutes les futures pages.
