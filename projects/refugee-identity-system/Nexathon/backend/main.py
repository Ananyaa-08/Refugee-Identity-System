"""
Nexathon FastAPI backend - blockchain integration for RIMS.
"""
from pathlib import Path

from dotenv import load_dotenv

# Load .env from Nexathon directory (parent of backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from blockchain.artifacts.refugee_contract.refugee_contract_client import (
    RefugeeContractClient,
    RefugeeContractFactory,
)
import algokit_utils

app = FastAPI(title="RIMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persist app_id after deploy - stored in Nexathon dir
_DEPLOYMENTS_FILE = Path(__file__).resolve().parent.parent / ".deployments.json"


def _get_algorand():
    return algokit_utils.AlgorandClient.from_environment()


def _get_app_id() -> int | None:
    """Read persisted app_id from deployments file."""
    import json
    if not _DEPLOYMENTS_FILE.exists():
        return None
    try:
        data = json.loads(_DEPLOYMENTS_FILE.read_text())
        return data.get("app_id")
    except Exception:
        return None


def _save_deployment(app_id: int, app_address: str):
    import json
    _DEPLOYMENTS_FILE.write_text(json.dumps({"app_id": app_id, "app_address": app_address}))


def _get_client() -> RefugeeContractClient:
    """Get RefugeeContractClient for the deployed app."""
    app_id = _get_app_id()
    if not app_id:
        raise HTTPException(status_code=503, detail="Contract not deployed. Deploy from Admin → System Status.")
    algorand = _get_algorand()
    deployer = algorand.account.from_environment("DEPLOYER")
    return RefugeeContractClient(
        algorand=algorand,
        app_id=app_id,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )


@app.get("/api/testBlockchain")
def test_blockchain():
    """Health check for blockchain integration."""
    app_id = _get_app_id()
    return {
        "ok": True,
        "contract_deployed": app_id is not None,
        "app_id": app_id,
    }


@app.get("/api/blockchain/app-info")
def get_app_info():
    """Return deployed app ID and address."""
    app_id = _get_app_id()
    if not app_id:
        return {"data": {"app_id": None, "app_address": None}}
    try:
        client = _get_client()
        return {"data": {"app_id": client.app_id, "app_address": client.app_address}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/blockchain/deploy")
def deploy():
    """Deploy RefugeeContract and persist app_id."""
    try:
        algorand = _get_algorand()
        deployer = algorand.account.from_environment("DEPLOYER")
        factory = algorand.client.get_typed_app_factory(
            RefugeeContractFactory, default_sender=deployer.address
        )
        app_client, result = factory.deploy(
            on_update=algokit_utils.OnUpdate.AppendApp,
            on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        )
        if result.operation_performed in [
            algokit_utils.OperationPerformed.Create,
            algokit_utils.OperationPerformed.Replace,
        ]:
            algorand.send.payment(
                algokit_utils.PaymentParams(
                    amount=algokit_utils.AlgoAmount(algo=1),
                    sender=deployer.address,
                    receiver=app_client.app_address,
                )
            )
        _save_deployment(app_client.app_id, app_client.app_address)
        return {"data": {"app_id": app_client.app_id, "app_address": app_client.app_address}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AddRegistrarRequest(BaseModel):
    address: str


@app.post("/api/blockchain/add-registrar")
def add_registrar(req: AddRegistrarRequest):
    """Add a registrar (aid worker) address."""
    address = req.address
    try:
        client = _get_client()
        client.send.add_registrar((address, "add"))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/blockchain/register")
def register(body: dict):
    """Register a refugee with identity hashes."""
    refugee = body.get("refugee")
    identity_hash = body.get("identity_hash", b"")
    personhood_hash = body.get("personhood_hash", b"")
    age_proof_hash = body.get("age_proof_hash", b"")
    if not refugee:
        raise HTTPException(status_code=400, detail="refugee address required")
    # Ensure bytes
    if isinstance(identity_hash, str):
        identity_hash = identity_hash.encode() if identity_hash else b"\x00" * 32
    if isinstance(personhood_hash, str):
        personhood_hash = personhood_hash.encode() if personhood_hash else b"\x00" * 32
    if isinstance(age_proof_hash, str):
        age_proof_hash = age_proof_hash.encode() if age_proof_hash else b"\x00" * 32
    try:
        client = _get_client()
        client.send.register((refugee, identity_hash, personhood_hash, age_proof_hash))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ClaimAidRequest(BaseModel):
    address: str


@app.post("/api/blockchain/claim-aid")
def claim_aid(req: ClaimAidRequest):
    """Mark aid as claimed for a refugee."""
    address = req.address
    try:
        client = _get_client()
        client.send.claim_aid((address,))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _read_local_state(client, address: str) -> dict | None:
    """Read local state for address; return None if not opted in or no identity."""
    try:
        local = client.state.local_state(address)
        data = local.get_all()
        if not data or not data.get("identity_hash"):
            return None
        return data
    except Exception:
        return None


@app.get("/api/blockchain/refugee/{address}")
def get_refugee(address: str):
    """Get refugee on-chain state by address."""
    try:
        client = _get_client()
        data = _read_local_state(client, address)
        if not data:
            return {"success": False, "data": None}
        return {
            "success": True,
            "data": {
                "wallet_address": data.get("wallet_address", b"").hex() if data.get("wallet_address") else None,
                "identity_hash": data.get("identity_hash", b"").hex() if data.get("identity_hash") else None,
                "personhood_hash": data.get("personhood_hash", b"").hex() if data.get("personhood_hash") else None,
                "age_proof_hash": data.get("age_proof_hash", b"").hex() if data.get("age_proof_hash") else None,
                "aid_claimed": data.get("aid_claimed", 0),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/blockchain/refugee-state/{address}")
def get_refugee_state(address: str):
    """Get refugee state for AidDistribution search (same as get_refugee, different path)."""
    return get_refugee(address)


@app.get("/api/blockchain/refugees")
def get_refugees():
    """List refugees (opt-in accounts with identity). Uses indexer when available."""
    try:
        client = _get_client()
        indexer = getattr(client.algorand.client, "indexer", None)
        if not indexer:
            return {"success": True, "data": []}
        app_id = client.app_id
        try:
            resp = indexer.lookup_accounts_by_application(app_id)
        except AttributeError:
            resp = indexer.accounts(application_id=app_id)
        accounts = resp.get("accounts", []) if isinstance(resp, dict) else getattr(resp, "accounts", []) or []
        refugees = []
        for acc_info in (accounts if isinstance(accounts, list) else []):
            addr = acc_info.get("address") if isinstance(acc_info, dict) else getattr(acc_info, "address", None)
            if not addr:
                continue
            try:
                local = client.state.local_state(addr)
                data = local.get_all()
                if not data or not data.get("identity_hash"):
                    continue
                refugees.append({
                    "id": data.get("identity_hash", b"").hex()[:16] if data.get("identity_hash") else "?",
                    "walletAddress": addr,
                    "name": "Registered Refugee",
                    "campID": "On-Chain",
                    "nationality": "N/A",
                    "aidClaimed": bool(data.get("aid_claimed", 0)),
                    "walletType": "pera",
                    "registeredAt": "2024-01-01",
                })
            except Exception:
                continue
        return {"success": True, "data": refugees}
    except Exception as e:
        return {"success": True, "data": []}


@app.post("/api/blockchain/generate-custodial-wallet")
def generate_custodial_wallet():
    """Generate a new custodial wallet (account) for refugees without smartphones."""
    try:
        algorand = _get_algorand()
        account = algorand.account.random()
        return {
            "address": account.address,
            "mnemonic": account.mnemonic,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
