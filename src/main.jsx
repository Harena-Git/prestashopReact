import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ClientProvider } from './contexts/ClientContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ClientProvider>
        <App />
      </ClientProvider>
    </AuthProvider>
  </React.StrictMode>,
)