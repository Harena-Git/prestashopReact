# Guide Complet des Hooks React

## Introduction
Les hooks sont des fonctions spéciales de React qui permettent d'utiliser l'état et d'autres fonctionnalités de React dans les composants fonctionnels. Ce guide explique chaque hook avec des exemples concrets et pratiques.

---

## 1. **useState** - Gérer l'état local

### C'est quoi ?
`useState` est un hook qui permet d'ajouter un état local (une variable qui change) dans un composant fonctionnel. Chaque fois que l'état change, le composant se réaffiche.

### Pourquoi l'utiliser ?
- Pour stocker et gérer des données qui changent (valeurs de formulaires, compteurs, booléens, etc.)
- Chaque fois que vous avez besoin que une modification déclenche un re-rendu

### Comment l'utiliser ?
```javascript
const [state, setState] = useState(valeurInitiale);
```

### Exemples Concrets

#### Exemple 1: Formulaire d'entrée utilisateur
```javascript
import { useState } from 'react';

export function FormInput() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Email:', email, 'Password:', password);
    // Envoyer les données à la base de données
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Entrez votre email"
      />
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Entrez votre mot de passe"
      />
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

#### Exemple 2: Compteur simple
```javascript
export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Compteur: {count}</p>
      <button onClick={() => setCount(count + 1)}>Augmenter</button>
      <button onClick={() => setCount(count - 1)}>Diminuer</button>
      <button onClick={() => setCount(0)}>Réinitialiser</button>
    </div>
  );
}
```

#### Exemple 3: Affichage/Masquage conditionnel
```javascript
export function TogglePanel() {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div>
      <button onClick={() => setIsVisible(!isVisible)}>
        {isVisible ? 'Masquer' : 'Afficher'}
      </button>
      {isVisible && (
        <div className="panel">
          Contenu affichage/masqué selon l'état
        </div>
      )}
    </div>
  );
}
```

---

## 2. **useEffect** - Effectuer des actions secondaires

### C'est quoi ?
`useEffect` permet d'exécuter du code quand le composant est monté, mis à jour, ou avant qu'il soit démonté. C'est idéal pour les appels API, les timers, les abonnements, etc.

### Pourquoi l'utiliser ?
- Charger des données depuis une API
- Configurer des timers ou des intervalles
- S'abonner à des événements
- Mettre à jour le titre de la page
- Nettoyer les ressources (timers, abonnements)

### Comment l'utiliser ?
```javascript
useEffect(() => {
  // Code à exécuter
  
  return () => {
    // Code de nettoyage (optionnel)
  };
}, [dependances]); // Les dépendances contrôlent quand le hook s'exécute
```

**Les dépendances:**
- `[]` - S'exécute une seule fois après le rendu du composant
- `[dep1, dep2]` - S'exécute quand dep1 ou dep2 change
- Pas de tableau - S'exécute à chaque rendu (À ÉVITER!)

### Exemples Concrets

#### Exemple 1: Charger des données depuis une API
```javascript
import { useState, useEffect } from 'react';

export function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []); // S'exécute une seule fois au chargement
  
  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur: {error}</p>;
  
  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>{product.name} - {product.price}€</li>
      ))}
    </ul>
  );
}
```

#### Exemple 2: Timer qui se met à jour
```javascript
export function Timer() {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer); // Nettoyer le timer
  }, []); // S'exécute une seule fois
  
  return <p>Temps écoulé: {seconds} secondes</p>;
}
```

#### Exemple 3: Charger les données quand un paramètre change
```javascript
export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]); // S'exécute quand userId change
  
  if (!user) return <p>Chargement...</p>;
  
  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

---

## 3. **useContext** - Partager des données globales

### C'est quoi ?
`useContext` permet d'accéder à des données globales sans devoir les passer via les props d'un composant à l'autre (évite le "prop drilling").

### Pourquoi l'utiliser ?
- Partager un thème (clair/sombre) dans toute l'application
- Partager des informations utilisateur
- Partager la langue/localisation
- Éviter de passer des props à travers de nombreux niveaux

### Comment l'utiliser ?
```javascript
// 1. Créer le contexte
const MonContexte = createContext();

// 2. Créer un provider
export function MonProvider({ children }) {
  const [valeur, setValeur] = useState('...');
  
  return (
    <MonContexte.Provider value={{ valeur, setValeur }}>
      {children}
    </MonContexte.Provider>
  );
}

// 3. Utiliser le contexte dans un composant
const { valeur } = useContext(MonContexte);
```

### Exemple Concret: Thème global
```javascript
import { createContext, useContext, useState } from 'react';

// Créer le contexte
const ThemeContext = createContext();

// Provider
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte facilement
export function useTheme() {
  return useContext(ThemeContext);
}

// Composant utilisant le contexte
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Thème actuel: {theme} (Cliquez pour changer)
    </button>
  );
}

// Composant de contenu qui utilise le thème
export function Content() {
  const { theme } = useTheme();
  
  return (
    <div style={{
      backgroundColor: theme === 'light' ? '#fff' : '#333',
      color: theme === 'light' ? '#000' : '#fff',
      padding: '20px'
    }}>
      Contenu avec thème {theme}
    </div>
  );
}

// Utilisation dans App.jsx
export function App() {
  return (
    <ThemeProvider>
      <ThemeToggle />
      <Content />
    </ThemeProvider>
  );
}
```

---

## 4. **useReducer** - Gérer un état complexe

### C'est quoi ?
`useReducer` est un hook similaire à `useState`, mais pour des états plus complexes. Il utilise une fonction "reducer" qui décide comment l'état change.

### Pourquoi l'utiliser ?
- Quand l'état dépend de l'état précédent
- Quand vous avez plusieurs actions possibles
- Quand vous devez gérer un état avec plusieurs propriétés liées
- C'est plus facile à tester et à debugger que plusieurs `useState`

### Comment l'utiliser ?
```javascript
const [state, dispatch] = useReducer(reducer, initialState);

// La fonction reducer reçoit l'état actuel et une action
function reducer(state, action) {
  switch(action.type) {
    case 'ACTION_1':
      return { ...state, propriete: valeur };
    case 'ACTION_2':
      return { ...state, propriete: valeur };
    default:
      return state;
  }
}
```

### Exemple Concret: Panier d'achats
```javascript
import { useReducer } from 'react';

// État initial
const initialCart = {
  items: [],
  total: 0
};

// Fonction reducer
function cartReducer(state, action) {
  switch(action.type) {
    case 'ADD_ITEM':
      return {
        items: [...state.items, action.payload],
        total: state.total + action.payload.price
      };
    
    case 'REMOVE_ITEM':
      const itemToRemove = state.items[action.payload];
      return {
        items: state.items.filter((_, i) => i !== action.payload),
        total: state.total - itemToRemove.price
      };
    
    case 'CLEAR_CART':
      return initialCart;
    
    default:
      return state;
  }
}

// Composant
export function ShoppingCart() {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);
  
  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };
  
  const removeItem = (index) => {
    dispatch({ type: 'REMOVE_ITEM', payload: index });
  };
  
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  
  return (
    <div>
      <h2>Panier ({cart.items.length} articles)</h2>
      <ul>
        {cart.items.map((item, i) => (
          <li key={i}>
            {item.name} - {item.price}€
            <button onClick={() => removeItem(i)}>Supprimer</button>
          </li>
        ))}
      </ul>
      <p>Total: {cart.total}€</p>
      <button onClick={() => addItem({ name: 'Produit', price: 10 })}>
        Ajouter un produit
      </button>
      <button onClick={clearCart}>Vider le panier</button>
    </div>
  );
}
```

---

## 5. **useMemo** - Mémoriser des calculs coûteux

### C'est quoi ?
`useMemo` mémorise le résultat d'un calcul coûteux et ne le recalcule que si ses dépendances changent.

### Pourquoi l'utiliser ?
- Vous avez un calcul complexe/coûteux
- Vous devez passer le résultat en props à des composants enfants
- Vous voulez éviter les re-rendus inutiles

### Comment l'utiliser ?
```javascript
const valeurMemoriseee = useMemo(() => {
  // Calcul coûteux ici
  return resultat;
}, [dependances]);
```

### Exemple Concret: Filtrer et trier une grande liste
```javascript
import { useMemo, useState } from 'react';

export function ProductsFilter() {
  const [products, setProducts] = useState([
    { id: 1, name: 'Laptop', price: 800, category: 'Électronique' },
    { id: 2, name: 'Souris', price: 20, category: 'Accessoires' },
    { id: 3, name: 'Clavier', price: 100, category: 'Accessoires' },
    // ... 1000 produits
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState(0);
  
  // Calcul coûteux: filtrer et trier 1000+ produits
  const filteredProducts = useMemo(() => {
    console.log('Recalcul de la liste filtrée...');
    
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => p.price >= minPrice)
      .sort((a, b) => a.price - b.price);
  }, [searchTerm, minPrice, products]); // Recalcule seulement si l'une de ces dépendances change
  
  return (
    <div>
      <input
        type="text"
        placeholder="Chercher..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <input
        type="number"
        placeholder="Prix minimum"
        value={minPrice}
        onChange={(e) => setMinPrice(Number(e.target.value))}
      />
      
      <p>Résultats: {filteredProducts.length}</p>
      <ul>
        {filteredProducts.map(product => (
          <li key={product.id}>
            {product.name} - {product.price}€
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 6. **useCallback** - Mémoriser des fonctions

### C'est quoi ?
`useCallback` mémorise une fonction et ne crée une nouvelle fonction que si ses dépendances changent.

### Pourquoi l'utiliser ?
- Vous passez une fonction en props à des composants enfants optimisés
- Vous devez passer une fonction à `useEffect`
- Vous avez une fonction complexe utilisée dans plusieurs endroits

### Comment l'utiliser ?
```javascript
const memoizedCallback = useCallback(() => {
  // Fonction ici
}, [dependances]);
```

### Exemple Concret: Composant d'input optimisé
```javascript
import { useCallback, memo } from 'react';

// Composant enfant optimisé - ne re-rend que si les props changent vraiment
const InputField = memo(({ value, onChange, label }) => {
  console.log('InputField rendu:', label);
  
  return (
    <div>
      <label>{label}</label>
      <input value={value} onChange={onChange} />
    </div>
  );
});

export function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Sans useCallback: nouvelle fonction à chaque rendu
  // Avec useCallback: même fonction si [name] ne change pas
  const handleNameChange = useCallback((e) => {
    setName(e.target.value);
  }, []);
  
  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
  }, []);
  
  return (
    <form>
      <InputField value={name} onChange={handleNameChange} label="Nom" />
      <InputField value={email} onChange={handleEmailChange} label="Email" />
    </form>
  );
}
```

---

## 7. **useRef** - Accéder directement aux éléments DOM

### C'est quoi ?
`useRef` crée une référence qui persiste entre les rendus et permet d'accéder directement aux éléments DOM ou de stocker des valeurs qui ne causent pas de re-rendu.

### Pourquoi l'utiliser ?
- Accéder à un input HTML pour récupérer sa valeur
- Focus sur un input
- Jouer/Arrêter une vidéo ou un audio
- Intégrer une librairie externe (maps, charts)
- Stocker une valeur qui ne doit pas causer de re-rendu

### Comment l'utiliser ?
```javascript
const ref = useRef(valeurInitiale);
// Accéder: ref.current
```

### Exemples Concrets

#### Exemple 1: Focus sur un input
```javascript
import { useRef } from 'react';

export function SearchInput() {
  const inputRef = useRef(null);
  
  const handleFocus = () => {
    inputRef.current.focus();
  };
  
  return (
    <div>
      <input 
        ref={inputRef}
        type="text"
        placeholder="Cliquez sur le bouton pour focus"
      />
      <button onClick={handleFocus}>Focus sur l'input</button>
    </div>
  );
}
```

#### Exemple 2: Contrôler une vidéo
```javascript
export function VideoPlayer() {
  const videoRef = useRef(null);
  
  const play = () => videoRef.current.play();
  const pause = () => videoRef.current.pause();
  
  return (
    <div>
      <video ref={videoRef} width="400" src="video.mp4" />
      <button onClick={play}>Lecture</button>
      <button onClick={pause}>Pause</button>
    </div>
  );
}
```

#### Exemple 3: Stocker une valeur qui ne cause pas de re-rendu
```javascript
export function StopWatch() {
  const [time, setTime] = useState(0);
  const intervalRef = useRef(null);
  
  const start = () => {
    intervalRef.current = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
  };
  
  const stop = () => {
    clearInterval(intervalRef.current);
  };
  
  return (
    <div>
      <p>Temps: {time}s</p>
      <button onClick={start}>Démarrer</button>
      <button onClick={stop}>Arrêter</button>
    </div>
  );
}
```

---

## 8. **useLayoutEffect** - Comme useEffect mais synchrone

### C'est quoi ?
`useLayoutEffect` est similaire à `useEffect`, mais il s'exécute **avant** que le navigateur ne peigne l'écran.

### Pourquoi l'utiliser ?
- Mesurer les dimensions des éléments DOM
- Calculer des positions (utile pour les modales, tooltips)
- Éviter les flickering (scintillement)

### ⚠️ Attention
- À utiliser rarement
- Peut ralentir votre application si mal utilisé
- Préférez `useEffect` dans la plupart des cas

### Exemple Concret: Récupérer la hauteur d'un élément
```javascript
import { useLayoutEffect, useState, useRef } from 'react';

export function ElementHeight() {
  const elementRef = useRef(null);
  const [height, setHeight] = useState(0);
  
  useLayoutEffect(() => {
    if (elementRef.current) {
      setHeight(elementRef.current.offsetHeight);
    }
  }, []);
  
  return (
    <div>
      <div ref={elementRef} style={{ padding: '20px', border: '1px solid blue' }}>
        Contenu de l'élément
      </div>
      <p>Hauteur de l'élément: {height}px</p>
    </div>
  );
}
```

---

## Résumé - Quand utiliser quel hook ?

| Hook | Utilisation |
|------|-----------|
| **useState** | Stocker et gérer un état local simple |
| **useEffect** | Charger des données, timers, nettoyage |
| **useContext** | Partager des données globales |
| **useReducer** | Gérer un état complexe avec plusieurs actions |
| **useMemo** | Mémoriser un calcul coûteux |
| **useCallback** | Mémoriser une fonction |
| **useRef** | Accéder à un élément DOM ou stocker une valeur persistante |
| **useLayoutEffect** | Mesurer le DOM avant le rendu (rare) |

---

## Bonnes Pratiques

✅ **À FAIRE:**
- Garder les hooks simples et lisibles
- Utiliser des noms descriptifs pour les variables d'état
- Mettre les bonnes dépendances dans les tableaux
- Créer des custom hooks pour réutiliser la logique

❌ **À ÉVITER:**
- Mettre la logique complexe directement dans un composant
- Oublier les dépendances dans `useEffect` et `useMemo`
- Utiliser `useCallback` et `useMemo` sans raison valide (premature optimization)
- Mettre les hooks dans des conditions ou boucles

---

## Resources et Documentation
- [Documentation Officielle React](https://react.dev/reference/react)
- [React Hooks Rules](https://react.dev/warnings/invalid-hook-call-warning)
