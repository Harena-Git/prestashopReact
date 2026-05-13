import { useState, useEffect } from "react";

export const PanierContext = createContext(null);

function PanierProvider({ children }) {
    // etat
    const [panier, setPanier] = useState(null);

    // useEffect pour charger le panier depuis le localStorage au démarrage
    useEffect(() => {
        const cart = localStorage.getItem("panier");
        if (cart) {
            setPanier(JSON.parse(cart));
        }
    }, []);

    return (
        <PanierContext.Provider value={{ panier, setPanier }}>
            {children}
        </PanierContext.Provider>
    );
}