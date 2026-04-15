import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ToastProvider } from './context/ToastContext';

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
import SearchRefugee from './pages/aid-worker/SearchRefugee';
import Register from './pages/aid-worker/Register';
import AidDistribution from './pages/aid-worker/AidDistribution';
import ScanQR from './pages/aid-worker/ScanQR';

// Refugee Pages
import RefugeeLayout from './components/layout/RefugeeLayout';
import RefugeeDashboard from './pages/refugee/RefugeeDashboard';
import WalletMigration from './pages/refugee/WalletMigration';
import AccessRequests from './pages/refugee/AccessRequests';

const App = () => {
    return (
        <ToastProvider>
            <WalletProvider>
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
                            <Route index element={<Navigate to="search" replace />} />
                            <Route path="search" element={<SearchRefugee />} />
                            <Route path="register" element={<Register />} />
                            <Route path="distribution" element={<AidDistribution />} />
                            <Route path="scan" element={<ScanQR />} />
                        </Route>

                        {/* Refugee Routes */}
                        <Route path="/refugee" element={<RefugeeLayout />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<RefugeeDashboard />} />
                            <Route path="migration" element={<WalletMigration />} />
                            <Route path="requests" element={<AccessRequests />} />
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </WalletProvider>
        </ToastProvider>
    );
};

export default App;