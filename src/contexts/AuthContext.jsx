// fichier de connection sur login
// créer un espace global pour partager des données entre composants React
import React, { createContext, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (email, password) => {
    const VALID_EMAIL = "faniriantsoaharena@gmail.com";
    const VALID_PASSWORD = "faniriantsoaharena@gmail.com";

    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}