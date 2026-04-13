# Nexathon Blockchain Integration

The blockchain layer (Algorand smart contracts) is integrated into Nexathon at `blockchain/`.

## Structure

```
Nexathon/
├── blockchain/           # Algorand smart contracts
│   ├── refugee_contract/ # Refugee identity contract
│   ├── artifacts/       # Compiled TEAL + generated Python clients
│   └── blockchain_utils.py  # Backend-callable utilities
├── backend/              # FastAPI API server
│   └── main.py           # API routes, imports from blockchain
└── src/                  # React frontend
    └── utils/api.js      # API client for blockchain routes
```

## Quick Start

1. **Start LocalNet:** `algokit localnet start`
2. **Set DEPLOYER** in `.env` (or use default LocalNet wallet)
3. **Start backend:** `npm run api` (from Nexathon) or `poetry run uvicorn Nexathon.backend.main:app --port 8000`
4. **Start frontend:** `npm run dev`
5. **Deploy contract:** Admin → System Status → Deploy Contract
6. **Register refugees:** Aid Worker → Register (use real Algorand addresses)
7. **Claim aid:** Aid Worker → Aid Distribution

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/testBlockchain | Test integration, returns contract metadata |
| GET | /api/blockchain/app-info | Deployed app ID and address |
| POST | /api/blockchain/deploy | Deploy contract + add deployer as registrar |
| POST | /api/blockchain/add-registrar | Admin adds aid worker address |
| POST | /api/blockchain/register | Register refugee with identity hashes |
| POST | /api/blockchain/claim-aid | Mark aid as claimed for refugee |
| GET | /api/blockchain/refugee/{address} | Read refugee on-chain state |

## Frontend Integration

- **Admin Status:** Deploy contract, add registrars
- **Register:** Calls `/api/blockchain/register` on submit (refugee must be opted in first)
- **Aid Distribution:** Calls `/api/blockchain/claim-aid` when issuing aid

**Note:** Mock refugee addresses in `mockData.js` are placeholders. For real blockchain flow, use addresses from LocalNet (e.g. from `algokit localnet explore` or funded test accounts). Refugees must opt-in to the contract before registration.

## Building Contracts

From the project root:

```bash
PYTHONPATH=Nexathon poetry run python -m blockchain build
```
