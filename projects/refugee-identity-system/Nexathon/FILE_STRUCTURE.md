# RIMS Project File Structure

Below is the complete file structure of the RIMS (Refugee Identity Management System) frontend project.

```text
rims-frontend/
├── resources/
│   ├── TECHNICAL_OVERVIEW.md      # Full architectural guide
│   ├── PROJECT_CODE.md            # Consolidated source code (Sync in progress)
│   └── walkthrough.md             # Project walkthrough documentation
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.jsx    # Dashboard layout for Admin role
│   │   │   ├── AidWorkerLayout.jsx # Dashboard layout for Aid Worker
│   │   │   ├── Navbar.jsx         # Global navigation component
│   │   │   ├── RefugeeLayout.jsx  # Dashboard layout for Refugee role
│   │   │   └── Sidebar.jsx        # Role-based sidebar navigation
│   │   └── ui/
│   │       └── Common.jsx         # Shared UI components (Spinners, Buttons)
│   ├── context/
│   │   ├── ToastContext.jsx       # Global notification system
│   │   └── WalletContext.jsx      # Blockchain wallet session state
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminAudit.jsx     # Blockchain activity ledger
│   │   │   ├── AdminDashboard.jsx  # System health & global stats
│   │   │   ├── AdminMigrations.jsx # Pera wallet migration approvals
│   │   │   ├── AdminRefugees.jsx   # Global identity registry management
│   │   │   └── AdminStatus.jsx     # Node/Backend connection status
│   │   ├── aid-worker/
│   │   │   ├── AidDistribution.jsx # Hardware-integrated aid issuance
│   │   │   ├── Register.jsx        # Biometric identity provision (Webcam)
│   │   │   ├── RequestAccess.jsx   # Data field authorization requests
│   │   │   ├── ScanQR.jsx          # Live identity verification (Scanner)
│   │   │   └── SearchRefugee.jsx   # Local registry search
│   │   ├── refugee/
│   │   │   ├── AccessRequests.jsx  # Multi-sig consent management
│   │   │   ├── RefugeeDashboard.jsx # Identity wallet overview
│   │   │   └── WalletMigration.jsx  # SSI sovereignty wizard
│   │   └── LoginPage.jsx           # Role-based portal entry
│   ├── utils/
│   │   ├── mockData.js             # Demo fallback data
│   │   └── wallet.js               # Algorand utility functions
│   ├── App.jsx                     # Central routing & providers
│   ├── index.css                   # Global styles & glassmorphism
│   └── main.jsx                    # React entry point
├── index.html                      # HTML root template
├── package.json                    # Dependencies & scripts
├── tailwind.config.js              # Custom design tokens
└── vite.config.js                  # Build configuration
```

### Key Components Summary
- **Sovereignty Flow**: Located in `src/pages/refugee/WalletMigration.jsx`.
- **Hardware Layer**: Managed in `Register.jsx` (Webcam) and `ScanQR.jsx` (Scanner).
- **Backend Sync**: All files in `src/pages/` utilize the `VITE_API_BASE_URL` for real-time data exchange.
