import { Navigate, Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleGate,
  RootRedirect,
} from '@/routes/guards';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SetupRequiredPage } from '@/pages/SetupRequiredPage';
import { DepositFormPage } from '@/pages/warga/DepositFormPage';
import { WastePricesPage } from '@/pages/warga/WastePricesPage';
import { DepositHistoryPage } from '@/pages/warga/DepositHistoryPage';
import { DepositQueuePage } from '@/pages/bsu/DepositQueuePage';
import { PickupSchedulePage } from '@/pages/bsu/PickupSchedulePage';
import { PricingPage } from '@/pages/bsu/PricingPage';
import { CashBookPage } from '@/pages/bsu/CashBookPage';
import { DepositDetailPage } from '@/pages/deposits/DepositDetailPage';
import { IncomingDepositsPage } from '@/pages/bsi/IncomingDepositsPage';
import { IncomingDepositDetailPage } from '@/pages/bsi/IncomingDepositDetailPage';
import { StockPage as BsiStockPage } from '@/pages/bsi/StockPage';
import { BsiOrdersPage } from '@/pages/bsi/OrdersPage';
import { IndustriStockPage } from '@/pages/industri/StockCatalogPage';
import { IndustriOrdersPage } from '@/pages/industri/OrdersPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { ProductManagementPage } from '@/pages/products/ProductManagementPage';
import { WargaOrdersPage } from '@/pages/products/WargaOrdersPage';
import { WasteTypesPage } from '@/pages/admin/WasteTypesPage';
import { OrganizationVerificationPage } from '@/pages/admin/OrganizationVerificationPage';
import { UsersPage } from '@/pages/admin/UsersPage';

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequiredPage />;
  }

  return (
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
  );
}
