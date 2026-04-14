"""
Nexathon FastAPI backend - blockchain integration for RIMS.
"""
import base64
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env from Nexathon directory (parent of backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

from algosdk import util
from algosdk.error import AlgodHTTPError
from algosdk.encoding import decode_address
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
_MIGRATION_REQUESTS_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".migration-requests.json"
_MIGRATION_CHALLENGES_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".migration-challenges.json"

# Challenge TTL (seconds) — reject stale signature approvals
_MIGRATION_CHALLENGE_TTL_S = 10 * 60


def _migration_load() -> list[dict]:
    if not _MIGRATION_REQUESTS_FILE.exists():
        return []
    try:
        return json.loads(_MIGRATION_REQUESTS_FILE.read_text())
    except Exception:
        return []


def _migration_save(rows: list[dict]) -> None:
    _MIGRATION_REQUESTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _MIGRATION_REQUESTS_FILE.write_text(json.dumps(rows, indent=2))


def _migration_challenges_load() -> list[dict]:
    if not _MIGRATION_CHALLENGES_FILE.exists():
        return []
    try:
        return json.loads(_MIGRATION_CHALLENGES_FILE.read_text())
    except Exception:
        return []


def _migration_challenges_save(rows: list[dict]) -> None:
    _MIGRATION_CHALLENGES_FILE.parent.mkdir(parents=True, exist_ok=True)
    _MIGRATION_CHALLENGES_FILE.write_text(json.dumps(rows, indent=2))


def _new_nonce() -> str:
    return uuid.uuid4().hex


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_utc_iso(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _migration_message(identity_id: str, timestamp: str, nonce: str) -> str:
    # STRICT spec message format
    return f"Migrate identity: {identity_id} at {timestamp} with nonce {nonce}"


def _require_algorand_address(addr: str, field: str) -> None:
    try:
        decode_address(addr)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Algorand address for {field}") from e


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
                if data.get("identity_hash") == b"MIGRATED":
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


@app.get("/api/blockchain/migration-message")
def migration_message(identity_id: str, old_wallet: str, new_wallet: str):
    """
    Step 4 — Challenge-response signature (MANDATORY).

    Returns:
      "Migrate identity: <identity_id> at <timestamp> with nonce <random>"
    """
    if not identity_id or not identity_id.strip():
        raise HTTPException(status_code=400, detail="identity_id is required")
    _require_algorand_address(old_wallet, "old_wallet")
    _require_algorand_address(new_wallet, "new_wallet")

    client = _get_client()
    old_state = _read_local_state(client, old_wallet)
    if not old_state:
        raise HTTPException(status_code=400, detail="Old wallet is not registered on-chain")
    if old_state.get("identity_hash") == b"MIGRATED":
        raise HTTPException(status_code=400, detail="Old wallet is already migrated")

    timestamp = _utc_now_iso()
    nonce = _new_nonce()
    message = _migration_message(identity_id.strip(), timestamp, nonce)

    challenges = _migration_challenges_load()
    challenges.append(
        {
            "id": str(uuid.uuid4()),
            "identity_id": identity_id.strip(),
            "old_wallet": old_wallet,
            "new_wallet": new_wallet,
            "timestamp": timestamp,
            "nonce": nonce,
            "message": message,
            "created_at": timestamp,
            "status": "issued",
            "app_id": client.app_id,
        }
    )
    _migration_challenges_save(challenges)

    return {
        "data": {
            "message": message,
            "identity_id": identity_id.strip(),
            "timestamp": timestamp,
            "nonce": nonce,
            "message_b64": base64.b64encode(message.encode()).decode(),
            "app_id": client.app_id,
        }
    }


class MigrationRequestSubmitRequest(BaseModel):
    identity_id: str
    old_wallet: str
    new_wallet: str
    signed_message: str


@app.post("/api/blockchain/migration-request")
def migration_request_submit(body: MigrationRequestSubmitRequest):
    """
    Step 4 backend requirements:
    1) Verify signature using Algorand SDK
    2) Ensure signer == W2
    3) Verify W1 exists and is NOT migrated
    4) Store request as PENDING (file-backed)
    """
    if not body.identity_id or not body.identity_id.strip():
        raise HTTPException(status_code=400, detail="identity_id is required")
    _require_algorand_address(body.old_wallet, "old_wallet")
    _require_algorand_address(body.new_wallet, "new_wallet")

    client = _get_client()
    old_state = _read_local_state(client, body.old_wallet)
    if not old_state:
        raise HTTPException(status_code=400, detail="Old wallet is not registered on-chain")
    if old_state.get("identity_hash") == b"MIGRATED":
        raise HTTPException(status_code=400, detail="Old wallet is already migrated")

    challenges = _migration_challenges_load()
    candidates = [
        c
        for c in challenges
        if c.get("status") == "issued"
        and c.get("identity_id") == body.identity_id.strip()
        and c.get("old_wallet") == body.old_wallet
        and c.get("new_wallet") == body.new_wallet
    ]
    if not candidates:
        raise HTTPException(
            status_code=400,
            detail="No issued migration challenge found. Call /api/blockchain/migration-message and sign the returned message.",
        )
    candidates.sort(key=lambda c: c.get("created_at", ""), reverse=True)
    challenge = candidates[0]

    try:
        created_at = _parse_utc_iso(challenge.get("created_at", ""))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Stored migration challenge is invalid; request a new message") from e
    if (datetime.now(timezone.utc) - created_at).total_seconds() > _MIGRATION_CHALLENGE_TTL_S:
        raise HTTPException(status_code=400, detail="Migration message expired; request a new one and sign again")

    message = challenge.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Stored challenge missing message; request a new one and sign again")

    if not util.verify_bytes(message.encode(), body.signed_message, body.new_wallet):
        raise HTTPException(status_code=400, detail="Invalid signature for new wallet")

    rows = _migration_load()
    if any(
        r.get("oldWallet") == body.old_wallet and r.get("status") == "pending"
        for r in rows
    ):
        raise HTTPException(status_code=400, detail="A pending migration already exists for this custodial wallet")
    req = {
        "id": str(uuid.uuid4()),
        "identity_id": body.identity_id.strip(),
        "refugeeID": body.identity_id.strip(),
        "refugeeName": "Custodial → Pera migration",
        "camp": "On-Chain",
        "oldWallet": body.old_wallet,
        "newWallet": body.new_wallet,
        "requestedAt": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "challenge": {
            "message": message,
            "timestamp": challenge.get("timestamp"),
            "nonce": challenge.get("nonce"),
            "created_at": challenge.get("created_at"),
        },
    }
    rows.append(req)
    _migration_save(rows)

    for c in challenges:
        if c.get("id") == challenge.get("id"):
            c["status"] = "consumed"
            c["consumed_at"] = _utc_now_iso()
            break
    _migration_challenges_save(challenges)

    return {"ok": True, "data": {"id": req["id"]}}


@app.get("/api/blockchain/migration-requests")
def migration_requests_list():
    """Pending wallet migrations for the admin portal."""
    rows = _migration_load()
    out = [r for r in rows if r.get("status") == "pending"]
    return {"success": True, "data": out}


class MigrationIdRequest(BaseModel):
    id: str


@app.post("/api/blockchain/migration-approve")
def migration_approve(body: MigrationIdRequest):
    """Admin executes opt-in check, then on-chain migrate_wallet."""
    rows = _migration_load()
    req = next((r for r in rows if r.get("id") == body.id and r.get("status") == "pending"), None)
    if not req:
        raise HTTPException(status_code=404, detail="Pending migration not found")
    old_wallet = req["oldWallet"]
    new_wallet = req["newWallet"]
    client = _get_client()
    algorand = _get_algorand()
    deployer = algorand.account.from_environment("DEPLOYER")

    old_state = _read_local_state(client, old_wallet)
    if not old_state:
        raise HTTPException(status_code=400, detail="Old wallet is not registered on-chain")
    if old_state.get("identity_hash") == b"MIGRATED":
        raise HTTPException(status_code=400, detail="Old wallet is already migrated")

    try:
        algorand.client.algod.account_application_info(new_wallet, client.app_id)
    except AlgodHTTPError as e:
        if e.code == 404:
            raise HTTPException(
                status_code=400,
                detail="New wallet must opt in to the RefugeeContract app before migration.",
            ) from e
        raise
    client.send.migrate_wallet(
        args=(old_wallet, new_wallet),
        params=algokit_utils.CommonAppCallParams(
            sender=deployer.address,
            signer=deployer.signer,
            account_references=[old_wallet, new_wallet, deployer.address],
        ),
    )
    for r in rows:
        if r.get("id") == body.id:
            r["status"] = "approved"
            r["approved_at"] = datetime.now(timezone.utc).isoformat()
            break
    _migration_save(rows)
    return {"ok": True}


@app.post("/api/blockchain/migration-reject")
def migration_reject(body: MigrationIdRequest):
    rows = _migration_load()
    found = False
    for r in rows:
        if r.get("id") == body.id and r.get("status") == "pending":
            r["status"] = "rejected"
            r["rejected_at"] = datetime.now(timezone.utc).isoformat()
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Pending migration not found")
    _migration_save(rows)
    return {"ok": True}


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
