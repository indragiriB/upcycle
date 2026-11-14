import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleGate,
  RootRedirect,
} from '@/routes/guards';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SetupRequiredPage } from '@/pages/SetupRequiredPage';

// Halaman dimuat terpisah agar bundle awal tetap ringan. Pengguna di jaringan
// lambat hanya mengunduh halaman yang benar-benar dibuka.
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);
const DepositFormPage = lazy(() =>
  import('@/pages/warga/DepositFormPage').then((module) => ({
    default: module.DepositFormPage,
  })),
);
const WastePricesPage = lazy(() =>
  import('@/pages/warga/WastePricesPage').then((module) => ({
    default: module.WastePricesPage,
  })),
);
const DepositHistoryPage = lazy(() =>
  import('@/pages/warga/DepositHistoryPage').then((module) => ({
    default: module.DepositHistoryPage,
  })),
);
const DepositQueuePage = lazy(() =>
  import('@/pages/bsu/DepositQueuePage').then((module) => ({
    default: module.DepositQueuePage,
  })),
);
const PickupSchedulePage = lazy(() =>
  import('@/pages/bsu/PickupSchedulePage').then((module) => ({
    default: module.PickupSchedulePage,
  })),
);
const PricingPage = lazy(() =>
  import('@/pages/bsu/PricingPage').then((module) => ({
    default: module.PricingPage,
  })),
);
const CashBookPage = lazy(() =>
  import('@/pages/bsu/CashBookPage').then((module) => ({
    default: module.CashBookPage,
  })),
);
const DepositDetailPage = lazy(() =>
  import('@/pages/deposits/DepositDetailPage').then((module) => ({
    default: module.DepositDetailPage,
  })),
);
const IncomingDepositsPage = lazy(() =>
  import('@/pages/bsi/IncomingDepositsPage').then((module) => ({
    default: module.IncomingDepositsPage,
  })),
);
const IncomingDepositDetailPage = lazy(() =>
  import('@/pages/bsi/IncomingDepositDetailPage').then((module) => ({
    default: module.IncomingDepositDetailPage,
  })),
);
const BsiStockPage = lazy(() =>
  import('@/pages/bsi/StockPage').then((module) => ({
    default: module.StockPage,
  })),
);
const BsiOrdersPage = lazy(() =>
  import('@/pages/bsi/OrdersPage').then((module) => ({
    default: module.BsiOrdersPage,
  })),
);
const IndustriStockPage = lazy(() =>
  import('@/pages/industri/StockCatalogPage').then((module) => ({
    default: module.IndustriStockPage,
  })),
);
const IndustriOrdersPage = lazy(() =>
  import('@/pages/industri/OrdersPage').then((module) => ({
    default: module.IndustriOrdersPage,
  })),
);
const MarketplacePage = lazy(() =>
  import('@/pages/MarketplacePage').then((module) => ({
    default: module.MarketplacePage,
  })),
);
const ProductManagementPage = lazy(() =>
  import('@/pages/products/ProductManagementPage').then((module) => ({
    default: module.ProductManagementPage,
  })),
);
const WargaOrdersPage = lazy(() =>
  import('@/pages/products/WargaOrdersPage').then((module) => ({
    default: module.WargaOrdersPage,
  })),
);
const WasteTypesPage = lazy(() =>
  import('@/pages/admin/WasteTypesPage').then((module) => ({
    default: module.WasteTypesPage,
  })),
);
const OrganizationVerificationPage = lazy(() =>
  import('@/pages/admin/OrganizationVerificationPage').then((module) => ({
    default: module.OrganizationVerificationPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/pages/admin/UsersPage').then((module) => ({
    default: module.UsersPage,
  })),
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/masuk" element={<LoginPage />} />
        <Route path="/daftar" element={<RegisterPage />} />
        <Route path="/lupa-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/atur-ulang-password"
        element={<ResetPasswordPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route
            path="/warga/setor"
            element={
              <RoleGate path="/warga/setor">
                <DepositFormPage />
              </RoleGate>
            }
          />
          <Route
            path="/warga/harga"
            element={
              <RoleGate path="/warga/harga">
                <WastePricesPage />
              </RoleGate>
            }
          />
          <Route
            path="/warga/riwayat"
            element={
              <RoleGate path="/warga/riwayat">
                <DepositHistoryPage />
              </RoleGate>
            }
          />
          <Route
            path="/warga/setoran/:depositId"
            element={
              <RoleGate path="/warga/riwayat">
                <DepositDetailPage viewer="warga" />
              </RoleGate>
            }
          />

          <Route
            path="/bsu/setoran"
            element={
              <RoleGate path="/bsu/setoran">
                <DepositQueuePage />
              </RoleGate>
            }
          />
          <Route
            path="/bsu/setoran/:depositId"
            element={
              <RoleGate path="/bsu/setoran">
                <DepositDetailPage viewer="bsu" />
              </RoleGate>
            }
          />
          <Route
            path="/bsu/jemput"
            element={
              <RoleGate path="/bsu/jemput">
                <PickupSchedulePage />
              </RoleGate>
            }
          />
          <Route
            path="/bsu/harga"
            element={
              <RoleGate path="/bsu/harga">
                <PricingPage />
              </RoleGate>
            }
          />
          <Route
            path="/bsu/kas"
            element={
              <RoleGate path="/bsu/kas">
                <CashBookPage />
              </RoleGate>
            }
          />

          <Route
            path="/bsi/setoran"
            element={
              <RoleGate path="/bsi/setoran">
                <IncomingDepositsPage />
              </RoleGate>
            }
          />
          <Route
            path="/bsi/setoran/:depositId"
            element={
              <RoleGate path="/bsi/setoran">
                <IncomingDepositDetailPage />
              </RoleGate>
            }
          />
          <Route
            path="/bsi/stok"
            element={
              <RoleGate path="/bsi/stok">
                <BsiStockPage />
              </RoleGate>
            }
          />
          <Route
            path="/bsi/pesanan"
            element={
              <RoleGate path="/bsi/pesanan">
                <BsiOrdersPage />
              </RoleGate>
            }
          />
          <Route
            path="/bsi/kas"
            element={
              <RoleGate path="/bsi/kas">
                <CashBookPage variant="bsi" />
              </RoleGate>
            }
          />

          <Route
            path="/industri/stok"
            element={
              <RoleGate path="/industri/stok">
                <IndustriStockPage />
              </RoleGate>
            }
          />
          <Route
            path="/industri/pesanan"
            element={
              <RoleGate path="/industri/pesanan">
                <IndustriOrdersPage />
              </RoleGate>
            }
          />
          <Route
            path="/industri/kas"
            element={
              <RoleGate path="/industri/kas">
                <CashBookPage variant="industri" />
              </RoleGate>
            }
          />
          <Route
            path="/industri/produk"
            element={
              <RoleGate path="/industri/produk">
                <ProductManagementPage />
              </RoleGate>
            }
          />

          <Route
            path="/warga/produk"
            element={
              <RoleGate path="/warga/produk">
                <ProductManagementPage />
              </RoleGate>
            }
          />

          <Route
            path="/marketplace"
            element={
              <RoleGate path="/marketplace">
                <MarketplacePage />
              </RoleGate>
            }
          />
          <Route
            path="/warga/pesanan"
            element={
              <RoleGate path="/warga/pesanan">
                <WargaOrdersPage />
              </RoleGate>
            }
          />

          <Route path="/pembeli/katalog" element={<Navigate to="/marketplace" replace />} />
          <Route path="/pembeli/pesanan" element={<Navigate to="/warga/pesanan" replace />} />

          <Route
            path="/admin/jenis-sampah"
            element={
              <RoleGate path="/admin/jenis-sampah">
                <WasteTypesPage />
              </RoleGate>
            }
          />
          <Route
            path="/admin/organisasi"
            element={
              <RoleGate path="/admin/organisasi">
                <OrganizationVerificationPage />
              </RoleGate>
            }
          />
          <Route
            path="/admin/pengguna"
            element={
              <RoleGate path="/admin/pengguna">
                <UsersPage />
              </RoleGate>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequiredPage />;
  }

  return <AppRoutes />;
}
