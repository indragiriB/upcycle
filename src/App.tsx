import { Route, Routes } from 'react-router-dom';
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
import { PengepulStockPage } from '@/pages/pengepul/StockCatalogPage';
import { PengepulOrdersPage } from '@/pages/pengepul/OrdersPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { ProductCatalogPage } from '@/pages/products/ProductCatalogPage';
import { ProductManagementPage } from '@/pages/products/ProductManagementPage';
import { BuyerOrdersPage } from '@/pages/products/BuyerOrdersPage';
import { WasteTypesPage } from '@/pages/admin/WasteTypesPage';
import { OrganizationVerificationPage } from '@/pages/admin/OrganizationVerificationPage';

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
            path="/pengepul/stok"
            element={
              <RoleGate path="/pengepul/stok">
                <PengepulStockPage />
              </RoleGate>
            }
          />
          <Route
            path="/pengepul/pesanan"
            element={
              <RoleGate path="/pengepul/pesanan">
                <PengepulOrdersPage />
              </RoleGate>
            }
          />
          <Route
            path="/pengepul/kas"
            element={
              <RoleGate path="/pengepul/kas">
                <CashBookPage variant="pengepul" />
              </RoleGate>
            }
          />
          <Route
            path="/pengepul/produk"
            element={
              <RoleGate path="/pengepul/produk">
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
            path="/pembeli/katalog"
            element={
              <RoleGate path="/pembeli/katalog">
                <ProductCatalogPage />
              </RoleGate>
            }
          />
          <Route
            path="/pembeli/pesanan"
            element={
              <RoleGate path="/pembeli/pesanan">
                <BuyerOrdersPage />
              </RoleGate>
            }
          />

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
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
