# 📘 Guide Frontend React pour ERP (API Java REST)

---

# 📄 1. Formulaire (formulaire.md)

## 🎯 Objectif

Créer, modifier des données via API REST.

## 🧱 Structure

* Champs contrôlés (useState)
* Bouton submit
* Appel API POST / PUT

## 🧩 Exemple

```jsx
import { useState } from "react";
import axios from "axios";

function ProductForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axios.post("http://localhost:8080/api/products", {
      name,
      price
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={price} onChange={e => setPrice(e.target.value)} />
      <button type="submit">Enregistrer</button>
    </form>
  );
}
```

## ⚙️ Bonnes pratiques

* Validation avant envoi
* Désactiver bouton si invalide
* Feedback utilisateur (loading, succès)

---

# 📄 2. Liste (liste.md)

## 🎯 Objectif

Afficher les données depuis API

## 🧩 Exemple

```jsx
import { useEffect, useState } from "react";
import axios from "axios";

function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8080/api/products")
      .then(res => setProducts(res.data));
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Prix</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## ⚙️ Bonnes pratiques

* Loader pendant fetch
* Gestion erreurs
* Pagination si beaucoup de données

---

# 📄 3. Boutons & Actions (actions.md)

## 🎯 Objectif

Interagir avec les données

## 🧩 Exemple

```jsx
<button onClick={() => deleteProduct(id)}>Supprimer</button>
```

```jsx
const deleteProduct = async (id) => {
  await axios.delete(`http://localhost:8080/api/products/${id}`);
};
```

## ⚙️ Bonnes pratiques

* Confirmation avant suppression
* Feedback utilisateur

---

# 📄 4. Modification (edit.md)

## 🎯 Objectif

Modifier une donnée existante

## 🧩 Étapes

1. Charger les données
2. Remplir formulaire
3. Envoyer PUT

```jsx
useEffect(() => {
  axios.get(`/api/products/${id}`).then(res => {
    setName(res.data.name);
  });
}, []);
```

```jsx
axios.put(`/api/products/${id}`, { name });
```

---

# 📄 5. Gestion UI (ui-behavior.md)

## 🎨 Couleurs dynamiques

```jsx
<tr style={{ backgroundColor: p.stocked ? "white" : "red" }}>
```

## ☑️ Checkbox filtre

```jsx
<input type="checkbox" onChange={e => setOnlyStock(e.target.checked)} />
```

```jsx
const filtered = products.filter(p => !onlyStock || p.stocked);
```

## 🔍 Recherche

```jsx
<input onChange={e => setSearch(e.target.value)} />
```

```jsx
products.filter(p => p.name.includes(search));
```

---

# 📄 6. Structure globale

```
src/
 ├── api/
 ├── components/
 ├── pages/
 ├── services/
```

---

# 🎯 Résumé global

Frontend React :

* Formulaire → POST/PUT
* Liste → GET
* Actions → DELETE
* UI dynamique → filtres, couleurs

Backend Java :

* API REST
* JSON

Base de données :

* Persistante

---

# 🚀 Logique complète

React → API → Java → DB
DB → Java → API → React
