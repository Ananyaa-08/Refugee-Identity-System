import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { WalletProvider } from './context/WalletContext';

// Layouts
import AidWorkerLayout from './components/layout/AidWorkerLayout';
import RefugeeLayout from './components/layout/RefugeeLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import LoginPage from './pages/LoginPage';
import Register from './pages/aid-worker/Register';
import ScanQR from './pages/aid-worker/ScanQR';
import SearchRefugee from './pages/aid-worker/SearchRefugee';
import RequestAccess from './pages/aid-worker/RequestAccess';
import AidDistribution from './pages/aid-worker/AidDistribution';
import RefugeeDashboard from './pages/refugee/RefugeeDashboard';
import AccessRequests from './pages/refugee/AccessRequests';
import WalletMigration from './pages/refugee/WalletMigration';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMigrations from './pages/admin/AdminMigrations';
import AdminAudit from './pages/admin/AdminAudit';
import AdminRefugees from './pages/admin/AdminRefugees';
import AdminStatus from './pages/admin/AdminStatus';

function App() {
    return (
        <WalletProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Landing / Login */}
                        <Route path="/" element={<LoginPage />} />

                        {/* Aid Worker Routes */}
                        <Route path="/aid-worker" element={<AidWorkerLayout />}>
                            <Route index element={<Navigate to="/aid-worker/register" replace />} />
                            <Route path="register" element={<Register />} />
                            <Route path="scan" element={<ScanQR />} />
                            <Route path="search" element={<SearchRefugee />} />
                            <Route path="access" element={<RequestAccess />} />
                            <Route path="aid" element={<AidDistribution />} />
                        </Route>

                        {/* Refugee Routes */}
                        <Route path="/refugee" element={<RefugeeLayout />}>
                            <Route index element={<Navigate to="/refugee/dashboard" replace />} />
                            <Route path="dashboard" element={<RefugeeDashboard />} />
                            <Route path="requests" element={<AccessRequests />} />
                            <Route path="migration" element={<WalletMigration />} />
                        </Route>

                        {/* Admin Routes */}
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="migrations" element={<AdminMigrations />} />
                            <Route path="audit" element={<AdminAudit />} />
                            <Route path="refugees" element={<AdminRefugees />} />
                            <Route path="status" element={<AdminStatus />} />
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </WalletProvider>
    );
}

export default App;