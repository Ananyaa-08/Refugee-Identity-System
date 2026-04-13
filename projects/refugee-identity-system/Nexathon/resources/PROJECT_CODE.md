# RIMS Consolidated Source Code (Includes Pera Wallet Fix)

This file contains the complete source code for the RIMS (Refugee Identity Management System) frontend.

## File: package.json

```json
{
    "name": "rims-frontend",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
        "preview": "vite preview"
    },
    "dependencies": {
        "@perawallet/connect": "^1.5.1",
        "@yudiel/react-qr-scanner": "^2.5.1",
        "clsx": "^2.1.0",
        "lucide-react": "^0.344.0",
        "qrcode.react": "^4.2.0",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.22.1",
        "react-webcam": "^7.2.0",
        "tailwind-merge": "^2.2.1"
    },
    "devDependencies": {
        "@types/react": "^18.2.56",
        "@types/react-dom": "^18.2.19",
        "@vitejs/plugin-react-swc": "^3.5.0",
        "autoprefixer": "^10.4.17",
        "eslint": "^8.56.0",
        "eslint-plugin-react": "^7.33.2",
        "eslint-plugin-react-hooks": "^4.6.0",
        "eslint-plugin-react-refresh": "^0.4.5",
        "postcss": "^8.4.35",
        "tailwindcss": "^3.4.1",
        "vite": "^5.1.4",
        "vite-plugin-node-polyfills": "^0.25.0"
    }
}

```

---

## File: vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
})

```

---

## File: src/main.jsx

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Add this magic bridge for Pera Wallet!
if (typeof global === 'undefined') {
    window.global = window;
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
```

---

## File: src/App.jsx

```javascript
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
```

---

## File: src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #060d1f;
  --bg-secondary: #0a1428;
  --bg-card: #0f1e38;
  --bg-elevated: #152342;
  --border: #1a2d4a;
  --border-bright: #1e3a5f;
  --accent-teal: #00c9b1;
  --accent-amber: #f59e0b;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
  --accent-red: #ef4444;
  --accent-purple: #8b5cf6;
  --text-primary: #e2eaf8;
  --text-secondary: #7a94bb;
  --text-muted: #3d5278;
  --text-mono: #00c9b1;
}

* { box-sizing: border-box; }
body { 
  background: var(--bg-primary); 
  color: var(--text-primary);
  font-family: 'IBM Plex Sans', sans-serif;
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 4px rgba(0,201,177,0.3); }
  50% { box-shadow: 0 0 12px rgba(0,201,177,0.7); }
}
@keyframes spinRing {
  to { transform: rotate(360deg); }
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes pulseOpacity {
  0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes scanLine {
  0% { top: 0; } 100% { top: 100%; }
}

.page-enter { animation: fadeSlideUp 0.4s ease forwards; }
.card-1 { animation: fadeSlideUp 0.4s ease 0ms both; }
.card-2 { animation: fadeSlideUp 0.4s ease 80ms both; }
.card-3 { animation: fadeSlideUp 0.4s ease 160ms both; }
.card-4 { animation: fadeSlideUp 0.4s ease 240ms both; }

.shimmer {
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.glow-teal { animation: pulseGlow 2s ease-in-out infinite; }
.spin { animation: spinRing 0.8s linear infinite; }
.pulse-opacity { animation: pulseOpacity 1.5s ease-in-out infinite; }
.marquee-track { animation: marquee 30s linear infinite; }

.mono { font-family: 'IBM Plex Mono', monospace; color: var(--text-mono); }

@media print {
  body > *:not(#print-card) { display: none !important; }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-primary);
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border-bright);
}

```

---

## File: src/utils/mockData.js

```javascript
export const MOCK_REFUGEES = [
    {
        id: 'REF-2024-001',
        walletAddress: 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB',
        name: 'Ahmad Saadi',
        nationality: 'Syrian',
        dob: '1990-05-15',
        gender: 'Male',
        campID: 'CAMP-01',
        registeredAt: '2024-01-14T09:32:00Z',
        identityHash: 'a3f8c2d1e9b407654321...',
        personhoodHash: 'b7e2d5f0c8a134567890...',
        ageProofHash: 'c9f1e4b3d2a056789012...',
        ageVerified: true,
        walletType: 'pera',
        aidClaimed: false,
        isActive: true,
        languages: ['Arabic', 'English'],
        familyMembers: [
            { name: 'Layla Saadi', relationship: 'Spouse' },
            { name: 'Omar Saadi', relationship: 'Son' }
        ]
    },
    {
        id: 'REF-2024-002',
        walletAddress: 'CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH',
        name: 'Fatima Al-Rashid',
        nationality: 'Afghan',
        dob: '1995-11-28',
        gender: 'Female',
        campID: 'CAMP-02',
        registeredAt: '2024-01-20T14:15:00Z',
        identityHash: 'd2b5e8f1a3c604567890...',
        personhoodHash: 'e4c7f0b2d5a178901234...',
        ageProofHash: 'f6d9b1e3c4a256789012...',
        ageVerified: true,
        walletType: 'custodial',
        aidClaimed: true,
        isActive: true,
        languages: ['Dari', 'Pashto'],
        familyMembers: []
    },
    {
        id: 'REF-2024-003',
        walletAddress: 'PERA2M7NOPQ8RST3UVW4XYZ5ABC6DEFGHIJ',
        name: 'James Okafor',
        nationality: 'South Sudanese',
        dob: '1988-03-07',
        gender: 'Male',
        campID: 'CAMP-01',
        registeredAt: '2024-02-01T10:45:00Z',
        identityHash: 'a1b2c3d4e5f678901234...',
        personhoodHash: 'b2c3d4e5f6a789012345...',
        ageProofHash: 'c3d4e5f6a7b890123456...',
        ageVerified: true,
        walletType: 'pera',
        aidClaimed: false,
        isActive: true,
        languages: ['English', 'Dinka'],
        familyMembers: [{ name: 'Grace Okafor', relationship: 'Spouse' }]
    }
];

export const MOCK_ACCESS_REQUESTS = [
    {
        id: 'REQ-001',
        refugeeID: 'REF-2024-001',
        refugeeName: 'Ahmad Saadi',
        requestedField: 'Age Verification',
        requestedBy: 'Aid Worker Maria Santos',
        requestedAt: '2024-02-10T08:30:00Z',
        status: 'pending'
    },
    {
        id: 'REQ-002',
        refugeeID: 'REF-2024-001',
        refugeeName: 'Ahmad Saadi',
        requestedField: 'Nationality Proof',
        requestedBy: 'Border Official Chen Wei',
        requestedAt: '2024-02-09T14:20:00Z',
        status: 'approved'
    },
    {
        id: 'REQ-003',
        refugeeID: 'REF-2024-002',
        refugeeName: 'Fatima Al-Rashid',
        requestedField: 'Age Verification',
        requestedBy: 'Medical Staff Dr. Patel',
        requestedAt: '2024-02-08T11:00:00Z',
        status: 'rejected'
    }
];

export const MOCK_MIGRATIONS = [
    {
        id: 'MIG-001',
        refugeeID: 'REF-2024-002',
        refugeeName: 'Fatima Al-Rashid',
        camp: 'CAMP-02',
        oldWallet: 'CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH',
        newWallet: 'PERA3N8OPQR9STU4VWX5YZA6BCD7EFGHIJK',
        requestedAt: '2024-02-11T09:00:00Z',
        status: 'pending'
    },
    {
        id: 'MIG-002',
        refugeeID: 'REF-2024-005',
        refugeeName: 'Khalid Mansour',
        camp: 'CAMP-01',
        oldWallet: 'CUST7M2NOPQ8RST4UVW5XYZ6ABC7DEFGHIJ',
        newWallet: 'PERA5P0QRST1UVW2XYZ3ABC4DEF5GHIJKLM',
        requestedAt: '2024-02-12T11:30:00Z',
        status: 'pending'
    }
];

export const MOCK_STATS = {
    totalRegistered: 4729,
    aidClaimsThisWeek: 312,
    pendingRequests: 47,
    blockedDuplicates: 23,
    activeWorkers: 18,
    pendingMigrations: 3
};

export const MOCK_AUDIT_LOG = [
    { id: 1, type: 'Registration', refugeeID: 'REF-2024-003', address: 'PERA2M7...GHIJ', timestamp: '2024-02-01T10:45:00Z', txHash: '0xabc123def456789abc' },
    { id: 2, type: 'Aid Issued', refugeeID: 'REF-2024-002', address: 'CUST9K4...F2GH', timestamp: '2024-01-21T09:05:00Z', txHash: '0xdef456abc123789def' },
    { id: 3, type: 'Consent Approved', refugeeID: 'REF-2024-001', address: 'PERA7J3...SPUB', timestamp: '2024-02-09T16:30:00Z', txHash: '0x789abc123def456789' },
    { id: 4, type: 'Migration', refugeeID: 'REF-2024-002', address: 'CUST9K4...F2GH', timestamp: '2024-02-11T09:00:00Z', txHash: '0x456def789abc123456' },
    { id: 5, type: 'Registration', refugeeID: 'REF-2024-001', address: 'PERA7J3...SPUB', timestamp: '2024-01-14T09:32:00Z', txHash: '0x123456789abcdef012' }
];

```

---

## File: src/utils/wallet.js

```javascript
import { PeraWalletConnect } from "@perawallet/connect";

export const peraWallet = new PeraWalletConnect();

export const reconnectSession = async () => {
  try {
    const accounts = await peraWallet.reconnectSession();
    return accounts;
  } catch (error) {
    console.log("No existing session found");
    return [];
  }
};
```

---

## File: src/context/ToastContext.jsx

```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((type, title, message) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            removeToast(id);
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-0 right-0 p-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto bg-[#0f1e38] border rounded-xl p-4 min-w-[320px] shadow-2xl flex items-start gap-3 animate-[slideInRight_0.3s_ease-out]",
                            toast.type === 'success' && "border-[#10b98140]",
                            toast.type === 'error' && "border-[#ef444440]",
                            toast.type === 'warning' && "border-[#f59e0b40]",
                            toast.type === 'info' && "border-[#00c9b140]"
                        )}
                    >
                        <div className={cn(
                            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                            toast.type === 'success' && "bg-[#10b98120] text-[#10b981]",
                            toast.type === 'error' && "bg-[#ef444420] text-[#ef4444]",
                            toast.type === 'warning' && "bg-[#f59e0b20] text-[#f59e0b]",
                            toast.type === 'info' && "bg-[#00c9b120] text-[#00c9b1]"
                        )}>
                            {toast.type === 'success' && <CheckCircle size={16} />}
                            {toast.type === 'error' && <AlertCircle size={16} />}
                            {toast.type === 'warning' && <AlertTriangle size={16} />}
                            {toast.type === 'info' && <Info size={16} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[#e2eaf8] text-sm font-semibold">{toast.title}</h4>
                            <p className="text-[#7a94bb] text-xs mt-1">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-[#3d5278] hover:text-[#e2eaf8] transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

```

---

## File: src/context/WalletContext.jsx

```javascript
import React, { createContext, useContext, useState, useEffect } from "react";
import { peraWallet, reconnectSession } from "../utils/wallet";

const WalletContext = createContext(null);

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    // Checks if you are already connected when the page reloads
    reconnectSession().then(accounts => {
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      setAccount(newAccounts[0]);
    } catch (error) {
      if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
        console.error("Connection failed", error);
      }
    }
  };

  const disconnectWallet = async () => {
    await peraWallet.disconnect();
    setAccount(null);
  };

  return (
    <WalletContext.Provider value={{ account, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};
```

---

## File: src/components/ui/Common.jsx

```javascript
import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ icon: Icon, label, value, change, changeType, accentColor, className }) => {
    return (
        <div className={clsx(
            "bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 hover:border-[#1e3a5f] transition-all duration-200 relative overflow-hidden",
            className
        )}>
            <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: accentColor }}
            />

            <div className="flex justify-between items-start mb-4">
                <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest">
                    {label}
                </label>
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                    <Icon size={20} />
                </div>
            </div>

            <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-[#e2eaf8] leading-none">{value}</h3>
                {change && (
                    <div className={clsx(
                        "flex items-center gap-1 text-xs font-semibold pb-1",
                        changeType === 'up' ? "text-[#10b981]" : "text-[#ef4444]"
                    )}>
                        {changeType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {change}
                    </div>
                )}
            </div>
        </div>
    );
};

export const LoadingSpinner = ({ size = 'md', label }) => {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-[3px]',
        lg: 'w-12 h-12 border-4'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={clsx(
                "border-[#1a2d4a] border-t-[#00c9b1] rounded-full spin",
                sizes[size]
            )} />
            {label && (
                <p className="text-[#7a94bb] text-sm font-medium animate-pulse">{label}</p>
            )}
        </div>
    );
};

```

---

## File: src/components/layout/Navbar.jsx

```javascript
import React from 'react';
import { Shield } from 'lucide-react';
import { useWallet } from '../../context/WalletContext'; // <-- 1. We import the "intercom"

export const Navbar = ({ role }) => {
    // 2. We grab the real account and the buttons from the intercom
    const { account, connectWallet, disconnectWallet } = useWallet();

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a1428] border-b border-[#1a2d4a] flex items-center justify-between px-6 z-40">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00c9b110] rounded-lg flex items-center justify-center border border-[#00c9b130]">
                    <Shield className="text-[#00c9b1]" size={24} />
                </div>
                <div>
                    <h1 className="font-mono text-[#00c9b1] text-lg font-bold leading-none tracking-widest">RIMS</h1>
                    <p className="text-[#7a94bb] text-[10px] uppercase tracking-tighter mt-0.5 font-medium">Refugee Identity Management</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {role === 'aid-worker' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b40]">
                        Aid Worker Portal
                    </span>
                ) : role === 'admin' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#8b5cf620] text-[#8b5cf6] border border-[#8b5cf640]">
                        Admin Portal
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00c9b120] text-[#00c9b1] border border-[#00c9b140]">
                        Refugee Portal
                    </span>
                )}

                {/* 3. This box shows the real address if connected, or "DISCONNECTED" if not */}
                <div className="flex items-center gap-2.5 bg-[#152342] border border-[#1a2d4a] rounded-lg px-3 py-1.5">
                    <div className={account ? "w-2 h-2 bg-[#10b981] rounded-full glow-teal" : "w-2 h-2 bg-[#ef4444] rounded-full"}></div>
                    <span className="font-mono text-[#00c9b1] text-xs font-medium tracking-tight">
                        {account ? `${account.slice(0, 7)}...${account.slice(-4)}` : 'DISCONNECTED'}
                    </span>
                </div>

                {/* 4. The magic buttons that actually open the Pera Wallet app */}
                {!account ? (
                    <button onClick={connectWallet} className="text-xs font-bold bg-[#00c9b1] text-[#060d1f] px-4 py-1.5 rounded hover:bg-[#00e0c5] transition-colors shadow-[0_0_15px_rgba(0,201,177,0.2)]">
                        CONNECT
                    </button>
                ) : (
                    <button onClick={disconnectWallet} className="text-xs font-bold border border-[#ef4444] text-[#ef4444] px-4 py-1.5 rounded hover:bg-[#ef444420] transition-colors">
                        DISCONNECT
                    </button>
                )}
            </div>
        </nav>
    );
};
```

---

## File: src/components/layout/Sidebar.jsx

```javascript
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    UserPlus, QrCode, Search, Key, Package, ArrowLeftRight,
    LayoutDashboard, ShieldCheck, RefreshCw, Link as LinkIcon,
    ClipboardList, Users, Settings, Shield
} from 'lucide-react';
import { clsx } from 'clsx';

const NavItem = ({ to, icon: Icon, label, badge, amberDot, activeColor = 'text-[#00c9b1]', activeBg = 'bg-[#00c9b115]', activeBorder = 'border-[#00c9b1]' }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => clsx(
                "group flex items-center gap-3 px-4 py-3 rounded-lg mx-2 cursor-pointer transition-all duration-200",
                isActive
                    ? `${activeBg} ${activeColor} border-l-2 ${activeBorder} rounded-l-none`
                    : "text-[#7a94bb] hover:bg-[#152342] hover:text-[#e2eaf8]"
            )}
        >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{label}</span>
            {badge > 0 && (
                <span className="bg-[#f59e0b20] text-[#f59e0b] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#f59e0b40]">
                    {badge}
                </span>
            )}
            {amberDot && (
                <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full"></div>
            )}
        </NavLink>
    );
};

export const Sidebar = ({ role, pendingRequests, pendingMigrations, walletAddress }) => {
    const isAdmin = role === 'admin';

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#0a1428] border-r border-[#1a2d4a] flex flex-col z-30 pt-20">
            <div className="flex-1 overflow-y-auto py-4">
                {isAdmin ? (
                    <label className="block text-[#8b5cf6] text-[10px] font-bold uppercase tracking-[0.2em] px-6 mb-4 mt-2">
                        ADMIN PANEL
                    </label>
                ) : (
                    <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] px-6 mb-4 mt-2">
                        OPERATIONS
                    </label>
                )}

                <div className="space-y-1">
                    {role === 'aid-worker' ? (
                        <>
                            <NavItem to="/aid-worker/register" icon={UserPlus} label="Register Refugee" />
                            <NavItem to="/aid-worker/scan" icon={QrCode} label="Scan QR" />
                            <NavItem to="/aid-worker/search" icon={Search} label="Search Refugee" />
                            <NavItem to="/aid-worker/access" icon={Key} label="Request Access" amberDot={pendingRequests > 0} />
                            <NavItem to="/aid-worker/aid" icon={Package} label="Aid Distribution" />
                        </>
                    ) : role === 'refugee' ? (
                        <>
                            <NavItem to="/refugee/dashboard" icon={LayoutDashboard} label="Dashboard" />
                            <NavItem to="/refugee/requests" icon={ShieldCheck} label="Access Requests" badge={pendingRequests} />
                            <NavItem to="/refugee/migration" icon={RefreshCw} label="Wallet Migration" />
                        </>
                    ) : (
                        <>
                            <NavItem
                                to="/admin/dashboard"
                                icon={LayoutDashboard}
                                label="Overview"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/migrations"
                                icon={ArrowLeftRight}
                                label="Migration Approvals"
                                badge={pendingMigrations}
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/audit"
                                icon={ClipboardList}
                                label="Audit Log"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/refugees"
                                icon={Users}
                                label="Registered Refugees"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/status"
                                icon={Settings}
                                label="System Status"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-[#1a2d4a] space-y-4">
                {role === 'refugee' ? (
                    <div className="bg-[#00c9b105] border border-[#00c9b110] rounded-xl p-3">
                        <label className="block text-[#7a94bb] text-[10px] font-medium uppercase tracking-widest mb-2">
                            Connected Wallet
                        </label>
                        <div className="font-mono text-[#00c9b1] text-[11px] break-all p-2 bg-[#00c9b108] rounded-lg border border-[#00c9b115] leading-relaxed">
                            {walletAddress}
                        </div>
                    </div>
                ) : role === 'admin' ? (
                    <div className="space-y-1">
                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">
                            Admin Access
                        </label>
                        <div className="flex items-center gap-2 text-[#8b5cf6] text-[11px] font-mono">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse"></div>
                            Algorand TestNet
                        </div>
                    </div>
                ) : null}

                {role !== 'admin' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[#3d5278] text-[11px] font-medium">
                            <LinkIcon size={12} className="text-[#3d5278]" />
                            <span>Secured by Algorand</span>
                        </div>
                        <div className="font-mono text-[#3d5278] text-[10px] uppercase tracking-wider pl-5">
                            Algorand TestNet
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

```

---

## File: src/components/layout/AidWorkerLayout.jsx

```javascript
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_STATS } from '../../utils/mockData';

const AidWorkerLayout = () => {
    // Common wallet for aid worker demo
    const AID_WORKER_WALLET = 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB';

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="aid-worker" walletAddress={AID_WORKER_WALLET} />
            <Sidebar
                role="aid-worker"
                pendingRequests={MOCK_STATS.pendingRequests}
                pendingMigrations={MOCK_STATS.pendingMigrations}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AidWorkerLayout;

```

---

## File: src/components/layout/RefugeeLayout.jsx

```javascript
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_REFUGEES, MOCK_ACCESS_REQUESTS } from '../../utils/mockData';

const RefugeeLayout = () => {
    const refugee = MOCK_REFUGEES[0];
    const pendingRequestsCount = MOCK_ACCESS_REQUESTS.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="refugee" walletAddress={refugee.walletAddress} />
            <Sidebar
                role="refugee"
                walletAddress={refugee.walletAddress}
                pendingRequests={pendingRequestsCount}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default RefugeeLayout;

```

---

## File: src/components/layout/AdminLayout.jsx

```javascript
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_STATS } from '../../utils/mockData';

const AdminLayout = () => {
    // Demo admin wallet
    const ADMIN_WALLET = 'ADMIN8H2JKLM1NPQR3STU5VWX7YZ9ABCDE';

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="admin" walletAddress={ADMIN_WALLET} />
            <Sidebar
                role="admin"
                pendingMigrations={MOCK_STATS.pendingMigrations}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;

```

---

## File: src/pages/LoginPage.jsx

```javascript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, HardHat, User, ArrowRight } from 'lucide-react';
import { MOCK_STATS } from '../utils/mockData';

const LoginCard = ({ icon: Icon, title, description, badgeColor, buttonColor, onEnter }) => {
    return (
        <div
            onClick={onEnter}
            className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-8 cursor-pointer hover:border-[#00c9b1] hover:shadow-[0_0_20px_rgba(0,201,177,0.1)] hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center text-center"
        >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${badgeColor}`}>
                <Icon size={32} />
            </div>
            <h2 className="text-[#e2eaf8] text-xl font-bold mb-2 transition-colors duration-300 group-hover:text-[#e2eaf8]">{title}</h2>
            <p className="text-[#7a94bb] text-sm mb-8 leading-relaxed">{description}</p>

            <button
                className={`w-full py-3 px-6 rounded-lg font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${buttonColor}`}
            >
                ENTER PORTAL <ArrowRight size={16} />
            </button>
        </div>
    );
};

const LoginPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#060d1f] flex flex-col items-center justify-center relative overflow-hidden page-enter">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #1e3a5f 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    animation: 'pulseOpacity 4s ease-in-out infinite'
                }}
            />

            <div className="max-w-4xl w-full px-6 flex flex-col items-center relative z-10">
                {/* Header Section */}
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className="w-20 h-20 bg-[#00c9b110] rounded-2xl flex items-center justify-center border border-[#00c9b130] mb-8 animate-bounce shadow-[0_0_30px_rgba(0,201,177,0.1)]">
                        <Shield size={48} className="text-[#00c9b1]" />
                    </div>
                    <h1 className="font-mono text-6xl font-bold text-[#00c9b1] tracking-[0.2em] mb-4">RIMS</h1>
                    <p className="text-[#7a94bb] text-sm font-medium uppercase tracking-[0.3em]">Refugee Identity Management System</p>
                    <div className="h-0.5 w-24 bg-[#1a2d4a] mt-8 rounded-full" />
                </div>

                {/* Role Selection */}
                <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl">
                    <LoginCard
                        icon={HardHat}
                        title="Aid Worker Portal"
                        description="Register refugees, distribute aid resources, and manage verification requests."
                        badgeColor="bg-[#f59e0b20] text-[#f59e0b]"
                        buttonColor="border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b20]"
                        onEnter={() => navigate('/aid-worker')}
                    />
                    <LoginCard
                        icon={User}
                        title="Refugee Portal"
                        description="Access your digital identity, manage data consents, and migrate to self-sovereign wallets."
                        badgeColor="bg-[#00c9b120] text-[#00c9b1]"
                        buttonColor="bg-[#00c9b1] text-[#060d1f] hover:bg-[#00e0c5]"
                        onEnter={() => navigate('/refugee')}
                    />
                    <LoginCard
                        icon={Shield}
                        title="Admin Portal"
                        description="Approve wallet migrations, audit blockchain activity, and manage system health."
                        badgeColor="bg-[#8b5cf620] text-[#8b5cf6]"
                        buttonColor="border border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf620]"
                        onEnter={() => navigate('/admin/dashboard')}
                    />
                </div>
            </div>

            {/* Marquee Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a1428] border-t border-[#1a2d4a] py-4 overflow-hidden">
                <div className="marquee-track whitespace-nowrap flex items-center gap-12">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center gap-12 shrink-0">
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                {MOCK_STATS.totalRegistered.toLocaleString()} identities secured on Algorand
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                {MOCK_STATS.aidClaimsThisWeek} aid claims verified this week
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                Zero documents required
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                Custodial → Self-Sovereign migration live
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                Biometric liveness detection active
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                {MOCK_STATS.blockedDuplicates} duplicate registrations blocked
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

```

---

## File: src/pages/aid-worker/Register.jsx

```javascript
import React, { useState, useEffect } from 'react';
import {
    Check, Camera, Smartphone, QrCode, User,
    Trash2, Plus, Info, Lock, Loader2, Printer, Shield
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';
import { QRCodeSVG } from 'qrcode.react';

// --- Form Components ---

const Input = ({ label, ...props }) => (
    <div className="w-full">
        <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">{label}</label>
        <input
            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] focus:ring-1 focus:ring-[#00c9b120] placeholder-[#3d5278] transition-all duration-200"
            {...props}
        />
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="w-full">
        <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">{label}</label>
        <select
            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] cursor-pointer appearance-none transition-all duration-200"
            {...props}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// --- Registration Page ---

const Register = () => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        nationality: 'Syrian',
        campId: '',
        languages: [],
        familyMembers: [],
        livenessVerified: false,
        walletType: null, // 'pera' | 'custodial'
        walletAddress: '',
    });

    const [currentLang, setCurrentLang] = useState('');
    const [isLivenessChecking, setIsLivenessChecking] = useState(false);
    const [livenessStage, setLivenessStage] = useState(0); // 0: idle, 1: detecting, 2: blink, 3: head turn, 4: complete
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStage, setSubmitStage] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Liveness simulation
    const startLiveness = () => {
        setIsLivenessChecking(true);
        setLivenessStage(1);

        setTimeout(() => setLivenessStage(2), 1000);
        setTimeout(() => setLivenessStage(3), 2000);
        setTimeout(() => {
            setLivenessStage(4);
            setFormData(prev => ({ ...prev, livenessVerified: true }));
            setIsLivenessChecking(false);
            showToast('success', 'Liveness Verified', 'Biometric liveness detection successful.');
        }, 3000);
    };

    const handleRegister = () => {
        setIsSubmitting(true);
        setSubmitStage(1);

        setTimeout(() => setSubmitStage(2), 600);
        setTimeout(() => setSubmitStage(3), 900);
        setTimeout(() => setSubmitStage(4), 1200);
        setTimeout(() => setSubmitStage(5), 2000);
        setTimeout(() => {
            setSubmitStage(6);
            setTimeout(() => {
                setShowSuccess(true);
                setIsSubmitting(false);
                showToast('success', 'Registration Complete', 'Refugee identity has been permanently recorded.');
            }, 500);
        }, 3000);
    };

    const addLanguage = (e) => {
        if (e.key === 'Enter' && currentLang.trim()) {
            e.preventDefault();
            if (!formData.languages.includes(currentLang.trim())) {
                setFormData(prev => ({ ...prev, languages: [...prev.languages, currentLang.trim()] }));
            }
            setCurrentLang('');
        }
    };

    const addFamilyMember = () => {
        setFormData(prev => ({
            ...prev,
            familyMembers: [...prev.familyMembers, { name: '', relationship: 'Spouse' }]
        }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    // --- Step Indicator ---
    const steps = ["Personal Info", "Liveness Check", "Wallet Setup", "Review & Submit"];

    return (
        <div className="page-enter pb-20">
            {/* Step Indicator */}
            <div className="bg-[#0a1428] border border-[#1a2d4a] rounded-2xl px-12 py-8 mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#1a2d4a] z-0" />
                    {steps.map((s, i) => {
                        const num = i + 1;
                        const isCompleted = step > num || showSuccess;
                        const isActive = step === num && !showSuccess;
                        return (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                                <div className={clsx(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                    isCompleted ? "bg-[#00c9b1] border-[#00c9b1] text-[#060d1f]" :
                                        isActive ? "bg-[#060d1f] border-[#00c9b1] text-[#00c9b1]" :
                                            "bg-[#152342] border-[#1a2d4a] text-[#3d5278]"
                                )}>
                                    {isCompleted ? <Check size={18} strokeWidth={3} /> : <span className="text-xs font-bold">{num}</span>}
                                </div>
                                <span className={clsx(
                                    "text-[10px] uppercase font-bold tracking-widest",
                                    isActive || isCompleted ? "text-[#e2eaf8]" : "text-[#3d5278]"
                                )}>{s}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                {step === 1 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Full Name" placeholder="e.g. Ahmad Saadi" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            <Input label="Date of Birth" type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                            <Select label="Nationality" options={['Syrian', 'Afghan', 'South Sudanese', 'Myanmar', 'Somali', 'Ukrainian', 'Ethiopian', 'Congolese', 'Sudanese', 'Venezuelan', 'Other']} value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} />
                            <Input label="Camp ID" placeholder="e.g. CAMP-01" value={formData.campId} onChange={e => setFormData({ ...formData, campId: e.target.value })} />
                        </div>

                        <div>
                            <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">Languages Spoken</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.languages.map(lang => (
                                    <span key={lang} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00c9b120] text-[#00c9b1] border border-[#00c9b140]">
                                        {lang}
                                        <button onClick={() => setFormData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }))}><Check size={12} /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278]"
                                placeholder="Type and press Enter to add..."
                                value={currentLang}
                                onChange={e => setCurrentLang(e.target.value)}
                                onKeyDown={addLanguage}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest">Family Members</label>
                                <button onClick={addFamilyMember} className="text-[#00c9b1] text-xs font-bold flex items-center gap-1 hover:underline">
                                    <Plus size={14} /> ADD MEMBER
                                </button>
                            </div>
                            {formData.familyMembers.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-[#1a2d4a] rounded-xl text-[#3d5278] text-sm italic">
                                    No family members added
                                </div>
                            )}
                            {formData.familyMembers.map((member, idx) => (
                                <div key={idx} className="flex gap-3 animate-[fadeSlideUp_0.3s_ease-out]">
                                    <div className="flex-1">
                                        <input
                                            placeholder="Name"
                                            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-2 text-[#e2eaf8] text-sm"
                                            value={member.name}
                                            onChange={e => {
                                                const newMembers = [...formData.familyMembers];
                                                newMembers[idx].name = e.target.value;
                                                setFormData({ ...formData, familyMembers: newMembers });
                                            }}
                                        />
                                    </div>
                                    <div className="w-40">
                                        <select
                                            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-2 text-[#e2eaf8] text-sm"
                                            value={member.relationship}
                                            onChange={e => {
                                                const newMembers = [...formData.familyMembers];
                                                newMembers[idx].relationship = e.target.value;
                                                setFormData({ ...formData, familyMembers: newMembers });
                                            }}
                                        >
                                            <option>Spouse</option>
                                            <option>Son</option>
                                            <option>Daughter</option>
                                            <option>Parent</option>
                                            <option>Sibling</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers.filter((_, i) => i !== idx) }))}
                                        className="p-2 text-[#ef4444] hover:bg-[#ef444410] rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={nextStep}
                            disabled={!formData.fullName || !formData.dob}
                            className="bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all w-full disabled:opacity-40"
                        >
                            NEXT STEP: LIVENESS CHECK
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center">
                            <div className={clsx(
                                "w-full aspect-video rounded-xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500",
                                livenessStage === 4 ? "border-[#10b981] bg-[#10b98105]" :
                                    isLivenessChecking ? "border-[#00c9b1] bg-[#00c9b105]" : "border-[#1a2d4a] bg-[#060d1f]"
                            )}>
                                {livenessStage === 0 && (
                                    <>
                                        <Camera size={64} className="text-[#3d5278] mb-4" />
                                        <p className="text-[#7a94bb] text-sm text-center px-8">Camera will activate for biometric liveness detection</p>
                                    </>
                                )}

                                {isLivenessChecking && (
                                    <>
                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_10px_#00c9b1] animate-scanLine z-20" />
                                        <div className="text-center space-y-2 z-10">
                                            <div className="flex items-center justify-center gap-2 text-[#00c9b1] font-mono text-xs animate-pulse">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                                {livenessStage === 1 && "DETECTING FACE..."}
                                                {livenessStage === 2 && "BLINK DETECTED"}
                                                {livenessStage === 3 && "HEAD TURN VERIFIED"}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {livenessStage === 4 && (
                                    <div className="flex flex-col items-center animate-bounce">
                                        <div className="w-20 h-20 bg-[#10b98120] rounded-full flex items-center justify-center mb-4">
                                            <Check size={48} className="text-[#10b981]" />
                                        </div>
                                        <span className="text-[#10b981] font-bold text-lg tracking-widest uppercase">Liveness Verified</span>
                                    </div>
                                )}
                            </div>

                            {!isLivenessChecking && livenessStage === 0 && (
                                <button
                                    onClick={startLiveness}
                                    className="mt-8 bg-[#f59e0b] text-[#060d1f] font-bold py-3 px-10 rounded-lg hover:bg-[#ffb533] active:scale-95 transition-all"
                                >
                                    START LIVENESS CHECK
                                </button>
                            )}

                            {livenessStage === 4 && (
                                <div className="w-full mt-8 p-4 bg-[#060d1f] border border-[#1a2d4a] rounded-xl">
                                    <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-2">Personhood Hash</label>
                                    <div className="font-mono text-[#00c9b1] text-xs break-all leading-relaxed">
                                        b7e2d5f0c8a1345678901234567890ab8291...
                                    </div>
                                </div>
                            )}

                            <p className="mt-8 text-[11px] text-[#3d5278] text-center leading-relaxed">
                                Liveness detection ensures a physical person is present and prevents fake mass registrations. Camera data is processed locally; only a cryptographic hash is stored.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 px-6 rounded-lg hover:border-[#3d5278] transition-all">← BACK</button>
                            <button onClick={nextStep} disabled={!formData.livenessVerified} className="flex-[2] bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all disabled:opacity-40">NEXT: WALLET SETUP</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setFormData({ ...formData, walletType: 'pera', walletAddress: 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB' })}
                                className={clsx(
                                    "bg-[#0f1e38] border p-6 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center",
                                    formData.walletType === 'pera' ? "border-[#00c9b1] shadow-[0_0_20px_rgba(0,201,177,0.1)]" : "border-[#1a2d4a] hover:border-[#3d5278]"
                                )}
                            >
                                <div className="w-12 h-12 bg-[#3b82f620] text-[#3b82f6] rounded-full flex items-center justify-center mb-4">
                                    <Smartphone size={24} />
                                </div>
                                <h3 className="text-white font-bold mb-2">Has Smartphone</h3>
                                <p className="text-[#7a94bb] text-[11px]">Refugee installs Pera Wallet and controls their own digital identity.</p>
                                {formData.walletType === 'pera' && <Check className="text-[#00c9b1] mt-4" size={20} />}
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, walletType: 'custodial', walletAddress: 'CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH' })}
                                className={clsx(
                                    "bg-[#0f1e38] border p-6 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center",
                                    formData.walletType === 'custodial' ? "border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-[#1a2d4a] hover:border-[#3d5278]"
                                )}
                            >
                                <div className="w-12 h-12 bg-[#f59e0b20] text-[#f59e0b] rounded-full flex items-center justify-center mb-4">
                                    <QrCode size={24} />
                                </div>
                                <h3 className="text-white font-bold mb-2">No Smartphone</h3>
                                <p className="text-[#7a94bb] text-[11px]">System generates custodial wallet. Refugee receives a printed QR card.</p>
                                {formData.walletType === 'custodial' && <Check className="text-[#f59e0b] mt-4" size={20} />}
                            </div>
                        </div>

                        {formData.walletType && (
                            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 animate-fadeSlideUp">
                                <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-3">Linked Wallet Address</label>
                                <div className="bg-[#060d1f] p-4 rounded-lg flex items-center justify-between border border-[#1a2d4a]">
                                    <span className="font-mono text-[#00c9b1] text-xs truncate mr-4">{formData.walletAddress}</span>
                                    <div className="px-2 py-0.5 rounded bg-[#10b98120] text-[#10b981] text-[10px] font-bold border border-[#10b98130]">READY</div>
                                </div>
                                <p className="mt-4 text-[11px] text-[#3d5278] leading-relaxed italic">
                                    {formData.walletType === 'pera' ? "The refugee's device has been verified and linked." : "A secure custodial account has been provisioned on the blockchain."}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 px-6 rounded-lg hover:border-[#3d5278] transition-all">← BACK</button>
                            <button onClick={nextStep} disabled={!formData.walletType} className="flex-[2] bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all disabled:opacity-40">REVIEW REGISTRATION</button>
                        </div>
                    </div>
                )}

                {step === 4 && !showSuccess && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid md:grid-cols-5 gap-8">
                            <div className="md:col-span-3 space-y-6">
                                <h3 className="text-[#e2eaf8] font-bold text-lg">Registration Summary</h3>
                                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl overflow-hidden">
                                    {[
                                        { label: 'Full Name', value: formData.fullName },
                                        { label: 'DOB', value: formData.dob },
                                        { label: 'Nationality', value: formData.nationality },
                                        { label: 'Camp ID', value: formData.campId || 'Not set' },
                                        { label: 'Languages', value: formData.languages.join(', ') || 'None' },
                                        { label: 'Family Members', value: `${formData.familyMembers.length} member(s)` },
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center py-4 px-6 border-b border-[#1a2d4a] last:border-0 hover:bg-[#152342] transition-colors">
                                            <span className="text-[#7a94bb] text-xs font-bold uppercase tracking-wider">{row.label}</span>
                                            <span className="text-[#e2eaf8] text-sm font-semibold">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-[#00c9b105] border border-[#00c9b120] rounded-xl p-6">
                                    <div className="flex items-center gap-3 text-[#00c9b1] mb-4">
                                        <Info size={20} />
                                        <h4 className="font-bold text-sm uppercase tracking-wide">Identity Creation</h4>
                                    </div>
                                    <p className="text-[#7a94bb] text-xs leading-relaxed mb-4">
                                        A unique wallet address will be permanently linked. Cryptographic hashes will be recorded on the Algorand blockchain.
                                    </p>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00c9b110] border border-[#00c9b120]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                        <span className="text-[#00c9b1] font-mono text-[10px] uppercase font-bold">Liveness Verified</span>
                                    </div>
                                </div>

                                <div className="bg-[#f59e0b05] border border-[#f59e0b20] rounded-xl p-6">
                                    <div className="flex items-center gap-3 text-[#f59e0b] mb-4">
                                        <Lock size={20} />
                                        <h4 className="font-bold text-sm uppercase tracking-wide">Data Privacy</h4>
                                    </div>
                                    <p className="text-[#7a94bb] text-xs leading-relaxed">
                                        Personal data is encrypted and stored securely. No identifiers are exposed publicly on the blockchain.
                                    </p>
                                </div>

                                <button
                                    onClick={handleRegister}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] shadow-[0_0_30px_rgba(0,201,177,0.2)] active:scale-95 transition-all text-sm tracking-widest uppercase"
                                >
                                    REGISTER IDENTITY
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="border border-[#1a2d4a] text-[#7a94bb] px-6 rounded-lg hover:border-[#3d5278] transition-all">← BACK</button>
                        </div>
                    </div>
                )}

                {/* Processing Modal */}
                {isSubmitting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000bb] backdrop-blur-sm px-6">
                        <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp">
                            <div className="flex flex-col items-center text-center">
                                <LoadingSpinner size="lg" className="mb-6" />
                                <h3 className="text-[#e2eaf8] text-xl font-bold mb-8">Processing Registration</h3>

                                <div className="w-full space-y-4">
                                    {[
                                        { label: 'Validating form data', done: submitStage >= 1 },
                                        { label: 'Generating identity hashes', done: submitStage >= 2, extra: 'a3f8c...4321' },
                                        { label: 'Liveness verification confirmed', done: submitStage >= 3 },
                                        { label: 'Linking wallet address', done: submitStage >= 4, extra: 'PERA7...SPUB' },
                                        { label: 'Writing to Algorand blockchain', done: submitStage >= 5, extra: 'Block #4521893' },
                                        { label: 'Registration complete ✓', done: submitStage >= 6 },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center justify-between text-left">
                                            <div className="flex items-center gap-3">
                                                {s.done ? <Check size={14} className="text-[#00c9b1]" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#1a2d4a] animate-pulse" />}
                                                <span className={clsx("text-xs font-medium", s.done ? "text-[#e2eaf8]" : "text-[#3d5278]")}>{s.label}</span>
                                            </div>
                                            {s.done && s.extra && <span className="font-mono text-[9px] text-[#00c9b1]/60">{s.extra}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {showSuccess && (
                    <div className="animate-fadeIn pb-12">
                        <div className="flex flex-col items-center text-center max-w-lg mx-auto py-12">
                            <div className="w-24 h-24 bg-[#00c9b110] rounded-full flex items-center justify-center mb-6 animate-[bounce_1s_infinite]">
                                <Check size={64} className="text-[#00c9b1]" strokeWidth={3} />
                            </div>
                            <h2 className="text-[#00c9b1] text-4xl font-bold mb-4">Registration Successful</h2>
                            <p className="text-[#7a94bb] mb-12">The digital identity has been permanently secured on the blockchain network.</p>

                            <div className="font-mono text-[#e2eaf8] text-2xl font-bold tracking-[0.2em] mb-12 p-4 bg-[#152342] rounded-xl border border-[#1a2d4a]">
                                REF-2024-004
                            </div>

                            {/* QR Card Preview */}
                            <div id="print-card" className="bg-white text-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden text-left mb-12">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-2">
                                        <Shield size={20} className="text-[#060d1f]" />
                                        <span className="font-mono text-[10px] font-bold tracking-tighter text-gray-500 uppercase">RIMS • ALGORAND</span>
                                    </div>
                                    <div className="bg-[#10b981] text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Active</div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-lg p-2 shrink-0">
                                        <QRCodeSVG
                                            value={JSON.stringify({ id: "REF-2024-004", name: formData.fullName, address: formData.walletAddress })}
                                            size={100}
                                            level={"H"}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest border-l border-gray-100 pl-2">Full Name</label>
                                            <span className="block text-sm font-bold ml-2">{formData.fullName}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest border-l border-gray-100 pl-2">Refugee ID</label>
                                            <span className="block text-xs font-mono font-bold text-gray-600 ml-2">REF-2024-004</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Blockchain Wallet</label>
                                        <span className="block text-[10px] font-mono text-[#0a7560] break-all leading-tight">{formData.walletAddress}</span>
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-gray-400 font-medium italic">Registered: Feb 12, 2024 14:22 GMT</span>
                                        <span className="text-[9px] text-gray-400 font-medium">Camp: {formData.campId || 'CAMP-01'}</span>
                                    </div>
                                </div>

                                <div className="bg-red-600 text-white p-2 rounded-lg text-center font-bold text-[9px] tracking-widest uppercase">
                                    ⚠ KEEP SECURE • NEVER SHARE
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center justify-center gap-2 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 rounded-xl hover:bg-[#152342] transition-all"
                                >
                                    <Printer size={18} /> PRINT QR CARD
                                </button>
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setShowSuccess(false);
                                        setFormData({
                                            fullName: '',
                                            dob: '',
                                            nationality: 'Syrian',
                                            campId: '',
                                            languages: [],
                                            familyMembers: [],
                                            livenessVerified: false,
                                            walletType: null,
                                            walletAddress: '',
                                        });
                                    }}
                                    className="bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] transition-all"
                                >
                                    REGISTER ANOTHER
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
```

---

## File: src/pages/aid-worker/ScanQR.jsx

```javascript
import React, { useState } from 'react';
import { QrCode, Search, Check, FileText, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { MOCK_REFUGEES } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';

const ScanQR = () => {
    const { showToast } = useToast();
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [manualAddress, setManualAddress] = useState('');

    const simulateScan = () => {
        setIsScanning(true);
        setResult(null);

        setTimeout(() => {
            setIsScanning(false);
            const refugee = MOCK_REFUGEES[0]; // Logic: Mock matching a specific refugee
            setResult(refugee);
            showToast('info', 'Identity Found', `Successfully scanned ${refugee.name}'s QR code.`);
        }, 1500);
    };

    const handleManualLookup = () => {
        if (!manualAddress.trim()) return;
        setIsScanning(true);
        setResult(null);

        setTimeout(() => {
            setIsScanning(false);
            const refugee = MOCK_REFUGEES.find(r => r.walletAddress.includes(manualAddress.toUpperCase())) || MOCK_REFUGEES[1];
            setResult(refugee);
            showToast('success', 'Address Resolved', 'Wallet mapped to a registered identity.');
        }, 1000);
    };

    return (
        <div className="page-enter max-w-2xl mx-auto py-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-3">Identity Verification</h2>
                <p className="text-[#7a94bb] text-sm tracking-wide">Scan a refugee's QR card or enter their wallet address manually.</p>
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center mb-10">
                {/* Scanner Window */}
                <div className={clsx(
                    "w-full max-w-md aspect-square rounded-2xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 mb-8",
                    result ? "border-[#10b981] bg-[#10b98105]" :
                        isScanning ? "border-[#00c9b1] bg-[#00c9b105]" : "border-[#1a2d4a] bg-[#060d1f]"
                )}>
                    {/* Corner Brackets */}
                    <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#00c9b1] rounded-tl-lg" />
                    <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#00c9b1] rounded-tr-lg" />
                    <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#00c9b1] rounded-bl-lg" />
                    <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#00c9b1] rounded-br-lg" />

                    {isScanning ? (
                        <>
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_15px_#00c9b1] animate-scanLine z-20" />
                            <div className="text-[#00c9b1] font-mono text-xs font-bold tracking-widest animate-pulse z-10">
                                ● ANALYZING...
                            </div>
                        </>
                    ) : result ? (
                        <div className="animate-bounce flex flex-col items-center">
                            <Check size={64} className="text-[#10b981]" strokeWidth={3} />
                            <span className="text-[#10b981] font-bold mt-4 tracking-widest uppercase">SCAN SUCCESS</span>
                        </div>
                    ) : (
                        <>
                            <QrCode size={80} className="text-[#3d5278] mb-4 opacity-50" />
                            <p className="text-[#7a94bb] text-xs font-medium uppercase tracking-[0.2em]">Position QR in frame</p>
                        </>
                    )}
                </div>

                {!result && !isScanning && (
                    <button
                        onClick={simulateScan}
                        className="bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-12 rounded-xl hover:bg-[#00e0c5] shadow-[0_0_30px_rgba(0,201,177,0.2)] active:scale-95 transition-all text-sm tracking-widest uppercase"
                    >
                        SIMULATE QR SCAN
                    </button>
                )}
            </div>

            {result && (
                <div className="animate-fadeSlideUp">
                    <div className="bg-[#0f1e38] border border-[#10b98140] rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-[#00c9b120] text-[#00c9b1] rounded-full flex items-center justify-center font-bold text-xl">
                                {result.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-[#e2eaf8]">{result.name}</h3>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#10b98120] text-[#10b981] border border-[#10b98140] uppercase">
                                        Identity Verified
                                    </span>
                                </div>
                                <div className="flex gap-3 text-[#7a94bb] text-xs">
                                    <span>{result.campID}</span>
                                    <span className="text-[#1a2d4a]">|</span>
                                    <span>{result.nationality}</span>
                                    <span className="text-[#1a2d4a]">|</span>
                                    <span className="font-mono text-[#00c9b1]/60 font-bold">{result.id}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                className="flex items-center justify-center gap-2 bg-[#152342] text-[#e2eaf8] font-bold py-3 rounded-xl border border-[#1a2d4a] hover:border-[#3d5278] transition-all"
                            >
                                <FileText size={18} /> VIEW FULL PROFILE
                            </button>
                            <button
                                className="flex items-center justify-center gap-2 bg-[#00c9b1] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#00e0c5] transition-all"
                            >
                                <Package size={18} /> DISTRIBUTE AID
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setResult(null)}
                        className="w-full py-4 text-[#3d5278] text-xs font-bold uppercase tracking-widest hover:text-[#7a94bb] transition-colors"
                    >
                        RESET SCANNER
                    </button>
                </div>
            )}

            <div className="relative my-10">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1a2d4a]" /></div>
                <div className="relative flex justify-center uppercase"><span className="bg-[#060d1f] px-4 text-[#3d5278] text-[10px] font-bold tracking-widest">OR manual lookup</span></div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                        <Search size={16} />
                    </div>
                    <input
                        className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl pl-11 pr-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                        placeholder="Search by wallet address or refugee ID..."
                        value={manualAddress}
                        onChange={e => setManualAddress(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleManualLookup}
                    className="bg-[#152342] text-[#e2eaf8] font-bold px-8 rounded-xl border border-[#1a2d4a] hover:border-[#3d5278] active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                    LOOKUP
                </button>
            </div>
        </div>
    );
};

export default ScanQR;

```

---

## File: src/pages/aid-worker/SearchRefugee.jsx

```javascript
import React, { useState } from 'react';
import { Search, Filter, Eye, User, MapPin, Globe, CheckCircle } from 'lucide-react';
import { MOCK_REFUGEES } from '../../utils/mockData';
import { clsx } from 'clsx';

const SearchRefugee = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = ['All', 'CAMP-01', 'CAMP-02', 'Syrian', 'Afghan'];

    const filteredRefugees = MOCK_REFUGEES.filter(r => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = r.name.toLowerCase().includes(term) || r.id.toLowerCase().includes(term);
        const matchesFilter = activeFilter === 'All' || r.campID === activeFilter || r.nationality === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 font-sans tracking-tight">Identity Registry</h2>
                <p className="text-[#7a94bb] text-sm">Search and manage registered refugee identities within the system.</p>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                            <Search size={20} />
                        </div>
                        <input
                            className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl pl-12 pr-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                            placeholder="Search by name, ID, or wallet address..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="bg-[#00c9b1] text-[#060d1f] font-bold px-8 rounded-xl hover:bg-[#00e0c5] transition-all flex items-center gap-2">
                        <Search size={18} />
                        <span>SEARCH</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                        <Filter size={14} /> Recommended Filters:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={clsx(
                                    "px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                                    activeFilter === filter
                                        ? "bg-[#00c9b120] text-[#00c9b1] border-[#00c9b140]"
                                        : "bg-[#0f1e38] text-[#7a94bb] border-[#1a2d4a] hover:border-[#3d5278]"
                                )}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {filteredRefugees.map((refugee, i) => (
                    <div
                        key={refugee.id}
                        style={{ animationDelay: `${i * 100}ms` }}
                        className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-6 cursor-pointer hover:border-[#00c9b1] hover:shadow-[0_0_30px_rgba(0,201,177,0.1)] hover:-translate-y-1 transition-all group animate-[fadeSlideUp_0.4s_ease-out_both]"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#152342] border border-[#1a2d4a] rounded-xl flex items-center justify-center font-bold text-[#e2eaf8] transition-colors group-hover:border-[#00c9b1/40]">
                                    {refugee.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="text-[#e2eaf8] font-bold text-lg leading-none mb-1.5">{refugee.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-[#00c9b1] bg-[#00c9b105] px-1.5 py-0.5 rounded border border-[#00c9b115]">{refugee.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={clsx(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border",
                                refugee.aidClaimed
                                    ? "bg-[#10b98120] text-[#10b981] border-[#10b98140]"
                                    : "bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40]"
                            )}>
                                {refugee.aidClaimed ? (
                                    <><CheckCircle size={12} /> Aid Issued</>
                                ) : 'Awaiting Aid'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">Location</label>
                                <div className="flex items-center gap-1.5 text-xs text-[#7a94bb]">
                                    <MapPin size={14} /> {refugee.campID}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">Origin</label>
                                <div className="flex items-center gap-1.5 text-xs text-[#7a94bb]">
                                    <Globe size={14} /> {refugee.nationality}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">System ID</label>
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#e2eaf8]">
                                    {refugee.walletAddress.slice(0, 10)}...{refugee.walletAddress.slice(-4)}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">Type</label>
                                <div className="flex items-center gap-1.5 text-xs text-[#00c9b1] font-semibold">
                                    <User size={14} /> {refugee.walletType === 'pera' ? 'Self-Sovereign' : 'Managed'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#1a2d4a] group-hover:border-[#00c9b1/20]">
                            <span className="text-[#3d5278] text-[10px] italic">Registered on {new Date(refugee.registeredAt).toLocaleDateString()}</span>
                            <button className="flex items-center gap-2 text-[#00c9b1] font-bold text-xs hover:text-[#00e0c5] transition-colors">
                                VIEW PROFILE <Eye size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredRefugees.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Search size={48} className="text-[#1a2d4a] mb-4" />
                    <h3 className="text-[#e2eaf8] text-xl font-bold">No results found</h3>
                    <p className="text-[#7a94bb] text-sm mt-2">Try adjusting your search terms or filters.</p>
                </div>
            )}
        </div>
    );
};

export default SearchRefugee;

```

---

## File: src/pages/aid-worker/RequestAccess.jsx

```javascript
import React, { useState } from 'react';
import {
    Key, ShieldCheck, Globe, User, FileText,
    Search, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { MOCK_REFUGEES, MOCK_ACCESS_REQUESTS } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';

const RequestAccess = () => {
    const { showToast } = useToast();
    const [selectedRefugee, setSelectedRefugee] = useState(null);
    const [selectedField, setSelectedField] = useState(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requests, setRequests] = useState(MOCK_ACCESS_REQUESTS);
    const [filter, setFilter] = useState('All');

    const fields = [
        { id: 'age', label: 'Age Verification', icon: ShieldCheck },
        { id: 'nationality', label: 'Nationality Proof', icon: Globe },
        { id: 'identity', label: 'Full Identity', icon: User },
        { id: 'record', label: 'Registration Record', icon: FileText },
    ];

    const handleSubmit = () => {
        if (!selectedRefugee || !selectedField) return;

        setIsSubmitting(true);
        setTimeout(() => {
            const newRequest = {
                id: `REQ-00${requests.length + 1}`,
                refugeeID: selectedRefugee.id,
                refugeeName: selectedRefugee.name,
                requestedField: selectedField.label,
                requestedBy: 'Aid Worker Maria Santos',
                requestedAt: new Date().toISOString(),
                status: 'pending'
            };
            setRequests([newRequest, ...requests]);
            setIsSubmitting(false);
            setSelectedRefugee(null);
            setSelectedField(null);
            setReason('');
            showToast('success', 'Request Submitted', 'Consent request sent to refugee.');
        }, 1500);
    };

    const filteredRequests = requests.filter(r =>
        filter === 'All' || r.status.toLowerCase() === filter.toLowerCase()
    );

    return (
        <div className="page-enter grid lg:grid-cols-5 gap-8 pb-20">
            {/* Left: New Request Form */}
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 sticky top-24">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#f59e0b10] rounded-lg flex items-center justify-center border border-[#f59e0b20]">
                            <Key size={20} className="text-[#f59e0b]" />
                        </div>
                        <h2 className="text-xl font-bold text-[#e2eaf8] uppercase tracking-wider">Request Data Access</h2>
                    </div>

                    <div className="space-y-8">
                        {/* Select Refugee */}
                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">1. Select Subject</label>
                            <select
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] cursor-pointer"
                                onChange={(e) => setSelectedRefugee(MOCK_REFUGEES.find(r => r.id === e.target.value))}
                                value={selectedRefugee?.id || ''}
                            >
                                <option value="" disabled>Choose a refugee...</option>
                                {MOCK_REFUGEES.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                                ))}
                            </select>

                            {selectedRefugee && (
                                <div className="flex items-center gap-3 p-3 bg-[#152342] rounded-xl border border-[#1a2d4a] animate-fadeSlideUp">
                                    <div className="w-10 h-10 bg-[#00c9b110] text-[#00c9b1] rounded-lg flex items-center justify-center font-bold text-sm">
                                        {selectedRefugee.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-[#e2eaf8]">{selectedRefugee.name}</p>
                                        <p className="text-[10px] text-[#7a94bb]">{selectedRefugee.campID} • {selectedRefugee.nationality}</p>
                                    </div>
                                    <span className="text-[10px] font-mono text-[#00c9b1]">{selectedRefugee.id}</span>
                                </div>
                            )}
                        </div>

                        {/* Select Field */}
                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">2. Data Component</label>
                            <div className="grid grid-cols-2 gap-3">
                                {fields.map(field => {
                                    const Icon = field.icon;
                                    const isSelected = selectedField?.id === field.id;
                                    return (
                                        <div
                                            key={field.id}
                                            onClick={() => setSelectedField(field)}
                                            className={clsx(
                                                "p-4 border rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-3",
                                                isSelected
                                                    ? "bg-[#00c9b110] border-[#00c9b1] shadow-[0_0_15px_rgba(0,201,177,0.1)]"
                                                    : "bg-[#060d1f] border-[#1a2d4a] hover:border-[#3d5278] text-[#7a94bb] hover:text-[#e2eaf8]"
                                            )}
                                        >
                                            <Icon size={18} className={isSelected ? "text-[#00c9b1]" : "text-inherit"} />
                                            <span className="text-xs font-bold uppercase tracking-tighter">{field.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">3. Purpose of Access</label>
                            <textarea
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] min-h-[100px] resize-none"
                                placeholder="Briefly state why this data is required for aid delivery..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!selectedRefugee || !selectedField || isSubmitting}
                            className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-40 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> SUBMITTING...</> : 'SUBMIT CONSENT REQUEST'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Active Requests List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl flex flex-col min-h-[600px]">
                    <div className="p-6 border-b border-[#1a2d4a]">
                        <h3 className="text-[#e2eaf8] font-bold text-lg mb-6 tracking-tight">Access History</h3>
                        <div className="flex gap-2">
                            {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                        filter === status
                                            ? "bg-[#152342] text-[#00c9b1] border border-[#00c9b120]"
                                            : "text-[#3d5278] hover:text-[#e2eaf8]"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[700px]">
                        {filteredRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-[#3d5278]">
                                <Clock size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">No history found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1a2d4a]">
                                {filteredRequests.map(req => (
                                    <div key={req.id} className="p-6 hover:bg-[#152342] transition-colors group cursor-pointer">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                                    req.status === 'approved' ? "bg-[#10b98115] text-[#10b981]" :
                                                        req.status === 'rejected' ? "bg-[#ef444415] text-[#ef4444]" :
                                                            "bg-[#f59e0b15] text-[#f59e0b]"
                                                )}>
                                                    {req.status === 'approved' ? <CheckCircle size={16} /> :
                                                        req.status === 'rejected' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#e2eaf8]">{req.refugeeName}</p>
                                                    <p className="text-[10px] text-[#7a94bb]">{req.requestedField}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border",
                                                req.status === 'approved' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                                    req.status === 'rejected' ? "bg-[#ef444410] text-[#ef4444] border-[#ef444420]" :
                                                        "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                            )}>
                                                {req.status}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-[#3d5278]">
                                            <span>{new Date(req.requestedAt).toLocaleDateString()} at {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <ChevronRight size={14} className="group-hover:text-[#00c9b1] transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestAccess;

```

---

## File: src/pages/aid-worker/AidDistribution.jsx

```javascript
import React, { useState } from 'react';
import {
    Package, Search, Clock, CheckCircle, AlertTriangle,
    MapPin, Globe, Loader2, ArrowRight, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { MOCK_REFUGEES } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';

const AidDistribution = () => {
    const { showToast } = useToast();
    const [selectedRefugee, setSelectedRefugee] = useState(MOCK_REFUGEES[0]);
    const [isConfirming, setIsConfirming] = useState(false);
    const [pendingAid, setPendingAid] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock aid types
    const AID_TYPES = [
        { id: 'food', name: 'Food Rations', icon: '🍞', claimed: false },
        { id: 'meds', name: 'Medical Kit', icon: '🏥', claimed: true, timestamp: '2024-02-10T14:30:00Z' },
        { id: 'shelter', name: 'Shelter Items', icon: '🏠', claimed: false },
        { id: 'cash', name: 'Cash Assistance', icon: '💵', claimed: false },
        { id: 'clothing', name: 'Essentials Kit', icon: '👕', claimed: false },
    ];

    const [aidStatus, setAidStatus] = useState(AID_TYPES);

    const handleIssue = (aid) => {
        if (aid.claimed) {
            showToast('error', 'Action Blocked', 'This specific aid has already been claimed and recorded on-chain.');
            return;
        }
        setPendingAid(aid);
        setIsConfirming(true);
    };

    const confirmDistribution = () => {
        setIsConfirming(false);
        setIsProcessing(true);

        // Simulate blockchain confirmation
        setTimeout(() => {
            setAidStatus(prev => prev.map(a =>
                a.id === pendingAid.id ? { ...a, claimed: true, timestamp: new Date().toISOString() } : a
            ));
            setIsProcessing(false);
            setPendingAid(null);
            showToast('success', 'Transaction Confirmed', 'Aid package successfully issued and recorded to Algorand.');
        }, 2500);
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 font-sans tracking-tight">Aid Distribution</h2>
                    <p className="text-[#7a94bb] text-sm">Verify identity and authorize resource distribution via smart contract.</p>
                </div>

                <div className="w-full md:w-96 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                        <Search size={18} />
                    </div>
                    <input
                        className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl pl-11 pr-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                        placeholder="Scan or search refugee..."
                    />
                </div>
            </div>

            {/* Refugee Profile Bar */}
            {selectedRefugee && (
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#10b98110] border border-[#10b98120] rounded-lg">
                            <CheckCircle size={14} className="text-[#10b981]" />
                            <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">On-Chain Profile Verified</span>
                        </div>
                    </div>

                    <div className="w-20 h-20 bg-[#152342] rounded-2xl flex items-center justify-center text-3xl font-bold text-[#00c9b1] border border-[#1a2d4a]">
                        {selectedRefugee.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold text-[#e2eaf8] mb-1">{selectedRefugee.name}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-[#7a94bb] font-medium">
                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {selectedRefugee.campID}</span>
                            <span className="flex items-center gap-1.5"><Globe size={14} /> {selectedRefugee.nationality}</span>
                            <span className="font-mono text-[#3d5278] uppercase">{selectedRefugee.id}</span>
                        </div>
                    </div>

                    <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] w-full md:w-auto">
                        <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Connected Address</label>
                        <div className="font-mono text-[#00c9b1] text-xs">
                            {selectedRefugee.walletAddress.slice(0, 10)}...{selectedRefugee.walletAddress.slice(-8)}
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Box */}
            <div className="bg-[#f59e0b08] border border-[#f59e0b20] rounded-xl p-4 flex gap-4 items-start">
                <AlertTriangle className="text-[#f59e0b] shrink-0" size={20} />
                <p className="text-[#7a94bb] text-[11px] leading-relaxed">
                    <strong className="text-[#f59e0b] uppercase font-bold tracking-widest">Security Protocol:</strong> Each aid type can only be claimed <span className="text-[#e2eaf8] font-bold">ONCE</span> per identity period. All transactions are permanently cryptographically signed and recorded on the Algorand blockchain to prevent double-claiming and fraud.
                </p>
            </div>

            {/* Aid Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aidStatus.map(aid => (
                    <div
                        key={aid.id}
                        className={clsx(
                            "bg-[#0f1e38] border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden",
                            aid.claimed
                                ? "border-[#1a2d4a] opacity-80"
                                : "border-[#1a2d4a] border-l-4 border-l-[#00c9b1] hover:border-[#00c9b1] group hover:shadow-[0_0_20px_rgba(0,201,177,0.05)] hover:-translate-y-1"
                        )}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-4xl">{aid.icon}</div>
                            <div className={clsx(
                                "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                                aid.claimed
                                    ? "bg-[#10b98115] text-[#10b981] border-[#10b98125]"
                                    : "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b25]"
                            )}>
                                {aid.claimed ? 'Claimed ✓' : 'Available'}
                            </div>
                        </div>

                        <h4 className="text-[#e2eaf8] font-bold text-lg mb-2">{aid.name}</h4>

                        {aid.claimed ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-[#060d1f] rounded-lg">
                                    <div className="flex items-center gap-2 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest mb-1.5">
                                        <Clock size={12} /> Issuance Log
                                    </div>
                                    <p className="text-[#7a94bb] text-[11px]">Recorded Dec 12, 2024</p>
                                    <p className="text-[#3d5278] font-mono text-[9px] mt-1 truncate">Tx: 0xabc123...4321</p>
                                </div>
                                <button disabled className="w-full py-3 bg-[#1a2d4a] text-[#3d5278] text-xs font-bold uppercase tracking-widest rounded-xl cursor-not-allowed">
                                    Already Distributed
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-[#7a94bb] text-xs">Standard humanitarian package for {aid.name.toLowerCase()}.</p>
                                <button
                                    onClick={() => handleIssue(aid)}
                                    className="w-full py-3 bg-[#00c9b1] text-[#060d1f] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#00e0c5] transition-all group-hover:shadow-[0_0_20px_rgba(0,201,177,0.2)]"
                                >
                                    Issue Aid Package
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Confirmation Modal */}
            {isConfirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-md px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00c9b1]" />
                        <button onClick={() => setIsConfirming(false)} className="absolute top-6 right-6 text-[#3d5278] hover:text-[#e2eaf8]"><X size={24} /></button>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-[#00c9b115] text-[#00c9b1] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                                {pendingAid?.icon}
                            </div>
                            <h3 className="text-[#e2eaf8] text-2xl font-bold mb-4 tracking-tight">Authorize Distribution</h3>
                            <p className="text-[#7a94bb] text-sm leading-relaxed mb-8">
                                You are issuing <span className="text-[#00c9b1] font-bold">{pendingAid?.name}</span> to <span className="text-[#e2eaf8] font-bold">{selectedRefugee?.name}</span>. This action will be permanently recorded via smart contract.
                            </p>

                            <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] text-left mb-8">
                                <div className="flex items-center gap-2 text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">
                                    Subject Identity ID
                                </div>
                                <div className="font-mono text-[#00c9b1] text-xs break-all leading-relaxed">
                                    {selectedRefugee?.walletAddress}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={confirmDistribution}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                                >
                                    CONFIRM & SIGN <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    className="w-full py-4 text-[#3d5278] text-xs font-bold uppercase tracking-widest hover:text-[#7a94bb] transition-colors"
                                >
                                    CANCEL TRANSACTION
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#060d1f] px-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative w-24 h-24 mb-10">
                            <div className="absolute inset-0 border-4 border-[#1a2d4a] rounded-full" />
                            <div className="absolute inset-0 border-4 border-[#00c9b1] border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[#00c9b1] font-bold text-xl">
                                <Package className="animate-pulse" size={40} />
                            </div>
                        </div>
                        <h3 className="text-[#e2eaf8] text-3xl font-bold mb-4 animate-pulse">Confirming On-Chain</h3>
                        <p className="text-[#7a94bb] text-lg tracking-wide uppercase border-l-2 border-[#00c9b1] pl-6 h-8 flex items-center">
                            Updating Global Registry...
                        </p>

                        <div className="mt-12 space-y-2 opacity-50">
                            <div className="font-mono text-[10px] text-[#00c9b1]">Executing Smart Contract call (0xc412...)</div>
                            <div className="font-mono text-[10px] text-[#00c9b1]">Submitting to Block #18429112</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AidDistribution;

```

---

## File: src/pages/refugee/RefugeeDashboard.jsx

```javascript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, Package, Wallet, MapPin, Hash,
    Bell, Lock, Shield, ArrowRight, RefreshCw, Copy, CheckCircle
} from 'lucide-react';
import { MOCK_REFUGEES, MOCK_ACCESS_REQUESTS } from '../../utils/mockData';
import { StatCard } from '../../components/ui/Common';

const RefugeeDashboard = () => {
    const navigate = useNavigate();
    const refugee = MOCK_REFUGEES[0];
    const pendingRequests = MOCK_ACCESS_REQUESTS.filter(r => r.status === 'pending');

    return (
        <div className="page-enter space-y-8 pb-20">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[#7a94bb] text-lg mb-1 font-medium">Welcome back,</p>
                    <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-bold text-[#e2eaf8] tracking-tight">{refugee.name}</h2>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#10b98115] border border-[#10b98130] rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] glow-teal" />
                            <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">Verified Identity</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#3d5278] font-bold uppercase tracking-[0.15em]">
                        <span className="flex items-center gap-1.5"><MapPin size={14} /> {refugee.campID}</span>
                        <span className="flex items-center gap-1.5"><Hash size={14} /> {refugee.id}</span>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {pendingRequests.length > 0 && (
                <div className="bg-[#f59e0b10] border border-[#f59e0b30] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f59e0b15] text-[#f59e0b] rounded-full flex items-center justify-center shrink-0">
                            <Bell size={20} />
                        </div>
                        <p className="text-[#e2eaf8] text-sm font-semibold">
                            You have <span className="text-[#f59e0b]">{pendingRequests.length} access request</span> waiting for your authorization.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/refugee/requests')}
                        className="w-full md:w-auto px-6 py-2 border border-[#f59e0b] text-[#f59e0b] text-xs font-bold rounded-lg hover:bg-[#f59e0b15] transition-all flex items-center justify-center gap-2"
                    >
                        REVIEW NOW <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                    icon={ShieldCheck}
                    label="Identity Status"
                    value="Proven"
                    accentColor="#00c9b1"
                />
                <StatCard
                    icon={Package}
                    label="Aid Entitlement"
                    value={refugee.aidClaimed ? "Issued" : "Available"}
                    accentColor="#f59e0b"
                    change={refugee.aidClaimed ? "Last: 48h ago" : "Claim Now"}
                    changeType={refugee.aidClaimed ? "up" : "down"}
                />
                <StatCard
                    icon={Wallet}
                    label="Ownership"
                    value="Self-Sovereign"
                    accentColor="#3b82f6"
                />
            </div>

            {/* Identity Record Card */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#1a2d4a]">
                    <div className="flex items-center gap-3">
                        <Lock size={20} className="text-[#00c9b1]" />
                        <h3 className="text-[#e2eaf8] font-bold text-lg uppercase tracking-wider">Authenticated Identity Record</h3>
                    </div>
                    <div className="text-[10px] text-[#3d5278] font-mono uppercase tracking-widest">Stored on Algorand Ledger</div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-12">
                    {[
                        { label: 'Full Name', value: refugee.name },
                        { label: 'Nationality', value: refugee.nationality },
                        { label: 'Date of Birth', value: refugee.dob },
                        { label: 'Place of Birth', value: 'Homs, Syria' },
                        { label: 'Gender', value: refugee.gender },
                        { label: 'Camp ID', value: refugee.campID },
                        { label: 'Languages', value: refugee.languages.join(', ') },
                        { label: 'Family Status', value: 'Married with Children' },
                    ].map((item, i) => (
                        <div key={i} className="space-y-1">
                            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">{item.label}</label>
                            <div className="text-[#e2eaf8] text-sm font-semibold">{item.value}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-10 border-t border-[#1a2d4a] space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">Global Identity Hash (CID)</label>
                            <div className="flex items-center gap-3 p-3 bg-[#060d1f] rounded-xl border border-[#1a2d4a]">
                                <span className="font-mono text-[#00c9b1] text-xs truncate flex-1 leading-relaxed">{refugee.identityHash}</span>
                                <button className="text-[#3d5278] hover:text-[#00c9b1] transition-colors"><Copy size={16} /></button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">Personhood Verification</label>
                            <div className="flex items-center gap-3 p-3 bg-[#060d1f] rounded-xl border border-[#1a2d4a]">
                                <span className="font-mono text-[#00c9b1] text-xs truncate flex-1 leading-relaxed">{refugee.personhoodHash}</span>
                                <button className="text-[#3d5278] hover:text-[#00c9b1] transition-colors"><Copy size={16} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 pt-4">
                        <div className="space-y-2">
                            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">Age Attestation</label>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#10b98110] border border-[#10b98125] rounded-xl">
                                <CheckCircle size={14} className="text-[#10b981]" />
                                <span className="text-[#10b981] text-[11px] font-bold uppercase tracking-widest leading-none">Status: Over 18 (Verified)</span>
                            </div>
                        </div>
                        <p className="text-[#3d5278] text-[10px] italic leading-tight max-w-xs">
                            Selective disclosure active: Requesters only see the "Over 18" status, not your specific date of birth.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-8">
                <div
                    onClick={() => navigate('/refugee/requests')}
                    className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 cursor-pointer hover:border-[#00c9b1] transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#00c9b105] rounded-full group-hover:bg-[#00c9b110] transition-colors" />
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-14 h-14 bg-[#00c9b115] text-[#00c9b1] rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-[#e2eaf8] font-bold text-xl mb-1 flex items-center gap-3">
                                Access Control
                                {pendingRequests.length > 0 && <span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full glow-teal animate-pulse" />}
                            </h3>
                            <p className="text-[#7a94bb] text-sm tracking-wide">Manage permissions for aid workers and officials.</p>
                        </div>
                    </div>
                    <button className="text-[#00c9b1] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all whitespace-nowrap">
                        MANAGE DATA CONSENT <ArrowRight size={16} />
                    </button>
                </div>

                <div
                    onClick={() => navigate('/refugee/migration')}
                    className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 cursor-pointer hover:border-[#8b5cf6] transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#8b5cf605] rounded-full group-hover:bg-[#8b5cf610] transition-colors" />
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-14 h-14 bg-[#8b5cf615] text-[#8b5cf6] rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                            <RefreshCw size={32} />
                        </div>
                        <div>
                            <h3 className="text-[#e2eaf8] font-bold text-xl mb-1">Backup & Migration</h3>
                            <p className="text-[#7a94bb] text-sm tracking-wide">Secure your recovery keys or migrate to a new device.</p>
                        </div>
                    </div>
                    <button className="text-[#8b5cf6] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all whitespace-nowrap">
                        START SECURITY WIZARD <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefugeeDashboard;

```

---

## File: src/pages/refugee/AccessRequests.jsx

```javascript
import React, { useState } from 'react';
import {
    ShieldCheck, Clock, CheckCircle, XCircle,
    Info, Bell, ChevronDown, Lock, Fingerprint, Loader2, X, User
} from 'lucide-react';
import { clsx } from 'clsx';
import { MOCK_ACCESS_REQUESTS } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';

const AccessRequests = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('Pending');
    const [requests, setRequests] = useState(MOCK_ACCESS_REQUESTS);
    const [isSigning, setIsSigning] = useState(false);
    const [signingStage, setSigningStage] = useState(0); // 0: idle, 1: open app, 2: biometric, 3: signing
    const [selectedRequest, setSelectedRequest] = useState(null);

    const tabs = ['Pending', 'Approved', 'Rejected', 'All'];

    const filteredRequests = requests.filter(r =>
        activeTab === 'All' ? true : r.status.toLowerCase() === activeTab.toLowerCase()
    );

    const handleApprove = (req) => {
        setSelectedRequest(req);
        setIsSigning(true);
        setSigningStage(1);

        setTimeout(() => setSigningStage(2), 1000);
        setTimeout(() => setSigningStage(3), 2000);
        setTimeout(() => {
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
            setIsSigning(false);
            setSigningStage(0);
            setSelectedRequest(null);
            showToast('success', 'Consent Granted', `You have authorized access to your ${req.requestedField}.`);
        }, 3500);
    };

    const handleReject = (req) => {
        if (window.confirm("Are you sure you want to reject this access request?")) {
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
            showToast('info', 'Request Rejected', 'The requester has been notified of your decision.');
        }
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 font-sans tracking-tight">Data Governance</h2>
                <p className="text-[#7a94bb] text-sm">Manage who can access specific parts of your digital identity record.</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[#1a2d4a]">
                {tabs.map(tab => {
                    const count = tab === 'All' ? requests.length : requests.filter(r => r.status.toLowerCase() === tab.toLowerCase()).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative",
                                activeTab === tab ? "text-[#00c9b1]" : "text-[#3d5278] hover:text-[#7a94bb]"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {tab}
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                    activeTab === tab ? "bg-[#00c9b110] border-[#00c9b140]" : "bg-[#152342] border-[#1a2d4a]"
                                )}>{count}</span>
                            </div>
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_10px_#00c9b1]" />}
                        </button>
                    );
                })}
            </div>

            {/* Requests List */}
            <div className="grid gap-6">
                {filteredRequests.length === 0 ? (
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl py-24 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-[#152342] rounded-full flex items-center justify-center mb-6">
                            <ShieldCheck size={32} className="text-[#3d5278]" />
                        </div>
                        <h4 className="text-[#e2eaf8] font-bold text-lg">No {activeTab.toLowerCase()} requests</h4>
                        <p className="text-[#7a94bb] text-sm mt-1 max-w-xs">Your data is secure. Requests for access will appear here.</p>
                    </div>
                ) : (
                    filteredRequests.map((req, i) => (
                        <div
                            key={req.id}
                            style={{ animationDelay: `${i * 100}ms` }}
                            className={clsx(
                                "bg-[#0f1e38] border rounded-2xl p-6 transition-all duration-300 animate-fadeSlideUp",
                                req.status === 'pending' ? "border-[#f59e0b40] border-l-4 border-l-[#f59e0b]" :
                                    req.status === 'approved' ? "border-[#10b98140] border-l-4 border-l-[#10b981]" :
                                        "border-[#ef444440] border-l-4 border-l-[#ef4444] opacity-80"
                            )}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-5">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                                        req.status === 'pending' ? "bg-[#f59e0b10] border-[#f59e0b25] text-[#f59e0b]" :
                                            req.status === 'approved' ? "bg-[#10b98110] border-[#10b98125] text-[#10b981]" :
                                                "bg-[#ef444410] border-[#ef444425] text-[#ef4444]"
                                    )}>
                                        {req.status === 'pending' ? <Bell size={24} /> :
                                            req.status === 'approved' ? <ShieldCheck size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-[#e2eaf8] font-bold text-lg">{req.refugeeName}</h3>
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border",
                                                req.status === 'pending' ? "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]" :
                                                    req.status === 'approved' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                                        "bg-[#ef444410] text-[#ef4444] border-[#ef444420]"
                                            )}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="text-[#7a94bb] text-sm">Field Requested: <span className="text-[#e2eaf8] font-semibold">{req.requestedField}</span></p>
                                        <div className="flex items-center gap-4 pt-1">
                                            <span className="text-[#3d5278] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                                <User className="w-3 h-3" /> By: {req.requestedBy}
                                            </span>
                                            <span className="text-[#3d5278] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" /> {new Date(req.requestedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {req.status === 'pending' ? (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => handleReject(req)}
                                            className="px-6 py-3 border border-[#ef444440] text-[#ef4444] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#ef444410] transition-all"
                                        >
                                            REJECT
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="px-10 py-3 bg-[#00c9b1] text-[#060d1f] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#00e0c5] shadow-[0_0_20px_rgba(0,201,177,0.1)] transition-all"
                                        >
                                            APPROVE
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 shrink-0 pr-4">
                                        {req.status === 'approved' && (
                                            <p className="text-[#10b981] text-[10px] font-bold uppercase italic tracking-widest">Access Active</p>
                                        )}
                                        <ChevronDown className="text-[#3d5278] cursor-pointer" />
                                    </div>
                                )}
                            </div>

                            {req.status === 'pending' && (
                                <div className="mt-6 p-4 bg-[#f59e0b05] border border-[#f59e0b15] rounded-xl flex gap-4 items-start">
                                    <Info size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
                                    <p className="text-[#7a94bb] text-[11px] leading-relaxed">
                                        Approving this request will allow the aid worker to view your <span className="text-white font-bold">{req.requestedField}</span> status. No other personal data will be disclosed. You can revoke this access at any time.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pera Signing Simulation Modal */}
            {isSigning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-md px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#3b82f6]" />
                        <div className="text-center">
                            <div className="w-20 h-20 bg-[#3b82f615] text-[#3b82f6] rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-12 glow-teal">
                                <Fingerprint size={48} className={signingStage >= 2 ? "text-[#10b981]" : "text-[#3b82f6]"} />
                            </div>
                            <h3 className="text-[#e2eaf8] text-2xl font-bold mb-4">Pera Multi-Sig</h3>
                            <p className="text-[#7a94bb] text-sm leading-relaxed mb-10">
                                Please confirm the biometric challenge on your Pera Wallet mobile app to authorize this transaction.
                            </p>

                            <div className="space-y-4 text-left">
                                {[
                                    { label: 'Open Pera Wallet app', done: signingStage >= 1 },
                                    { label: 'Biometric authorization', done: signingStage >= 2 },
                                    { label: 'Smart contract signing', done: signingStage >= 3 },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className={clsx("text-xs font-bold uppercase tracking-widest", s.done ? "text-[#10b981]" : "text-[#3d5278]")}>
                                            {i + 1}. {s.label}
                                        </span>
                                        {s.done ? <CheckCircle size={14} className="text-[#10b981]" /> :
                                            (!s.done && signingStage === i + 1) ? <Loader2 size={14} className="animate-spin text-[#3b82f6]" /> :
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#1a2d4a]" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessRequests;

```

---

## File: src/pages/refugee/WalletMigration.jsx

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    QrCode, Smartphone, ArrowLeftRight, CheckCircle,
    ArrowRight, ShieldCheck, RefreshCw, Loader2, AlertTriangle, Fingerprint
} from 'lucide-react';
import { clsx } from 'clsx';
import { MOCK_REFUGEES } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';

const WalletMigration = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [migrationData, setMigrationData] = useState({
        refugee: MOCK_REFUGEES[0],
        newAddress: '',
        isWalletConnected: false
    });

    const nextStep = () => setStep(prev => prev + 1);

    const simulateScan = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            nextStep();
            showToast('success', 'Identity Found', 'Security credentials verified from your QR card.');
        }, 1500);
    };

    const connectWallet = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setMigrationData(prev => ({
                ...prev,
                newAddress: 'PERA3N8OPQR9STU4VWX5YZA6BCD7EFGHIJK',
                isWalletConnected: true
            }));
            setIsProcessing(false);
            showToast('success', 'Wallet Linked', 'Your new Pera wallet has been securely paired.');
        }, 2000);
    };

    const finalSubmit = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            nextStep();
            showToast('success', 'Migration Complete', 'Your identity is now under your full sovereignty.');
        }, 4000);
    };

    return (
        <div className="page-enter max-w-2xl mx-auto py-8">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-3">Wallet Migration Upgrade</h2>
                <p className="text-[#8b5cf6] text-xs font-bold uppercase tracking-[0.2em] mb-4">Sovereignty Wizard</p>
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={clsx(
                            "w-10 h-1.5 rounded-full transition-all duration-500",
                            step >= i ? "bg-[#8b5cf6]" : "bg-[#1a2d4a]"
                        )} />
                    ))}
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-[#f59e0b10] text-[#f59e0b] rounded-full flex items-center justify-center mb-8 border border-[#f59e0b20]">
                            <QrCode size={40} />
                        </div>
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-4">Verification Phase</h3>
                        <p className="text-[#7a94bb] text-sm text-center leading-relaxed mb-10 max-w-sm">
                            Scan your current <span className="text-white font-bold">RIMS Security Card</span> to verify existing identity ownership before migrating to your mobile device.
                        </p>

                        <div className="w-full relative aspect-video bg-[#060d1f] border-2 border-[#1a2d4a] rounded-2xl flex flex-col items-center justify-center overflow-hidden mb-10">
                            <div className="absolute inset-0 border-[20px] border-[#0f1e38] opacity-50" />
                            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#8b5cf6]" />
                            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#8b5cf6]" />
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#8b5cf6]" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#8b5cf6]" />

                            {isProcessing ? (
                                <>
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#8b5cf6] shadow-[0_0_20px_#8b5cf6] animate-scanLine z-20" />
                                    <p className="text-[#8b5cf6] font-mono text-[10px] uppercase font-bold tracking-[0.3em] animate-pulse">Scanning...</p>
                                </>
                            ) : (
                                <p className="text-[#3d5278] text-[9px] uppercase font-bold tracking-[0.2em]">Awaiting Scanner Interaction</p>
                            )}
                        </div>

                        <button
                            onClick={simulateScan}
                            disabled={isProcessing}
                            className="w-full bg-[#8b5cf6] text-white font-bold py-5 rounded-2xl hover:bg-[#a78bfa] transition-all text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(139,92,246,0.2)] disabled:opacity-50"
                        >
                            {isProcessing ? 'VERIFYING...' : 'SIMULATE SECURITY CARD SCAN'}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-[#3b82f610] text-[#3b82f6] rounded-full flex items-center justify-center mb-8 border border-[#3b82f620]">
                            <Smartphone size={40} />
                        </div>
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-4">Pair Pera Wallet</h3>
                        <p className="text-[#7a94bb] text-sm text-center leading-relaxed mb-10 max-w-sm">
                            Open Pera Wallet on your mobile device and connect to create your permanent <span className="text-white font-bold">Self-Sovereign Identity</span>.
                        </p>

                        <div className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-2xl p-6 mb-10">
                            {migrationData.isWalletConnected ? (
                                <div className="flex flex-col items-center gap-4 animate-fadeSlideUp">
                                    <div className="px-4 py-1.5 bg-[#10b98115] text-[#10b981] rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#10b98125]">
                                        Successfully Paired
                                    </div>
                                    <div className="font-mono text-[#00c9b1] text-xs break-all text-center px-4">
                                        {migrationData.newAddress}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-32 text-center">
                                    <div className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest mb-2">Target Address Status</div>
                                    <p className="text-[#7a94bb] text-xs italic">Awaiting mobile handshake...</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 w-full gap-4">
                            {!migrationData.isWalletConnected ? (
                                <button
                                    onClick={connectWallet}
                                    disabled={isProcessing}
                                    className="w-full bg-[#3b82f6] text-white font-bold py-5 rounded-2xl hover:bg-[#60a5fa] transition-all text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                                >
                                    {isProcessing ? 'CONNECTING...' : 'CONNECT PERA WALLET'}
                                </button>
                            ) : (
                                <button
                                    onClick={nextStep}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-5 rounded-2xl hover:bg-[#00e0c5] transition-all text-xs tracking-[0.2em]"
                                >
                                    CONTINUE TO FINAL STEP
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10">
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#1a2d4a]">
                            <div className="w-12 h-12 bg-[#8b5cf610] text-[#8b5cf6] rounded-xl flex items-center justify-center border border-[#8b5cf620]">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-[#e2eaf8] font-bold text-lg">Final Confirmation</h3>
                                <p className="text-[#7a94bb] text-xs uppercase tracking-widest">Ownership Transfer Agreement</p>
                            </div>
                        </div>

                        <div className="bg-[#060d1f] rounded-2xl border border-[#1a2d4a] overflow-hidden mb-10">
                            <div className="p-4 border-b border-[#1a2d4a]">
                                <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Retiring Managed Wallet</label>
                                <div className="font-mono text-[#7a94bb] text-[10px] truncate opacity-50">{migrationData.refugee.walletAddress}</div>
                            </div>
                            <div className="flex justify-center p-2">
                                <ArrowLeftRight className="text-[#3d5278]" size={16} />
                            </div>
                            <div className="p-4 bg-[#8b5cf605]">
                                <label className="block text-[#8b5cf6] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Activating Personal Wallet</label>
                                <div className="font-mono text-[#8b5cf6] text-[10px] truncate font-bold">{migrationData.newAddress}</div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            {[
                                "New Pera hardware verified",
                                "Identity ownership transfer authorized",
                                "Digital history migration confirmed",
                                "Blockchain key destruction protocol initialized"
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-[#152342]/50 border border-[#1a2d4a] rounded-xl">
                                    <CheckCircle size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                                    <p className="text-[#e2eaf8] text-xs font-medium">{item}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#f59e0b10] border border-[#f59e0b30] rounded-xl p-4 flex gap-4 items-start mb-10">
                            <AlertTriangle className="text-[#f59e0b] shrink-0" size={18} />
                            <p className="text-[#7a94bb] text-[10px] leading-relaxed italic">
                                Critical: Once you sign with Pera, RIMS staff will NO LONGER have power to recover your identity if you lose your phone. Keep your recovery phrase safe.
                            </p>
                        </div>

                        <button
                            onClick={finalSubmit}
                            disabled={isProcessing}
                            className="w-full bg-[#8b5cf6] text-white font-bold py-5 rounded-2xl hover:bg-[#a78bfa] transition-all text-sm tracking-[0.2em] shadow-[0_0_40px_rgba(139,92,246,0.3)] uppercase flex items-center justify-center gap-3"
                        >
                            {isProcessing ? <><Loader2 className="animate-spin" /> AUTHORIZING...</> : 'SIGN MIGRATION WITH PERA'}
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fadeSlideUp py-12">
                    <div className="bg-[#0f1e38] border border-[#10b98140] rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                        <div className="w-24 h-24 bg-[#10b98110] text-[#10b981] rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                            <RefreshCw size={56} className="animate-[spin_4s_linear_infinite]" />
                        </div>

                        <h2 className="text-[#10b981] text-4xl font-bold mb-4 tracking-tight uppercase">Migration Complete</h2>
                        <p className="text-[#7a94bb] text-lg mb-12 max-w-sm mx-auto">
                            You now have full sovereignty and control over your digital identity history.
                        </p>

                        <div className="grid gap-4 max-w-sm mx-auto mb-12 text-left">
                            <div className="p-4 bg-[#060d1f] border border-[#1a2d4a] rounded-2xl">
                                <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-widest mb-2">New Active Wallet</label>
                                <div className="font-mono text-[#00c9b1] text-xs truncate font-bold">PERA3N8OPQR9STU4VWX5YZA6BCD7EFGHIJK</div>
                            </div>
                            <div className="p-4 bg-[#060d1f] border border-[#1a2d4a] rounded-2xl opacity-40">
                                <label className="block text-[#ef4444] text-[9px] font-bold uppercase tracking-widest mb-2">Retired Wallet</label>
                                <div className="font-mono text-[#7a94bb] text-xs truncate line-through">CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH</div>
                            </div>
                            <div className="flex justify-between px-4 text-[10px] text-[#3d5278] font-bold uppercase tracking-widest">
                                <span>Block Hash</span>
                                <span className="font-mono text-[#00c9b1]">#4521894_MIG</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/refugee/dashboard')}
                            className="w-full max-w-sm bg-[#00c9b1] text-[#060d1f] font-bold py-5 rounded-2xl hover:bg-[#00e0c5] transition-all text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(0,201,177,0.2)] uppercase"
                        >
                            RETURN TO DASHBOARD
                        </button>
                    </div>
                </div>
            )}

            {/* Pera Signing Simulation Modal (Universal for Step 3) */}
            {isProcessing && step === 3 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000ee] backdrop-blur-xl px-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-[#8b5cf620] text-[#8b5cf6] rounded-3xl flex items-center justify-center mb-10 rotate-12 glow-teal border border-[#8b5cf640]">
                            <Fingerprint size={56} className="animate-pulse" />
                        </div>
                        <h3 className="text-white text-3xl font-bold mb-4 tracking-tight">Confirm Sovereign Transition</h3>
                        <p className="text-[#7a94bb] mb-12 max-w-xs uppercase text-[10px] tracking-[0.3em] font-bold border-l-2 border-[#8b5cf6] pl-6 h-8 flex items-center">
                            Waiting for mobile signature...
                        </p>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:150ms]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletMigration;

```

---

## File: src/pages/admin/AdminDashboard.jsx

```javascript
import React from 'react';
import {
    Users, Package, ArrowLeftRight, ShieldAlert,
    ArrowRight, TrendingUp, TrendingDown, Clock,
    Download
} from 'lucide-react';
import { MOCK_STATS, MOCK_AUDIT_LOG } from '../../utils/mockData';
import { StatCard } from '../../components/ui/Common';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8]">Admin Overview</h2>
                <p className="text-[#7a94bb] mt-1">System-wide monitoring and controls</p>
            </div>

            {/* Stats Row */}
            <div className="grid md:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="TOTAL REGISTERED"
                    value={MOCK_STATS.totalRegistered.toLocaleString()}
                    accentColor="#00c9b1"
                    change="+127 this week"
                    changeType="up"
                />
                <StatCard
                    icon={Package}
                    label="AID CLAIMS THIS WEEK"
                    value={MOCK_STATS.aidClaimsThisWeek.toString()}
                    accentColor="#10b981"
                    change="+48 today"
                    changeType="up"
                />
                <div onClick={() => navigate('/admin/migrations')} className="cursor-pointer">
                    <StatCard
                        icon={ArrowLeftRight}
                        label="PENDING MIGRATIONS"
                        value={MOCK_STATS.pendingMigrations.toString()}
                        accentColor="#f59e0b"
                        change="Awaiting approval"
                        changeType="neutral"
                    />
                </div>
                <StatCard
                    icon={ShieldAlert}
                    label="BLOCKED DUPLICATES"
                    value={MOCK_STATS.blockedDuplicates.toString()}
                    accentColor="#ef4444"
                    change="+3 this week"
                    changeType="down"
                />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-8 mt-8">
                {/* Registrations Chart */}
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                    <h3 className="text-[#e2eaf8] font-bold mb-8 uppercase tracking-wider text-sm">Registrations This Week</h3>
                    <div className="h-48 relative flex items-end gap-3 px-4 pb-8">
                        {/* Guide Lines */}
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="absolute left-0 right-0 border-t border-[#1a2d4a]" style={{ bottom: `${(i + 1) * 25}%` }} />
                        ))}

                        {[
                            { day: 'Mon', val: 120 },
                            { day: 'Tue', val: 145 },
                            { day: 'Wed', val: 98 },
                            { day: 'Thu', val: 167 },
                            { day: 'Fri', val: 203 },
                            { day: 'Sat', val: 189 },
                            { day: 'Sun', val: 145 },
                        ].map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div
                                    className="w-full bg-[#00c9b1] rounded-t-sm transition-all duration-500 hover:bg-[#00e0c5] relative"
                                    style={{ height: `${(item.val / 210) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#152342] text-[#00c9b1] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#00c9b140] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {item.val}
                                    </div>
                                </div>
                                <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-tighter">{item.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aid Distribution Chart */}
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                    <h3 className="text-[#e2eaf8] font-bold mb-8 uppercase tracking-wider text-sm">Aid Distribution by Type</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Food', count: 892, color: '#00c9b1', percent: 89 },
                            { label: 'Medicine', count: 634, color: '#3b82f6', percent: 63 },
                            { label: 'Shelter', count: 445, color: '#8b5cf6', percent: 44 },
                            { label: 'Cash', count: 312, color: '#f59e0b', percent: 31 },
                            { label: 'Clothing', count: 201, color: '#10b981', percent: 20 },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-[#7a94bb] text-xs font-bold w-20 uppercase tracking-tight">{item.label}</span>
                                <div className="flex-1 bg-[#152342] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                                    />
                                </div>
                                <span className="font-mono text-[11px] text-[#e2eaf8] w-10 text-right">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1a2d4a]">
                    <h3 className="text-[#e2eaf8] font-bold uppercase tracking-wider text-sm">Recent On-Chain Activity</h3>
                    <button className="text-[#8b5cf6] text-[10px] font-bold uppercase tracking-[0.2em] hover:underline">VIEW FULL LOG</button>
                </div>

                <div className="divide-y divide-[#1a2d4a]">
                    {MOCK_AUDIT_LOG.map((log) => (
                        <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <span className={clsx(
                                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight border",
                                    log.type === 'Registration' ? "bg-[#00c9b110] text-[#00c9b1] border-[#00c9b120]" :
                                        log.type === 'Aid Issued' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                            log.type === 'Consent Approved' ? "bg-[#8b5cf610] text-[#8b5cf6] border-[#8b5cf620]" :
                                                "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                )}>
                                    {log.type}
                                </span>
                                <div className="space-y-0.5">
                                    <div className="font-mono text-xs text-[#e2eaf8]">{log.refugeeID}</div>
                                    <div className="font-mono text-[10px] text-[#3d5278]">{log.address}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-[11px] text-[#7a94bb] flex items-center gap-1.5">
                                    <Clock size={12} className="text-[#3d5278]" />
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="font-mono text-[10px] text-[#3d5278] bg-[#060d1f] px-2 py-1 rounded border border-[#1a2d4a] hidden lg:block">
                                    {log.txHash.slice(0, 10)}...
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

```

---

## File: src/pages/admin/AdminMigrations.jsx

```javascript
import React, { useState } from 'react';
import {
    ArrowLeftRight, ArrowRight, Info, CheckCircle,
    XCircle, Shield, AlertTriangle, Loader2, ChevronRight
} from 'lucide-react';
import { MOCK_MIGRATIONS } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { clsx } from 'clsx';

const AdminMigrations = () => {
    const { showToast } = useToast();
    const [migrations, setMigrations] = useState(MOCK_MIGRATIONS);
    const [processingMig, setProcessingMig] = useState(null);
    const [submitStage, setSubmitStage] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmReject, setConfirmReject] = useState(null);

    const handleApprove = (mig) => {
        setProcessingMig(mig);
        setSubmitStage(1);

        setTimeout(() => setSubmitStage(2), 600);
        setTimeout(() => setSubmitStage(3), 1500);
        setTimeout(() => setSubmitStage(4), 2000);
        setTimeout(() => {
            setSubmitStage(5);
            setTimeout(() => {
                setShowSuccess(true);
            }, 500);
        }, 2500);
    };

    const closeSuccess = () => {
        setMigrations(prev => prev.filter(m => m.id !== processingMig.id));
        setProcessingMig(null);
        setSubmitStage(0);
        setShowSuccess(false);
        showToast('success', 'Migration Approved', 'Wallet update has been recorded on Algorand.');
    };

    const handleReject = (mig) => {
        setMigrations(prev => prev.filter(m => m.id !== mig.id));
        setConfirmReject(null);
        showToast('error', 'Migration Rejected', 'The migration request has been dismissed.');
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8]">Migration Approvals</h2>
                <p className="text-[#7a94bb] mt-1">Review and approve custodial → self-sovereign wallet transfers</p>
            </div>

            {/* Info Box */}
            <div className="bg-[#00c9b108] border border-[#00c9b130] rounded-2xl p-6 flex gap-4 items-start animate-fadeIn">
                <Info className="text-[#00c9b1] shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                    <h4 className="text-[#e2eaf8] font-bold text-sm uppercase tracking-wider">What is wallet migration?</h4>
                    <p className="text-[#7a94bb] text-xs leading-relaxed max-w-2xl">
                        When a refugee with a custodial wallet gets a smartphone, they can claim full control of their identity by migrating to a Pera wallet.
                        Admin approval is required to update the on-chain record for security validation.
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6">
                {migrations.length === 0 ? (
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl py-32 flex flex-col items-center justify-center text-center animate-fadeIn">
                        <ArrowLeftRight size={64} className="text-[#3d5278] mb-6 opacity-20" />
                        <h4 className="text-[#e2eaf8] font-bold text-lg">No pending migration requests</h4>
                        <p className="text-[#7a94bb] text-sm mt-1">All identity transfers have been processed.</p>
                    </div>
                ) : (
                    migrations.map((mig, i) => (
                        <div key={mig.id} style={{ animationDelay: `${i * 100}ms` }} className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl animate-fadeSlideUp group hover:border-[#8b5cf640] transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 flex gap-2">
                                <span className="bg-[#f59e0b10] text-[#f59e0b] text-[10px] font-bold px-2 py-1 rounded border border-[#f59e0b20] uppercase tracking-widest">Pending</span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#1a2d4a] pb-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-[#8b5cf615] border border-[#8b5cf630] text-[#8b5cf6] rounded-2xl flex items-center justify-center font-bold text-lg">
                                        {mig.refugeeName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-[#e2eaf8] font-bold text-xl">{mig.refugeeName}</h3>
                                            <span className="bg-[#152342] text-[#7a94bb] text-[10px] font-bold px-2 py-0.5 rounded uppercase">{mig.camp}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[#3d5278] font-mono text-xs">
                                            <span>ID: {mig.refugeeID}</span>
                                            <span className="w-1 h-1 rounded-full bg-[#3d5278]" />
                                            <span>Requested: {new Date(mig.requestedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Visualization */}
                            <div className="grid lg:grid-cols-[1fr,60px,1fr] items-center gap-6 mb-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[#ef4444] text-[10px] font-bold uppercase tracking-[0.2em]">Custodial Wallet (Retiring)</label>
                                        <span className="bg-[#ef444415] text-[#ef4444] text-[9px] font-bold px-2 py-0.5 rounded border border-[#ef444420] uppercase">Retiring</span>
                                    </div>
                                    <div className="bg-[#060d1f] border border-[#ef444430] rounded-xl p-5 group-hover:bg-[#ef444403] transition-colors">
                                        <div className="font-mono text-gray-500 text-xs break-all leading-relaxed line-through opacity-70 mb-2">
                                            {mig.oldWallet}
                                        </div>
                                        <div className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest">System-controlled entry</div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-1 mt-6">
                                    <ArrowRight className="text-[#8b5cf6] animate-pulse" />
                                    <span className="text-[#3d5278] text-[9px] font-bold uppercase tracking-widest">MIGRATE</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[#00c9b1] text-[10px] font-bold uppercase tracking-[0.2em]">New Pera Wallet</label>
                                        <span className="bg-[#00c9b115] text-[#00c9b1] text-[9px] font-bold px-2 py-0.5 rounded border border-[#00c9b120] uppercase">Self-Sovereign</span>
                                    </div>
                                    <div className="bg-[#00c9b105] border border-[#00c9b130] rounded-xl p-5 group-hover:bg-[#00c9b10a] transition-colors">
                                        <div className="font-mono text-[#00c9b1] text-xs break-all leading-relaxed mb-2 font-bold select-all">
                                            {mig.newWallet}
                                        </div>
                                        <div className="text-[10px] text-[#00c9b1] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1.5">
                                            <Shield size={10} /> Refugee-controlled device
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-[#1a2d4a] pt-6">
                                <button
                                    onClick={() => setConfirmReject(mig)}
                                    className="px-6 py-2.5 border border-[#ef444430] text-[#ef4444] text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#ef444410] transition-colors"
                                >
                                    REJECT
                                </button>
                                <button
                                    onClick={() => handleApprove(mig)}
                                    className="px-10 py-2.5 bg-[#00c9b1] text-[#060d1f] text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#00e0c5] shadow-[0_4px_20px_rgba(0,201,177,0.15)] transition-all active:scale-95"
                                >
                                    APPROVE MIGRATION
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Processing Modal */}
            {processingMig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden text-center">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#8b5cf6]" />

                        {!showSuccess ? (
                            <>
                                <Loader2 className="w-12 h-12 text-[#8b5cf6] animate-spin mx-auto mb-6" />
                                <h3 className="text-[#e2eaf8] text-xl font-bold mb-8">Processing Migration</h3>
                                <div className="space-y-4 text-left">
                                    {[
                                        { label: 'Verifying new wallet signature', done: submitStage >= 1 },
                                        { label: 'Validating identity ownership', done: submitStage >= 2 },
                                        { label: 'Submitting update to Algorand', done: submitStage >= 3, extra: 'tx-2210a...' },
                                        { label: 'Updating database records', done: submitStage >= 4 },
                                        { label: 'Migration complete ✓', done: submitStage >= 5 },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {s.done ? <CheckCircle size={14} className="text-[#00c9b1]" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#1a2d4a] animate-pulse" />}
                                                <span className={clsx("text-xs font-medium", s.done ? "text-[#e2eaf8]" : "text-[#3d5278]")}>{s.label}</span>
                                            </div>
                                            {s.done && s.extra && <span className="font-mono text-[9px] text-[#00c9b1]/60">{s.extra}</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="animate-fadeIn">
                                <div className="w-20 h-20 bg-[#10b98115] rounded-full flex items-center justify-center mx-auto mb-6 text-[#10b981] animate-bounce">
                                    <CheckCircle size={48} strokeWidth={3} />
                                </div>
                                <h3 className="text-white text-2xl font-bold mb-2">Migration Approved</h3>
                                <p className="text-[#7a94bb] text-sm mb-8 leading-relaxed">
                                    Wallet ownership successfully transferred to refugee's personal device on-chain.
                                </p>
                                <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] mb-8">
                                    <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-widest mb-1">New Control Wallet</label>
                                    <div className="font-mono text-[#00c9b1] text-[10px] break-all">{processingMig.newWallet}</div>
                                </div>
                                <button
                                    onClick={closeSuccess}
                                    className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                                >
                                    CLOSE
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Confirmation */}
            {confirmReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp text-center">
                        <div className="w-16 h-16 bg-[#ef444410] rounded-full flex items-center justify-center mx-auto mb-6 text-[#ef4444]">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-white text-xl font-bold mb-4">Reject Migration?</h3>
                        <p className="text-[#7a94bb] text-sm mb-10 leading-relaxed">
                            The refugee will keep their custodial wallet. They will need to submit a new request if this was a mistake.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleReject(confirmReject)}
                                className="w-full py-3 bg-[#ef4444] text-[#060d1f] font-bold rounded-xl hover:bg-[#ff5f5f] transition-all"
                            >
                                CONFIRM REJECTION
                            </button>
                            <button
                                onClick={() => setConfirmReject(null)}
                                className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMigrations;

```

---

## File: src/pages/admin/AdminAudit.jsx

```javascript
import React, { useState } from 'react';
import {
    ClipboardList, Download, ExternalLink, Search,
    Filter, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MOCK_AUDIT_LOG } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { clsx } from 'clsx';

const AdminAudit = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('All');
    const tabs = ['All', 'Registration', 'Aid Issued', 'Consent', 'Migration'];

    const filteredLogs = activeTab === 'All'
        ? MOCK_AUDIT_LOG
        : MOCK_AUDIT_LOG.filter(log => log.type === activeTab);

    const handleExport = () => {
        showToast('info', 'Export Initiated', 'Your CSV export is being prepared for download.');
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8]">Audit Log</h2>
                    <p className="text-[#7a94bb] mt-1">Complete record of all on-chain activity</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#152342] text-white text-[11px] font-bold uppercase tracking-widest rounded-lg border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                >
                    <Download size={14} /> EXPORT CSV
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[#1a2d4a]">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200",
                            activeTab === tab
                                ? "bg-[#8b5cf620] text-[#8b5cf6] border border-[#8b5cf640]"
                                : "text-[#3d5278] hover:text-[#e2eaf8] hover:bg-[#152342]"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Audit Table */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a1428] border-b border-[#1a2d4a]">
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Event Type</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Refugee ID</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Address</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Timestamp (UTC)</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Transaction Hash</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2d4a]">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#152342] transition-colors group">
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight border",
                                            log.type === 'Registration' ? "bg-[#00c9b110] text-[#00c9b1] border-[#00c9b120]" :
                                                log.type === 'Aid Issued' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                                    log.type === 'Consent Approved' ? "bg-[#8b5cf610] text-[#8b5cf6] border-[#8b5cf620]" :
                                                        "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                        )}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="font-mono text-xs text-[#00c9b1] font-bold">{log.refugeeID}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="font-mono text-[11px] text-[#7a94bb]">
                                            {log.address.slice(0, 8)}...{log.address.slice(-4)}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#e2eaf8] text-xs font-semibold">
                                            {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                        </span>
                                        <span className="text-[#3d5278] text-[10px] font-bold ml-2">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <div className="flex items-center gap-2 group/hash cursor-pointer" onClick={() => showToast('info', 'TX Hash', 'Opening block explorer (demo)')}>
                                            <span className="font-mono text-[10px] text-[#3d5278] group-hover/hash:text-[#8b5cf6] transition-colors">
                                                {log.txHash.slice(0, 16)}...
                                            </span>
                                            <ExternalLink size={12} className="text-[#3d5278] group-hover/hash:text-[#8b5cf6] transition-colors" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Simulation */}
                <div className="bg-[#0a1428] border-t border-[#1a2d4a] py-4 px-6 flex items-center justify-between">
                    <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">Showing 1-5 of {filteredLogs.length} events</span>
                    <div className="flex gap-2">
                        <button disabled className="p-2 border border-[#1a2d4a] text-[#3d5278] rounded-lg opacity-40 cursor-not-allowed"><ChevronLeft size={16} /></button>
                        <button disabled className="p-2 border border-[#1a2d4a] text-[#3d5278] rounded-lg opacity-40 cursor-not-allowed"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAudit;

```

---

## File: src/pages/admin/AdminRefugees.jsx

```javascript
import React, { useState } from 'react';
import {
    Users, Search, Filter, ChevronRight, X,
    ShieldCheck, MapPin, Hash, Lock, Copy, CheckCircle
} from 'lucide-react';
import { MOCK_REFUGEES } from '../../utils/mockData';
import { clsx } from 'clsx';

const RefugeeProfileDrawer = ({ refugee, onClose }) => {
    if (!refugee) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-[#0a1428] border-l border-[#1a2d4a] shadow-2xl z-50 animate-slideInRight overflow-y-auto">
            <div className="sticky top-0 bg-[#0a1428/80] backdrop-blur-md p-6 border-b border-[#1a2d4a] flex items-center justify-between z-10">
                <h3 className="text-[#e2eaf8] font-bold uppercase tracking-wider">Identity Profile</h3>
                <button onClick={onClose} className="p-2 hover:bg-[#152342] rounded-lg transition-colors text-[#3d5278] hover:text-[#e2eaf8]">
                    <X size={20} />
                </button>
            </div>

            <div className="p-8 space-y-10">
                {/* Header Profile */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-[#00c9b110] border border-[#00c9b130] rounded-3xl flex items-center justify-center text-[#00c9b1] font-bold text-3xl mb-4">
                        {refugee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h2 className="text-2xl font-bold text-[#e2eaf8]">{refugee.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="bg-[#10b98115] text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded border border-[#10b98120] uppercase tracking-widest leading-none">Verified Identity</span>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                    {[
                        { label: 'Refugee ID', value: refugee.id },
                        { label: 'Nationality', value: refugee.nationality },
                        { label: 'DOB', value: refugee.dob },
                        { label: 'Gender', value: refugee.gender },
                        { label: 'Camp Location', value: refugee.campID },
                        { label: 'Wallet Type', value: refugee.walletType.toUpperCase() },
                        { label: 'Languages', value: refugee.languages.join(', ') },
                        { label: 'Registration', value: new Date(refugee.registeredAt).toLocaleDateString() },
                    ].map((item, i) => (
                        <div key={i} className="space-y-1">
                            <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em]">{item.label}</label>
                            <div className="text-[#e2eaf8] text-sm font-semibold">{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* Hashes Section */}
                <div className="space-y-6 pt-6 border-t border-[#1a2d4a]">
                    <div className="space-y-3">
                        <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em]">Wallet Address</label>
                        <div className="flex items-center gap-3 p-3 bg-[#060d1f] rounded-xl border border-[#1a2d4a]">
                            <span className="font-mono text-[#00c9b1] text-xs truncate flex-1 leading-relaxed">{refugee.walletAddress}</span>
                            <button className="text-[#3d5278] hover:text-[#00c9b1] transition-colors"><Copy size={16} /></button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em]">Global Identity Hash (CID)</label>
                        <div className="flex items-center gap-3 p-3 bg-[#060d1f] rounded-xl border border-[#1a2d4a]">
                            <span className="font-mono text-[#00c9b1] text-xs truncate flex-1 leading-relaxed">{refugee.identityHash}</span>
                            <button className="text-[#3d5278] hover:text-[#00c9b1] transition-colors"><Copy size={16} /></button>
                        </div>
                    </div>
                </div>

                {/* Meta Badge */}
                <div className="bg-[#152342] rounded-2xl p-6 border border-[#1a2d4a]">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck size={20} className="text-[#00c9b1]" />
                        <span className="text-white font-bold text-sm uppercase tracking-wide">Blockchain Integrity</span>
                    </div>
                    <p className="text-[#7a94bb] text-xs leading-relaxed italic">
                        This identity record was anchored to Algorand TestNet block #4,521,894. All biometric liveness proofs are cryptographically verified.
                    </p>
                </div>
            </div>
        </div>
    );
};

const AdminRefugees = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRefugee, setSelectedRefugee] = useState(null);

    const filteredRefugees = MOCK_REFUGEES.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-enter space-y-8 pb-20 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8]">Registered Refugees</h2>
                    <p className="text-[#7a94bb] mt-1">All identity records on the system</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3d5278] group-focus-within:text-[#00c9b1] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or wallet address..."
                        className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl pl-12 pr-6 py-3.5 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] focus:ring-1 focus:ring-[#00c9b120] transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3.5 bg-[#152342] text-white text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#1a2d4a] border border-[#1a2d4a] transition-all">
                    <Filter size={16} /> FILTERS
                </button>
            </div>

            {/* Refugees Table */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a1428] border-b border-[#1a2d4a]">
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Refugee ID</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Name</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Nationality</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Camp</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Wallet Type</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Aid Status</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Registered</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2d4a]">
                            {filteredRefugees.map((refugee) => (
                                <tr
                                    key={refugee.id}
                                    onClick={() => setSelectedRefugee(refugee)}
                                    className="hover:bg-[#152342] transition-colors group cursor-pointer"
                                >
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="font-mono text-xs text-[#00c9b1] font-bold">{refugee.id}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#e2eaf8] text-sm font-semibold">{refugee.name}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#7a94bb] text-sm font-medium">{refugee.nationality}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="bg-[#152342] text-[#7a94bb] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-[#1a2d4a]">{refugee.campID}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border",
                                            refugee.walletType === 'pera' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" : "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                        )}>
                                            {refugee.walletType === 'pera' ? 'Pera' : 'Custodial'}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        {refugee.aidClaimed ? (
                                            <span className="inline-flex items-center gap-1.5 text-[#10b981] text-[10px] font-bold uppercase tracking-widest">
                                                <CheckCircle size={10} /> Claimed
                                            </span>
                                        ) : (
                                            <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">Not Claimed</span>
                                        )}
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#7a94bb] text-[11px] font-medium">{new Date(refugee.registeredAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap text-right">
                                        <div className="p-2 text-[#3d5278] group-hover:text-[#00c9b1] transition-colors inline-block">
                                            <ChevronRight size={20} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Profile Drawer */}
            {selectedRefugee && (
                <div className="fixed inset-0 z-[60]">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedRefugee(null)} />
                    <RefugeeProfileDrawer
                        refugee={selectedRefugee}
                        onClose={() => setSelectedRefugee(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default AdminRefugees;

```

---

## File: src/pages/admin/AdminStatus.jsx

```javascript
import React from 'react';
import {
    Activity, Code, Database, Server,
    RefreshCw, Shield, Zap, Globe
} from 'lucide-react';
import { clsx } from 'clsx';

const StatusCard = ({ title, icon: Icon, badge, items, accentColor }) => (
    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 hover:border-[#8b5cf640] transition-all group relative overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    accentColor === 'green' ? "bg-[#10b98110] border-[#10b98130] text-[#10b981]" :
                        accentColor === 'teal' ? "bg-[#00c9b110] border-[#00c9b130] text-[#00c9b1]" :
                            accentColor === 'blue' ? "bg-[#3b82f610] border-[#3b82f630] text-[#3b82f6]" :
                                "bg-[#8b5cf610] border-[#8b5cf630] text-[#8b5cf6]"
                )}>
                    <Icon size={24} />
                </div>
                <h3 className="text-[#e2eaf8] font-bold text-lg">{title}</h3>
            </div>
            <span className={clsx(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2",
                accentColor === 'green' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                    accentColor === 'teal' ? "bg-[#00c9b110] text-[#00c9b1] border-[#00c9b120]" :
                        accentColor === 'blue' ? "bg-[#3b82f610] text-[#3b82f6] border-[#3b82f620]" :
                            "bg-[#8b5cf610] text-[#8b5cf6] border-[#8b5cf620]"
            )}>
                <div className={clsx(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    accentColor === 'green' ? "bg-[#10b981] shadow-[0_0_8px_#10b981]" :
                        accentColor === 'teal' ? "bg-[#00c9b1] shadow-[0_0_8px_#00c9b1]" :
                            accentColor === 'blue' ? "bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" :
                                "bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]"
                )} />
                {badge}
            </span>
        </div>

        <div className="space-y-4">
            {items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#1a2d4a]/50 last:border-0">
                    <span className="text-[#7a94bb] text-xs font-semibold uppercase tracking-tight">{item.label}</span>
                    <span className="font-mono text-xs text-[#e2eaf8] font-bold">{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

const AdminStatus = () => {
    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8]">System Status</h2>
                <p className="text-[#7a94bb] mt-1">Algorand network and service health indicators</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <StatusCard
                    title="Algorand TestNet"
                    icon={Globe}
                    badge="CONNECTED"
                    accentColor="green"
                    items={[
                        { label: 'Block Height', value: '#4,521,894' },
                        { label: 'Avg Block Time', value: '3.2s' },
                        { label: 'Last Sync', value: '2 mins ago' },
                        { label: 'Network Load', value: '1.4 TPS' },
                    ]}
                />
                <StatusCard
                    title="Smart Contract"
                    icon={Code}
                    badge="DEPLOYED"
                    accentColor="teal"
                    items={[
                        { label: 'Contract ID', value: 'APP-12345678' },
                        { label: 'Logic Version', value: 'v1.2.0' },
                        { label: 'Global State', value: '4 slots' },
                        { label: 'Account State', value: 'Local Ops' },
                    ]}
                />
                <StatusCard
                    title="Database"
                    icon={Database}
                    badge="OPERATIONAL"
                    accentColor="blue"
                    items={[
                        { label: 'Records Total', value: '4,729' },
                        { label: 'Last Backup', value: '1h ago' },
                        { label: 'Storage Used', value: '2.4 GB' },
                        { label: 'IOPS', value: 'Healthy' },
                    ]}
                />
                <StatusCard
                    title="API Services"
                    icon={Server}
                    badge="ALL SYSTEMS GO"
                    accentColor="green"
                    items={[
                        { label: 'Uptime', value: '99.97%' },
                        { label: 'Daily Requests', value: '8,421' },
                        { label: 'Avg Latency', value: '45ms' },
                        { label: 'Error Rate', value: '< 0.01%' },
                    ]}
                />
            </div>

            {/* Performance Audit */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 mt-12 overflow-hidden relative group shadow-2xl animate-fadeSlideUp">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={120} className="text-[#8b5cf6]" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-[#8b5cf610] border border-[#8b5cf630] text-[#8b5cf6] rounded-2xl flex items-center justify-center">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-xl">Auto-Scaling Infrastructure</h3>
                        <p className="text-[#3d5278] text-sm uppercase tracking-[0.2em] font-bold">Resiliency Status: High</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-12 border-t border-[#1a2d4a] pt-10">
                    <div>
                        <h4 className="text-[#e2eaf8] font-bold text-sm mb-2 uppercase">Global CDN</h4>
                        <p className="text-[#7a94bb] text-xs leading-relaxed">Content delivered via 14 edge locations worldwide for minimum latency in field operation centers.</p>
                    </div>
                    <div>
                        <h4 className="text-[#e2eaf8] font-bold text-sm mb-2 uppercase">Encryption</h4>
                        <p className="text-[#7a94bb] text-xs leading-relaxed">AES-256 at-rest and TLS 1.3 in-transit for all identity data. Periodic rotation of security keys enabled.</p>
                    </div>
                    <div>
                        <h4 className="text-[#e2eaf8] font-bold text-sm mb-2 uppercase">Failover</h4>
                        <p className="text-[#7a94bb] text-xs leading-relaxed">Multi-region database replication active. Zero single-point-of-failure architecture verified.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminStatus;

```

---

