// src/contexts/ClientContext.jsx
import { createContext, useState, useEffect } from "react";

// 1. Création du contexte (Famoronana ilay Context)
// Ce contexte servira à stocker et partager les données du client partout dans l'application
// Ity contexte ity dia entina mitahiry sy mampiasa ny mombamomba ny client manerana ny application
export const ClientContext = createContext(null);

// 2. Création du Provider (Famoronana ny Provider)
// Le composant Provider englobe l'application pour fournir les données à ses enfants
// Ny Provider no mamatotra ny application mba hahafahan'ny enfants rehetra mampiasa ilay données
export function ClientProvider({ children }) {
  // 3. Initialisation de l'état (Fametrahana ny state hiandohana)
  // On crée un state "currentClient" vide au départ
  // Mamorona state "currentClient" foana amin'ny voalohany isika
  const [currentClient, setCurrentClient] = useState(null);

  // Etat de panier
  const [cart, setCart] = useState(() => {
    const storedCart = localStorage.getItem("cart");
    if(storedCart) {
      try {
        return JSON.parse(storedCart);
      } catch (error) {
        console.error("Erreur lors de la lecture du panier dans le localStorage", error);
        return [];
      }
    }
    return [];
  });

  // 4. Utilisation de useEffect (Fampiasana useEffect)
  // Au chargement du Provider, on va vérifier s'il y a déjà un client sauvegardé dans le localStorage
  // Rehefa mi-charger ny Provider, hojerentsika hoe efa misy client voatahiry ao amin'ny localStorage ve
  useEffect(() => {
    // Récupérer les données brutes (en texte) du client depuis le localStorage
    // Makà ny données brut (texte) an'ilay client ao amin'ny localStorage
    const storedClientInfo = localStorage.getItem("currentClient");

    // Si des données existent, on les transforme en objet JavaScript et on met à jour le state
    // Raha misy ilay données, dia avadika objet JavaScript izy ary mapitoviana amin'ny state
    if (storedClientInfo) {
      // On utilise un try/catch au cas où le contenu du localStorage ne serait pas un JSON valide
      // Mampiasa try/catch isika raha sanatria tsy JSON valide ilay ao amin'ny localStorage
      try {
        const parsedClientInfo = JSON.parse(storedClientInfo);
        setCurrentClient(parsedClientInfo);
      } catch (error) {
        console.error("Erreur lors de la lecture du client dans le localStorage / Misy olana amin'ny famakiana ny client ao amin'ny localStorage", error);
      }
    }
  }, []); // Le tableau vide [] signifie que ceci ne s'exécute qu'une seule fois au chargement / Ny tableau vide [] midika fa indray mandeha ihany no mandeha ity rehefa mi-charger

  // 5. Fonction pour définir le client actuel (Fonction mametraka ny client actuel)
  // On expose une fonction qui met à jour le state ET le localStorage en même temps
  // Mamorona fonction izay manova ny state SY ny localStorage miaraka isika
  const defineCurrentClient = (client) => {
    setCurrentClient(client);
    localStorage.setItem("currentClient", JSON.stringify(client));
  };

  // 6. Fonction pour déconnecter / retirer le client (Fonction mamoaka ilay client)
  // Utile si le client clique sur "Se déconnecter" ou "Changer de compte"
  // Tena ilaina raha tsindrian'ilay client ny hoe "Miala" na "Manova compte"
  const clearCurrentClient = () => {
    setCurrentClient(null);
    localStorage.removeItem("currentClient");
  };

  const addToCart = (product) => {
    if(!currentClient) {
      console.warn("Aucun client défini, impossible d'ajouter au panier");
      return;
    }

    const clientId = currentClient.id;

    // On vérifie si le produit est déjà dans le panier pour ce client
    const existingProduct = cart.find(item => item.id === product.id && item.clientId === clientId);

    let newCart;
    if (existingProduct) {
       // S'il existe déjà
       alert("Ce produit est déjà dans votre panier / Efa ao anaty harona ity entana ity");
       return; 
    } else {
       // Sinon, on rajoute le produit aux produits existants
       newCart = [...cart, { ...product, clientId }];
    }

    // On met a jour le State et le LocalStorage
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    alert("Produit ajouté au panier avec succès ! / Tafiditra soa aman-tsara tao anaty harona !");
  };

  const removeFromCart = (productId) => {
    if(!currentClient) return;
    
    const newCart = cart.filter(item => !(item.id === productId && item.clientId === currentClient.id));
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  // 7. Passage des valeurs aux composants enfants (Mampita ny donnees amin'ny composants enfants)
  // Tout ce qui est placé dans "value" sera accessible partout où l'on utilise ce contexte
  // Izay rehetra atao ao anatin'ity "value" ity dia ho hita na aiza na aiza mampiasa ity contexte ity
  return (
    <ClientContext.Provider
      value={{
        currentClient, 
        defineCurrentClient, 
        clearCurrentClient ,
        cart,
        addToCart,
        removeFromCart
      }}
    >
      {/* "children" représente tous les composants de l'application qui seront à l'intérieur du Provider */}
      {/* Ny "children" dia maneho ireo composants rehetra ao amin'ny application hapetraka ato anaty Provider */}
      {children}
    </ClientContext.Provider>
  );
}