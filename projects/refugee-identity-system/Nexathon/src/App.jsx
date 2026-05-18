import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ToastProvider } from './context/ToastContext';
import { IdentityProvider } from './context/IdentityContext';

// Pages
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAudit from './pages/admin/AdminAudit';
import AdminMigrations from './pages/admin/AdminMigrations';
import AdminStatus from './pages/admin/AdminStatus';
import AdminRefugees from './pages/admin/AdminRefugees';

// Aid Worker Pages
import AidWorkerLayout from './components/layout/AidWorkerLayout';
import Register from './pages/aid-worker/Register';
import AidDistribution from './pages/aid-worker/AidDistribution';
import ScanQR from './pages/aid-worker/ScanQR';
import RequestAccess from './pages/aid-worker/RequestAccess';
import MigrationRequests from './pages/aid-worker/MigrationRequests';

// Refugee Pages
import RefugeeLayout from './components/layout/RefugeeLayout';
import RefugeeDashboard from './pages/refugee/RefugeeDashboard';
import WalletMigration from './pages/refugee/WalletMigration';
import RefugeeIdentityDetails from './pages/refugee/RefugeeIdentityDetails';
import RefugeeBlockchainStatus from './pages/refugee/RefugeeBlockchainStatus';
import RefugeeMigrationRequest from './pages/refugee/RefugeeMigrationRequest';
import AccessRequests from './pages/refugee/AccessRequests';

const App = () => {
  return (
    <ToastProvider>
      <WalletProvider>
        <IdentityProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LoginPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="migrations" element={<AdminMigrations />} />
              <Route path="refugees" element={<AdminRefugees />} />
              <Route path="status" element={<AdminStatus />} />
            </Route>

            {/* Aid Worker Routes */}
            <Route path="/aid-worker" element={<AidWorkerLayout />}>
              <Route index element={<Navigate to="register" replace />} />
              <Route path="register" element={<Register />} />
              <Route path="distribution" element={<AidDistribution />} />
              {/* Backward-compatible alias used by older sidebar links */}
              <Route path="aid" element={<AidDistribution />} />
              <Route path="scan" element={<ScanQR />} />
              <Route path="access" element={<RequestAccess />} />
              <Route path="migration-requests" element={<MigrationRequests />} />
              {/* Used by Login flow when a wallet isn't registered yet */}
              <Route path="migration" element={<WalletMigration />} />
            </Route>

            {/* Refugee Routes */}
            <Route path="/refugee" element={<RefugeeLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<RefugeeDashboard />} />
              <Route path="identity" element={<RefugeeIdentityDetails />} />
              <Route path="blockchain" element={<RefugeeBlockchainStatus />} />
              {/* Refugee portal uses backend-only request flow (no on-chain txs here) */}
              <Route path="migration" element={<RefugeeMigrationRequest />} />
              <Route path="governance" element={<AccessRequests />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </IdentityProvider>
      </WalletProvider>
    </ToastProvider>
  );
};

export default App;