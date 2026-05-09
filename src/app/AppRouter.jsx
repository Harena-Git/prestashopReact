import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ModuleCleanupPage from "../features/modules/pages/ModuleCleanupPage";
import ModuleImportPage from "../features/modules/pages/ModuleImportPage";

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function NotFoundPage() {
  return <h1>404 - Page introuvable</h1>;
}

function listModules() {
  return <h1>Liste des modules</h1>;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/modules/cleanup" element={<ModuleCleanupPage />} />
          <Route path="/modules/import" element={<ModuleImportPage />} />
          <Route path="/modules/list" element={<listModules />} />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
