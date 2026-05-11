# Les Pages (Sidebar + Liens)

But: guider la construction d'une **sidebar** et la gestion des **liens/routes** dans ce projet React.

Règle d'or: **une seule source de vérité** pour les pages => `SIDEBAR_PAGES`.

Ensuite:
- la `Sidebar` lit `SIDEBAR_PAGES`
- le `AppRouter` déclare les `Route` depuis les mêmes chemins

---

## 0) Prérequis

Le projet actuel n'a pas de router multi-pages.

Installer:

```bash
npm install react-router-dom
```

---

## 1) Code de base (copie-colle) – Sidebar + Routes

### 1.1 `src/features/navigation/constants/sidebarPages.js`

```js
// Source unique de vérité pour les liens de la sidebar
export const SIDEBAR_PAGES = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    showInSidebar: true,
  },
  {
    id: "module-cleanup",
    label: "Suppression modules",
    path: "/modules/cleanup",
    showInSidebar: true,
  },
];
```

### 1.2 `src/features/navigation/components/Sidebar.jsx`

```jsx
import { NavLink } from "react-router-dom";
import { SIDEBAR_PAGES } from "../constants/sidebarPages";

function Sidebar() {
  return (
    <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Navigation</h2>

      <nav aria-label="Sidebar">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {SIDEBAR_PAGES.filter((page) => page.showInSidebar).map((page) => (
            <li key={page.id}>
              <NavLink
                to={page.path}
                style={({ isActive }) => ({
                  display: "block",
                  padding: "8px 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  background: isActive ? "#eef3ff" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {page.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
```

### 1.3 `src/layouts/MainLayout.jsx` (layout avec sidebar)

```jsx
import { Outlet } from "react-router-dom";
import Sidebar from "../features/navigation/components/Sidebar";

function MainLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
```

### 1.4 `src/app/AppRouter.jsx`

```jsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ModuleCleanupPage from "../features/modules/pages/ModuleCleanupPage";

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function NotFoundPage() {
  return <h1>404 - Page introuvable</h1>;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/modules/cleanup" element={<ModuleCleanupPage />} />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
```

### 1.5 `src/App.jsx` (brancher le routeur)

Remplacer le rendu direct de la page par le routeur:

```jsx
import AppRouter from "./app/AppRouter";

function App() {
  return <AppRouter />;
}

export default App;
```

---

## 2) Parties à changer (quand tu ajoutes/modifies des pages)

### 2.1 Ajouter une nouvelle page dans la sidebar

1. Ajouter une entrée dans `SIDEBAR_PAGES` (`sidebarPages.js`):

```js
{
  id: "import-csv",
  label: "Import CSV",
  path: "/import/csv",
  showInSidebar: true,
}
```

2. Créer la page (exemple):

`src/features/.../pages/ImportCsvPage.jsx`

```jsx
function ImportCsvPage() {
  return <h1>Import CSV</h1>;
}

export default ImportCsvPage;
```

3. Ajouter la route correspondante dans `src/app/AppRouter.jsx`:

```jsx
import ImportCsvPage from "../features/.../pages/ImportCsvPage";

// ...
<Route path="/import/csv" element={<ImportCsvPage />} />
```

### 2.2 Modifier un chemin existant

- Tu modifies `SIDEBAR_PAGES.path`
- et tu modifies la route correspondante dans `AppRouter.jsx`

Vérification: chaque entrée visible de `SIDEBAR_PAGES` doit avoir un `<Route path="...">` correspondant.

### 2.3 Masquer une page sans casser la route

- Mettre `showInSidebar: false`
- Conserver la route dans `AppRouter.jsx`
