# Les Types de Variables en React JS

## Vue d'ensemble

En React, comme en JavaScript standard, il existe trois types de variables : `const`, `let` et `var`. Chaque type a ses propres règles d'utilisation et ses implications sur la performance et la maintenabilité du code.

---

## 1. **const** - Constante (Recommandé par défaut)

### Caractéristiques
- **Réassignation** : ❌ Impossible
- **Initialisation** : ✅ Obligatoire à la déclaration
- **Portée** : Bloc (entre `{}`)
- **Reevaluation** : Non

### Utilisation en React

```jsx
// ✅ BON - Composant
const MyComponent = () => {
  return <div>Hello</div>;
};

// ✅ BON - État (bien que la référence change)
const [count, setCount] = useState(0);

// ✅ BON - Props
const { name, age } = props;

// ✅ BON - Constantes
const API_URL = "https://api.example.com";
const COLORS = { primary: "blue", secondary: "red" };
```

### Quand l'utiliser
- **Par défaut** pour tout ce qui ne change pas de référence
- Composants React
- Props destructurées
- Constantes globales ou locales
- Tableaux et objets (même si leur contenu change)

### Exemple concret

```jsx
const MyComponent = () => {
  const items = [];  // ✅ const car la référence ne change pas
  items.push("item1");  // ✅ Le contenu peut être modifié
  
  return <div>{items}</div>;
};
```

---

## 2. **let** - Variable (Utilisé quand c'est nécessaire)

### Caractéristiques
- **Réassignation** : ✅ Possible
- **Initialisation** : Optionnelle
- **Portée** : Bloc (entre `{}`)
- **Reevaluation** : Oui

### Utilisation en React

```jsx
// ✅ BON - Boucles et iterations
function ProductTable({ products }) {
  let lastCategory = null;  // ✅ Sera réassigné dans la boucle
  
  for (let product of products) {
    if (product.category !== lastCategory) {
      // Logique...
    }
    lastCategory = product.category;
  }
}

// ✅ BON - Variables temporaires
let tempValue = 0;
tempValue = calculateValue();
```

### Quand l'utiliser
- **Boucles** : Quand la variable est mise à jour dans la boucle
- **Réassignations multiples** : Quand la valeur change au cours du temps
- **Variables temporaires** : Dans les calculs ou transformations
- **Initialisation tardive** : Quand vous ne pouvez pas initialiser immédiatement

### Exemple concret

```jsx
function App() {
  let filteredProducts = [];  // ✅ let car sera réassigné
  
  if (showAll) {
    filteredProducts = products;
  } else {
    filteredProducts = products.filter(p => p.stocked);
  }
  
  return <ProductTable products={filteredProducts} />;
}
```

---

## 3. **var** - Ancienne syntaxe (À ÉVITER)

### Caractéristiques
- **Réassignation** : ✅ Possible
- **Initialisation** : Optionnelle
- **Portée** : Fonction (non limité au bloc)
- **Hoisting** : Oui (comportement confus)

### Problèmes

```javascript
// ❌ MAUVAIS - Portée de fonction confuse
function example() {
  if (true) {
    var x = 1;
  }
  console.log(x);  // 1 (visible en dehors du bloc!)
}

// ❌ MAUVAIS - Hoisting confus
console.log(y);  // undefined (pas d'erreur!)
var y = 5;

// ❌ MAUVAIS - Peut être réassigné accidentellement
var component = MyComponent;
var component = AnotherComponent;  // Pas d'erreur, remplace silencieusement
```

### Quand l'utiliser
- **JAMAIS** en React moderne
- Compatibilité avec du code legacy uniquement

---

## Résumé des Bonnes Pratiques en React

| Situation | Utiliser | Raison |
|-----------|----------|--------|
| Par défaut | `const` | Prévient les erreurs, montre l'intention |
| Boucles | `let` | La variable doit être réassignée |
| Mises à jour conditionnelles | `let` | Nécessite une réassignation |
| Variables temporaires | `let` | Peut être réassignée |
| Constantes globales | `const` | Ne doit pas changer |
| Ancienne syntaxe | `var` | ❌ À ÉVITER ABSOLUMENT |

---

## Exemple Complet

```jsx
import { useState } from 'react';

// ✅ const pour les constantes globales
const API_URL = "https://api.example.com";
const MAX_ITEMS = 10;

// ✅ const pour le composant
const App = () => {
  // ✅ const pour l'état React
  const [items, setItems] = useState([]);
  
  // ✅ const pour les tableaux qui seront modifiés
  const displayItems = [];
  
  // ✅ let pour les variables de contrôle dans les boucles
  let totalPrice = 0;
  
  for (let item of items) {
    if (item.price > 0) {
      displayItems.push(item);
      totalPrice += item.price;  // ✅ Réassignation légale avec let
    }
  }
  
  // ✅ const pour les constantes locales
  const handleClick = () => {
    console.log("Clicked!");
  };
  
  return (
    <div>
      <h1>Total: ${totalPrice}</h1>
      {displayItems.map(item => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
};

export default App;
```

---

## Points Clés à Retenir

1. **`const` par défaut** : C'est votre premier choix pour 90% des cas
2. **`let` si nécessaire** : Seulement quand la réassignation est requise
3. **`var` : jamais** : C'est une syntaxe obsolète
4. **La mutabilité** : `const` empêche la réassignation, pas la modification du contenu
5. **React préfère `const`** : Cela rend le code plus prévisible et plus facile à maintenir
