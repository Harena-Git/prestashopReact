import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import ModuleCleanupPage from "../features/modules/pages/ModuleCleanupPage";
import ModuleImportPage from "../features/modules/pages/ModuleImportPage";
import ModuleProductList from "../features/modules/pages/ModuleProductList";
import HomePage from "../features/modules/pages/HomePage";
import LoginPage from "../features/modules/pages/LoginPage";
import AdminPage from "../features/modules/pages/AdminPage";
import { AuthContext } from "../contexts/AuthContext";

function NotFoundPage() {
  return <h1>404 - Page introuvable</h1>;
}

function AppRouter() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques sans Sidebar */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes Admin avec Admin Sidebar - PROTÉGÉES */}
        <Route 
          element={isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />}
        >
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/modules/cleanup" element={<ModuleCleanupPage />} />
          <Route path="/admin/modules/import" element={<ModuleImportPage />} />
        </Route>

        {/* Routes normales avec Sidebar normal */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/modules/list" element={<ModuleProductList />} />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;