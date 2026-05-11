# Guide Complet des Erreurs React et Solutions

## Table des Matières
1. [Erreurs d'Import](#erreurs-dimport)
2. [Erreurs d'État (State)](#erreurs-détat-state)
3. [Erreurs de Rendu](#erreurs-de-rendu)
4. [Erreurs de Props](#erreurs-de-props)
5. [Erreurs de Hooks](#erreurs-de-hooks)
6. [Erreurs de Clés (Keys)](#erreurs-de-clés-keys)
7. [Erreurs de Boucles et Logique](#erreurs-de-boucles-et-logique)
8. [Erreurs de Performance](#erreurs-de-performance)
9. [Erreurs d'Événements](#erreurs-dévénements)
10. [Erreurs Asynchrones](#erreurs-asynchrones)

---

## Erreurs d'Import

### 1. **Module not found / Cannot find module**

**Message console** :
```
Module not found: Can't resolve './components/Button'
```

**Origine** :
- Le fichier importé n'existe pas
- Chemin d'import incorrect
- Mauvais nom de fichier (casse sensible)

**Solutions** :
```javascript
// ❌ MAUVAIS - Le fichier n'existe pas
import { Button } from './components/Button';

// ✅ BON - Vérifier l'existence du fichier
import { Button } from './components/button';  // Fichier réel: button.jsx

// ✅ BON - Chemin absolu correct
import Button from '../../../components/button';

// ✅ BON - Utiliser le chemin correct
import { Button } from '@/components/button';  // si configuré
```

---

### 2. **Missing default export**

**Message console** :
```
The requested module does not provide an export named 'Button'
```

**Origine** :
- Export nommé au lieu de default export
- Confusion entre `export` et `export default`

**Solutions** :
```javascript
// ❌ MAUVAIS - Fichier button.jsx
export const Button = () => <button>Click</button>;

// ❌ MAUVAIS - Import avec default
import Button from './button';

// ✅ BON - Utiliser l'import nommé
import { Button } from './button';

// OU

// ✅ BON - Fichier button.jsx avec default export
const Button = () => <button>Click</button>;
export default Button;

// ✅ BON - Import par défaut
import Button from './button';
```

---

## Erreurs d'État (State)

### 3. **Cannot read property 'setState' of undefined**

**Message console** :
```
TypeError: Cannot read property 'setState' of undefined
```

**Origine** :
- Classe composante sans `this` binding
- Arrow function mal utilisée
- Contexte perdu

**Solutions** :
```javascript
// ❌ MAUVAIS - Perte de contexte
class MyComponent extends React.Component {
  handleClick() {
    this.setState({ count: 1 });  // 'this' est undefined
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// ✅ BON - Arrow function (binding automatique)
class MyComponent extends React.Component {
  handleClick = () => {
    this.setState({ count: 1 });
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// ✅ BON - Bind dans le constructeur
class MyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    this.setState({ count: 1 });
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}
```

---

### 4. **An error occurred in the <Component> component**

**Message console** :
```
An error occurred in the <App> component.
Consider adding an error boundary to your tree...
```

**Origine** :
- Appel de hook en dehors d'un composant
- Fonction manquante ou undefined
- Tentative d'accéder à une variable non déclarée

**Solutions** :
```javascript
// ❌ MAUVAIS - useState hors d'un composant
function helper() {
  const [count, setCount] = useState(0);  // Erreur!
}

// ✅ BON - useState dans un composant
function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ❌ MAUVAIS - Import manquant
const [count, setCount] = useState(0);  // useState n'est pas importé

// ✅ BON - Import correctement ajouté
import { useState } from 'react';

function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

---

### 5. **State mutation detected**

**Message console** :
```
Warning: Do not mutate state directly
```

**Origine** :
- Modification directe de l'état au lieu d'utiliser setState
- Mutation de tableaux/objets sans créer une nouvelle référence

**Solutions** :
```javascript
// ❌ MAUVAIS - Mutation directe
const [items, setItems] = useState([]);

function addItem() {
  items.push('new item');  // Mutation directe!
  setItems(items);
}

// ✅ BON - Créer un nouveau tableau
function addItem() {
  setItems([...items, 'new item']);
}

// ✅ BON - Utiliser slice
function removeItem(index) {
  setItems(items.filter((_, i) => i !== index));
}

// ❌ MAUVAIS - Mutation d'objet
const [user, setUser] = useState({ name: 'John' });

function updateName() {
  user.name = 'Jane';  // Mutation directe!
  setUser(user);
}

// ✅ BON - Créer un nouvel objet
function updateName() {
  setUser({ ...user, name: 'Jane' });
}
```

---

## Erreurs de Rendu

### 6. **Objects are not valid as a React child**

**Message console** :
```
Objects are not valid as a React child (found: object with keys...)
```

**Origine** :
- Tentative d'afficher un objet directement
- Réponse API non traitée
- Props mal structurées

**Solutions** :
```javascript
// ❌ MAUVAIS - Afficher un objet
const user = { name: 'John', age: 30 };
return <div>{user}</div>;  // Erreur!

// ✅ BON - Afficher les propriétés
return <div>{user.name} - {user.age}</div>;

// ❌ MAUVAIS - Afficher une réponse API entière
const [data, setData] = useState(null);
return <div>{data}</div>;

// ✅ BON - Traiter les données
return (
  <div>
    {data && data.map(item => (
      <div key={item.id}>{item.name}</div>
    ))}
  </div>
);

// ❌ MAUVAIS - Afficher un booléen ou null
return <div>{isVisible}</div>;  // Affiche rien

// ✅ BON - Convertir en texte
return <div>{isVisible ? 'Visible' : 'Caché'}</div>;
```

---

### 7. **Warning: Each child in a list should have a unique "key" prop**

**Message console** :
```
Warning: Each child in a list should have a unique "key" prop
```

**Origine** :
- Absence de clé (key) dans les listes
- Utilisation de l'index comme clé
- Clés non uniques

**Solutions** :
```javascript
// ❌ MAUVAIS - Pas de clé
const items = ['Apple', 'Banana', 'Cherry'];
return (
  <ul>
    {items.map(item => <li>{item}</li>)}  // Pas de key!
  </ul>
);

// ⚠️ PROBLÉMATIQUE - Utiliser l'index comme clé
return (
  <ul>
    {items.map((item, index) => <li key={index}>{item}</li>)}
  </ul>
);

// ✅ BON - Clé unique
const products = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' }
];
return (
  <ul>
    {products.map(product => <li key={product.id}>{product.name}</li>)}
  </ul>
);

// ✅ BON - Clé générée si pas d'ID
return (
  <ul>
    {items.map((item, index) => (
      <li key={`${item}-${index}`}>{item}</li>
    ))}
  </ul>
);
```

---

## Erreurs de Props

### 8. **Warning: Failed prop type**

**Message console** :
```
Warning: Failed prop type: Invalid prop 'age' of type 'string' supplied to 'User', expected 'number'
```

**Origine** :
- Validation PropTypes incorrecte
- Mauvais type de données passé en prop

**Solutions** :
```javascript
// ✅ BON - Définir PropTypes
import PropTypes from 'prop-types';

function User({ name, age, isActive }) {
  return <div>{name} - {age}</div>;
}

User.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number.isRequired,
  isActive: PropTypes.bool
};

// ✅ BON - Utiliser TypeScript (meilleur)
interface UserProps {
  name: string;
  age: number;
  isActive?: boolean;
}

function User({ name, age, isActive }: UserProps) {
  return <div>{name} - {age}</div>;
}

// ❌ MAUVAIS - Type incorrect
<User name="John" age="30" />  {/* age est string */}

// ✅ BON - Convertir le type
<User name="John" age={30} />  {/* age est number */}
```

---

### 9. **Undefined is not an object**

**Message console** :
```
Cannot read property 'name' of undefined
TypeError: Undefined is not an object (evaluating 'props.user.name')
```

**Origine** :
- Props non passées
- Valeur undefined accédée sans vérification
- Déstructuration incorrecte

**Solutions** :
```javascript
// ❌ MAUVAIS - Pas de vérification
function User({ user }) {
  return <div>{user.name}</div>;  // user peut être undefined!
}

// ✅ BON - Vérifier avant d'accéder
function User({ user }) {
  if (!user) return <div>Pas d'utilisateur</div>;
  return <div>{user.name}</div>;
}

// ✅ BON - Utiliser l'optional chaining
function User({ user }) {
  return <div>{user?.name || 'Sans nom'}</div>;
}

// ✅ BON - Valeur par défaut
function User({ user = {} }) {
  return <div>{user.name || 'Sans nom'}</div>;
}

// ❌ MAUVAIS - Déstructuration sans valeur par défaut
function User({ name, email }) {
  return <div>{name} - {email}</div>;  // Erreur si non passés
}

// ✅ BON - Déstructuration avec valeurs par défaut
function User({ name = 'Anonyme', email = 'N/A' }) {
  return <div>{name} - {email}</div>;
}
```

---

## Erreurs de Hooks

### 10. **Hooks can only be called inside the body of a function component**

**Message console** :
```
Error: Hooks can only be called inside the body of a function component
```

**Origine** :
- Hook utilisé en dehors d'un composant
- Hook dans une condition
- Hook dans une boucle

**Solutions** :
```javascript
// ❌ MAUVAIS - Hook en dehors du composant
const [count, setCount] = useState(0);

function MyComponent() {
  return <div>{count}</div>;
}

// ✅ BON - Hook dans le composant
function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ❌ MAUVAIS - Hook dans une condition
function MyComponent({ condition }) {
  if (condition) {
    const [count, setCount] = useState(0);  // Erreur!
  }
}

// ✅ BON - Hook au niveau du composant
function MyComponent({ condition }) {
  const [count, setCount] = useState(0);
  return condition ? <div>{count}</div> : <div>Non</div>;
}

// ❌ MAUVAIS - Hook dans une boucle
function MyComponent({ items }) {
  for (let item of items) {
    const [value, setValue] = useState(item);  // Erreur!
  }
}

// ✅ BON - Hook au niveau du composant
function MyComponent({ items }) {
  const [values, setValues] = useState(items);
  return <div>{values.map(v => <div key={v}>{v}</div>)}</div>;
}
```

---

### 11. **Missing dependency in useEffect**

**Message console** :
```
React Hook useEffect has missing dependencies: 'count', 'data'
```

**Origine** :
- Variables utilisées dans useEffect sans être dans les dépendances
- Array de dépendances incomplet ou incorrect

**Solutions** :
```javascript
// ❌ MAUVAIS - Dépendance manquante
function MyComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log(count);  // count utilisé mais pas dans dependencies
  }, []);  // Erreur!
}

// ✅ BON - Ajouter à dependencies
function MyComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log(count);
  }, [count]);  // count inclus
}

// ❌ MAUVAIS - Effet s'exécute à chaque rendu
function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  });  // Pas de dependencies = appel constant!
}

// ✅ BON - S'exécute une fois au montage
function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);  // [] = une seule fois au montage
}
```

---

### 12. **Too many re-renders / Infinite loop**

**Message console** :
```
Too many re-renders. React limits the number of renders...
```

**Origine** :
- setState appelé directement en rendu
- Événement sans fonction callback
- Dépendances infinies dans useEffect

**Solutions** :
```javascript
// ❌ MAUVAIS - setState appelé directement
function MyComponent() {
  const [count, setCount] = useState(0);
  
  return <div onClick={setCount(count + 1)}>{count}</div>;  // Erreur!
}

// ✅ BON - Fonction callback
function MyComponent() {
  const [count, setCount] = useState(0);
  
  return <div onClick={() => setCount(count + 1)}>{count}</div>;
}

// ❌ MAUVAIS - Appeler directement la fonction
<button onClick={handleClick()}>Click</button>  // handleClick() appelé!

// ✅ BON - Passer la fonction en référence
<button onClick={handleClick}>Click</button>

// ❌ MAUVAIS - Object comme dépendance (crée un nouvel objet à chaque rendu)
const config = { url: 'api' };

useEffect(() => {
  fetch(config.url);
}, [config]);  // Boucle infinie!

// ✅ BON - Créer config en dehors ou utiliser une dépendance simple
useEffect(() => {
  fetch('api');
}, []);

// ✅ BON - Mémoriser l'objet
const config = useMemo(() => ({ url: 'api' }), []);

useEffect(() => {
  fetch(config.url);
}, [config]);
```

---

## Erreurs de Clés (Keys)

### 13. **Index as key anti-pattern**

**Problème** :
```javascript
// ❌ PROBLÉMATIQUE - Utiliser l'index
{items.map((item, index) => (
  <div key={index}>{item.name}</div>
))}
```

**Pourquoi c'est mauvais** :
- Si la liste est réordonnée, les clés changent
- Si un élément est supprimé/inséré, les clés sont décalées
- React perd le state des éléments

**Solutions** :
```javascript
// ✅ BON - Utiliser un ID unique
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}

// ✅ BON - Générer une clé stable
{items.map((item, index) => (
  <div key={`${item.name}-${item.category}`}>{item.name}</div>
))}
```

---

## Erreurs de Boucles et Logique

### 14. **Mutation with const/let errors**

**Message console** :
```
TypeError: Assignment to constant variable
```

**Origine** :
- Utiliser `const` pour une variable qui doit être réassignée
- Confusion entre mutabilité et réassignation

**Solutions** :
```javascript
// ❌ MAUVAIS - const pour variable réassignée
const lastCategory = null;
for (let product of products) {
  lastCategory = product.category;  // Erreur! const ne peut pas être réassigné
}

// ✅ BON - Utiliser let
let lastCategory = null;
for (let product of products) {
  lastCategory = product.category;
}

// ✅ BON - const pour contenu mutable
const items = [];
items.push('item');  // OK, on modifie le contenu, pas la référence

// ❌ MAUVAIS - Réassigner un const
const items = [];
items = ['item'];  // Erreur!
```

---

### 15. **Logic errors in conditions**

**Problème** :
```javascript
// ❌ MAUVAIS - Condition logique inversée
if (!products) {
  return <ProductTable products={products} />;  // Affiche rien si products existe!
}

// ✅ BON - Logique correcte
if (!products || products.length === 0) {
  return <div>Aucun produit</div>;
}
return <ProductTable products={products} />;
```

---

## Erreurs de Performance

### 16. **Warning: Unnecessary re-renders**

**Message console** :
```
Rendering <Component> ... which is inside <Component>
```

**Origine** :
- Composant parent se re-rend inutilement
- Pas de mémorisation (useMemo, useCallback)

**Solutions** :
```javascript
// ✅ BON - Mémoriser les données coûteuses
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ✅ BON - Mémoriser les fonctions callback
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);

// ✅ BON - Mémoriser un composant
const MemoizedChild = React.memo(Child);
```

---

## Erreurs d'Événements

### 17. **Synthetic event is null**

**Message console** :
```
Warning: This synthetic event is reused for performance reasons...
```

**Origine** :
- Accéder à l'événement de manière asynchrone
- Événement utilisé après le callback

**Solutions** :
```javascript
// ❌ MAUVAIS - Accès asynchrone à l'événement
function handleChange(e) {
  setTimeout(() => {
    console.log(e.target.value);  // e est null!
  }, 1000);
}

// ✅ BON - Copier la valeur
function handleChange(e) {
  const value = e.target.value;  // Copier immédiatement
  setTimeout(() => {
    console.log(value);
  }, 1000);
}

// ✅ BON - Utiliser e.persist() (deprecated)
function handleChange(e) {
  e.persist();
  setTimeout(() => {
    console.log(e.target.value);
  }, 1000);
}
```

---

### 18. **"this" is undefined in event handler**

**Message console** :
```
TypeError: Cannot read property 'state' of undefined
```

**Origine** :
- Perte de contexte dans les classes
- Mauvais binding

**Solutions** :
```javascript
// ❌ MAUVAIS - Perte de "this"
class Button extends React.Component {
  handleClick() {
    console.log(this);  // undefined!
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// ✅ BON - Arrow function (binding automatique)
class Button extends React.Component {
  handleClick = () => {
    console.log(this);  // OK
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// ✅ BON - Bind dans le constructeur
class Button extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    console.log(this);  // OK
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// ✅ BON - Utiliser des composants fonctionnels (recommandé)
function Button() {
  const handleClick = () => {
    console.log('Clicked!');
  }
  return <button onClick={handleClick}>Click</button>;
}
```

---

## Erreurs Asynchrones

### 19. **Async/await errors**

**Message console** :
```
Uncaught (in promise) SyntaxError: Unexpected identifier
```

**Origine** :
- Utiliser async/await incorrectement
- Oublier les promises

**Solutions** :
```javascript
// ❌ MAUVAIS - async directement dans le rendu
useEffect(async () => {  // Erreur! async sans cleanup
  const data = await fetch('/api');
}, []);

// ✅ BON - Fonction async séparée
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api');
    const data = await response.json();
    setData(data);
  };
  fetchData();
}, []);

// ✅ BON - Utiliser .then()
useEffect(() => {
  fetch('/api')
    .then(r => r.json())
    .then(setData);
}, []);

// ❌ MAUVAIS - setState dans async sans cleanup
useEffect(() => {
  const fetchData = async () => {
    const data = await fetch('/api');
    setState(data);  // Peut causer une fuite mémoire!
  };
  fetchData();
}, []);

// ✅ BON - Nettoyer avec AbortController
useEffect(() => {
  const controller = new AbortController();
  
  const fetchData = async () => {
    const response = await fetch('/api', { signal: controller.signal });
    const data = await response.json();
    setState(data);
  };
  
  fetchData().catch(err => {
    if (err.name !== 'AbortError') console.error(err);
  });
  
  return () => controller.abort();  // Cleanup
}, []);
```

---

### 20. **Unhandled promise rejection**

**Message console** :
```
Uncaught (in promise) Error: Network request failed
```

**Origine** :
- Promise sans .catch()
- Erreur non gérée dans async/await

**Solutions** :
```javascript
// ❌ MAUVAIS - Pas de gestion d'erreur
useEffect(() => {
  fetch('/api').then(r => r.json()).then(setData);  // Pas de .catch()
}, []);

// ✅ BON - Ajouter un catch
useEffect(() => {
  fetch('/api')
    .then(r => r.json())
    .then(setData)
    .catch(error => console.error('Erreur:', error));
}, []);

// ✅ BON - Utiliser try/catch avec async/await
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/api');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Erreur:', error);
      setError(error);
    }
  };
  fetchData();
}, []);
```

---

## Résumé des Erreurs Critiques

| Erreur | Cause Principale | Correction Rapide |
|--------|------------------|------------------|
| "Cannot find module" | Import incorrect | Vérifier chemin et nom fichier |
| "Object not valid as child" | Afficher un objet | Accéder aux propriétés |
| "Missing key prop" | Pas de clé dans liste | Ajouter `key={unique}` |
| "Too many re-renders" | setState en rendu | Utiliser callback: `onClick={() => setState()}` |
| "useState hook error" | Pas d'import | Ajouter `import { useState } from 'react'` |
| "Undefined is not an object" | Accès sans vérification | Utiliser `?.` ou vérifier `if` |
| "Missing dependency" | useEffect incomplet | Ajouter dépendances manquantes |
| "Assignment to const" | Réassigner const | Utiliser `let` à la place |

---

## Bonnes Pratiques de Débogage

### 1. **Utiliser React DevTools**
- Installer l'extension React DevTools
- Profiler les composants
- Inspecter les props et state

### 2. **Lire les messages d'erreur attentivement**
- Le stack trace indique le fichier et la ligne
- Le composant qui cause l'erreur est listé

### 3. **Utiliser console.log strategiquement**
```javascript
console.log('Rendu:', props);
useEffect(() => {
  console.log('Montage du composant');
  return () => console.log('Démontage');
}, []);
```

### 4. **Activer le Strict Mode**
```javascript
// Dans main.jsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

### 5. **Utiliser TypeScript**
```typescript
interface Props {
  name: string;
  age: number;
}

function User({ name, age }: Props) {
  return <div>{name} - {age}</div>;
}
```

---

## Checklist de Débogage

- [ ] L'import de React/useState est-il présent ?
- [ ] Les composants ont-ils des clés uniques dans les listes ?
- [ ] Les props sont-elles du bon type ?
- [ ] Les dépendances de useEffect sont-elles correctes ?
- [ ] Pas de setState direct dans le rendu ?
- [ ] Les objets/tableaux sont-ils immutables ?
- [ ] Les hooks sont-ils au niveau du composant ?
- [ ] Le contexte (this) est-il préservé ?
- [ ] Les erreurs asynchrones sont-elles gérées ?
- [ ] Pas de mutations d'état ?
