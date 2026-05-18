import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import ClientLayout from "../layouts/ClientLayout";
import ModuleCleanupPage from "../features/modules/pages/ModuleCleanupPage";
import ModuleImportPage from "../features/modules/pages/ModuleImportPage";
import ModuleProductList from "../features/modules/pages/ModuleProductList";
import CheckoutPage from "../features/modules/pages/CheckoutPage";
import HomePage from "../features/modules/pages/HomePage";
import LoginPage from "../features/modules/pages/LoginPage";
import AdminPage from "../features/modules/pages/AdminPage";
import ListLoginClients from "../features/modules/pages/ListLoginClients";
import ListCommande from "../features/modules/pages/ListCommande";
import { AuthContext } from "../contexts/AuthContext";
import DataImportPage from "../features/modules/pages/DataImportPage";
import PanierPages from "../features/modules/pages/PanierPages";
import OrderDashboard from "../features/modules/components/OrderDashboard";
import ClientOrdersPage from "../features/modules/pages/ClientOrdersPage";
import StockManagementPage from "../features/modules/pages/StockManagementPage";
import StockMovementsPage from "../features/modules/pages/StockMovementsPage";

function NotFoundPage() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>404 - Page introuvable</h1>
      <p>L'URL demandée n'existe pas.</p>
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin - Protégé */}
        <Route
          path="/admin"
          element={
            isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route index element={<AdminPage />} />
          <Route path="modules/cleanup" element={<ModuleCleanupPage />} />
          <Route path="modules/import" element={<ModuleImportPage />} />
          <Route path="modules/data-import" element={<DataImportPage />} />
          <Route path="orders" element={<ListCommande />} />
          <Route path="dashboard" element={<OrderDashboard />} />
          <Route path="stock" element={<StockManagementPage />} />
          <Route path="stock-movements" element={<StockMovementsPage />} />
        </Route>

        {/* Public - Sidebar Navigation */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="customers" element={<ListLoginClients />} />
        </Route>

        {/* Client - Sidebar Spécifique */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<ModuleProductList />} />
          <Route path="cart" element={<PanierPages />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<ClientOrdersPage />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
