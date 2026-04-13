# RIMS (Refugee Identity Management System) Technical Overview

## 1. System Architecture
RIMS is built on a decentralized, trustless architecture designed for high-stakes humanitarian operations.
- **Frontend**: React (Vite) v18 with TailwindCSS for a humanitarian-grade utilitarian UI.
- **Backend**: Node.js & Express.js serving as the orchestration layer and data bridge.
- **Blockchain**: Algorand (via Pera Wallet) used as the immutable identity anchor. All identity commitments, access grants, and aid claims are signed and verified on-chain.
- **Database**: MongoDB for scalable metadata storage and request history synchronization.

## 2. Portal Workflow (The Golden Path)
1. **Refugee Registration**: Refugee undergoes biometric liveness detection (simulated) and is provisioned with a custodial-to-self-sovereign wallet path.
2. **Access Request**: Aid Workers initiate data access requests for specific fields (e.g., nationality, health records).
3. **Multi-Sig Consent**: The Refugee Portal receives the request via dynamic polling. The Refugee must then authorize the request through a Pera Multi-Sig biometric challenge.
4. **Aid Issuance**: Once verified, Aid Workers authorize aid distribution. The claim is recorded on the Algorand ledger to prevent duplication.

## 3. Full-Stack Integration & Connectivity
- **Ngrok Tunnels**: The frontend communicates with the backend via Ngrok-exposed endpoints.
- **Header Bypass**: All fetch calls include the `"ngrok-skip-browser-warning": "69420"` header to bypass the interim warning page.
- **Real-Time Polling**: The Refugee Portal employs a 10-second `setInterval` to poll the `/access/requests` endpoint, ensuring that new requests appear instantly without page refreshes.

## 4. Portal Interconnectivity
Sync is achieved through:
- **Shared Backend Layer**: Both portals communicate with the same Express API and MongoDB instance.
- **Algorand Ledger**: Serves as the single source of truth for identity verification and aid status.
- **LocalStorage Mapping**: Used to track the active `walletAddress` session across different sections of the portal, ensuring data is tailored to the logged-in user.

## 5. Key Security Features
- **Pera Multi-Sig Challenge**: Implements a biometric/PIN-based authorization step for all data governance actions.
- **Double-Claim Prevention**: The `POST /aid/claim` call verifies on-chain records before authorizing distribution, returning 400/403 errors if a duplicate is detected.
- **Biometric Liveness**: Integrated into the registration flow to ensure identity uniqueness.

## 6. Technical Blueprint: Session Management
LocalStorage serves as the primary session handler for the demo:
- `walletAddress`: Tracks the currently active user context.
- `demo_account`: Maintains session persistence for Pera Wallet connections and demo-mode fallbacks.
The system automatically matches requests and aid status based on these keys during every state update.
