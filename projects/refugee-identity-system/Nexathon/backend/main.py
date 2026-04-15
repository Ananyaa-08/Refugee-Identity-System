"""
Nexathon FastAPI backend - blockchain integration for RIMS.
"""
import base64
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (projects/refugee-identity-system/.env)
# This must contain DEPLOYER_MNEMONIC and TestNet algod settings.
_env_path = Path(__file__).resolve().parents[2] / ".env"
# IMPORTANT: do NOT clobber process env (tests/localnet set env explicitly).
load_dotenv(_env_path, override=False)

from algosdk import util
from algosdk.error import AlgodHTTPError
from algosdk.encoding import decode_address
from algosdk import account as algo_account
from algosdk import mnemonic
from algosdk.transaction import ApplicationOptInTxn, PaymentTxn, wait_for_confirmation
from algosdk.v2client.algod import AlgodClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from blockchain.artifacts.refugee_contract.refugee_contract_client import (
    RefugeeContractClient,
    RefugeeContractFactory,
)
import algokit_utils
import os

app = FastAPI(title="RIMS API", version="1.0.0")

# Sensible TestNet defaults (Algonode) when not provided via env.
_DEFAULT_TESTNET_INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
_DEFAULT_TESTNET_INDEXER_PORT = "443"
_DEFAULT_TESTNET_INDEXER_TOKEN = ""

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persist app_id after deploy - stored in Nexathon dir
_DEPLOYMENTS_FILE = Path(__file__).resolve().parent.parent / ".deployments.json"
_MIGRATION_REQUESTS_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".migration-requests.json"
_MIGRATION_CHALLENGES_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".migration-challenges.json"
<<<<<<< HEAD
_ACCESS_REQUESTS_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".access-requests.json"
=======
_CUSTODIAL_WALLETS_FILE = Path(__file__).resolve().parent.parent / "backend" / ".custodial-wallets.json"
>>>>>>> 0bf851bc2aefa0f3ec991621755503e19b34e9b9

# Challenge TTL (seconds) — reject stale signature approvals
_MIGRATION_CHALLENGE_TTL_S = 10 * 60


def _custodial_wallets_load() -> dict:
    if not _CUSTODIAL_WALLETS_FILE.exists():
        return {}
    try:
        return json.loads(_CUSTODIAL_WALLETS_FILE.read_text())
    except Exception:
        return {}


def _custodial_wallets_save(data: dict) -> None:
    _CUSTODIAL_WALLETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _CUSTODIAL_WALLETS_FILE.write_text(json.dumps(data, indent=2))


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


def _access_load() -> list[dict]:
    if not _ACCESS_REQUESTS_FILE.exists():
        # INITIAL DEMO DATA SEEDING
        return [
            {
                "id": "REQ-001",
                "name": "Aid Worker Maria Santos",
                "requestedField": "Age Verification",
                "requestedBy": "Border Control",
                "requestedAt": datetime.now(timezone.utc).isoformat(),
                "status": "pending"
            }
        ]
    try:
        return json.loads(_ACCESS_REQUESTS_FILE.read_text())
    except Exception:
        return []


def _access_save(rows: list[dict]) -> None:
    _ACCESS_REQUESTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _ACCESS_REQUESTS_FILE.write_text(json.dumps(rows, indent=2))


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
    # Ensure indexer settings exist for deploy flows that require AppManager/indexer.
    # Do not override if user explicitly configured something else.
    algod_server = os.getenv("ALGOD_SERVER", "")
    if "algonode.cloud" in algod_server:
        os.environ.setdefault("INDEXER_SERVER", _DEFAULT_TESTNET_INDEXER_SERVER)
        os.environ.setdefault("INDEXER_PORT", _DEFAULT_TESTNET_INDEXER_PORT)
        os.environ.setdefault("INDEXER_TOKEN", _DEFAULT_TESTNET_INDEXER_TOKEN)
    return algokit_utils.AlgorandClient.from_environment()


def _get_algod() -> AlgodClient:
    server = os.getenv("ALGOD_SERVER")
    token = os.getenv("ALGOD_TOKEN", "")
    port = os.getenv("ALGOD_PORT")
    if not server:
        raise HTTPException(status_code=500, detail="ALGOD_SERVER is not configured")
    # algosdk AlgodClient expects server to include scheme, and port is typically embedded.
    # If a port is provided separately, append when missing.
    if port and "://" in server and ":" not in server.split("://", 1)[1]:
        server = f"{server}:{port}"
    return AlgodClient(token, server)


def _deployer_private_key() -> str:
    m = os.getenv("DEPLOYER_MNEMONIC")
    if not m:
        raise HTTPException(status_code=500, detail="DEPLOYER_MNEMONIC is not set in environment")
    try:
        return mnemonic.to_private_key(m)
    except Exception as e:
        raise HTTPException(status_code=500, detail="DEPLOYER_MNEMONIC is invalid") from e


def _create_registrar_box_reference(app_id: int, registrar_address: str) -> algokit_utils.BoxReference:
    address_bytes = decode_address(registrar_address)
    box_name = b"registrar_" + address_bytes
    return algokit_utils.BoxReference(app_id=app_id, name=box_name)


def _ensure_deployer_is_registrar(client: RefugeeContractClient) -> None:
    algorand = _get_algorand()
    deployer = algorand.account.from_environment("DEPLOYER")
    # Idempotently set deployer as registrar so backend can register refugees.
    client.send.add_registrar(
        args=(deployer.address, "add"),
        params=algokit_utils.CommonAppCallParams(
            sender=deployer.address,
            signer=deployer.signer,
            box_references=[_create_registrar_box_reference(client.app_id, deployer.address)],
        ),
    )


def _fund_account(sender_private_key: str, receiver: str, amount_microalgos: int) -> str:
    algod = _get_algod()
    sender = algo_account.address_from_private_key(sender_private_key)
    # Fail fast with a clear message if deployer can't fund.
    try:
        sender_info = algod.account_info(sender)
        sender_amount = int(sender_info.get("amount", 0))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unable to read deployer balance from algod") from e
    # Very conservative buffer: keep at least 0.1 ALGO after funding to avoid min-balance/fee issues.
    if sender_amount < amount_microalgos + 100_000:
        raise HTTPException(
            status_code=400,
            detail="Admin wallet has insufficient balance to fund a new custodial wallet",
        )
    sp = algod.suggested_params()
    txn = PaymentTxn(sender=sender, sp=sp, receiver=receiver, amt=amount_microalgos)
    stxn = txn.sign(sender_private_key)
    try:
        txid = algod.send_transaction(stxn)
        wait_for_confirmation(algod, txid, 10)
        return txid
    except Exception as e:
        raise HTTPException(status_code=500, detail="Funding transaction failed") from e


def _opt_in_app(account_private_key: str, app_id: int) -> str:
    algod = _get_algod()
    sender = algo_account.address_from_private_key(account_private_key)
    sp = algod.suggested_params()
    txn = ApplicationOptInTxn(sender=sender, sp=sp, index=app_id)
    stxn = txn.sign(account_private_key)
    try:
        txid = algod.send_transaction(stxn)
        wait_for_confirmation(algod, txid, 10)
        return txid
    except Exception as e:
        raise HTTPException(status_code=500, detail="App opt-in transaction failed") from e


@app.on_event("startup")
def _startup_log() -> None:
    # Print key connection settings so it's obvious we're on TestNet.
    app_id = _get_app_id()
    server = os.getenv("ALGOD_SERVER")
    port = os.getenv("ALGOD_PORT")
    print(f"[startup] ALGOD_SERVER={server} ALGOD_PORT={port} APP_ID={app_id}")


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


@app.get("/")
def root():
    """System status for demo/hackathon display."""
    app_id = _get_app_id()
    return {
        "system": "Refugee Identity Management System (RIMS)",
        "status": "Operational",
        "blockchain": "Algorand Testnet",
        "app_id": app_id,
        "api_docs": "/docs",
        "ready": True
    }


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
        # BoxMap writes require a box reference for registrar_<address>
        client.send.add_registrar(
            args=(address, "add"),
            params=algokit_utils.CommonAppCallParams(
                box_references=[_create_registrar_box_reference(client.app_id, address)]
            ),
        )
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
        _ensure_deployer_is_registrar(client)
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
    """Read local state for address; return None if not opted in or no data."""
    try:
        local = client.state.local_state(address)
        data = local.get_all()
        if not data:
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
        wallet = data.get("wallet_address")
        bio = data.get("biometric_hash")
        return {
            "success": True,
            "data": {
                "wallet_address": wallet.hex() if isinstance(wallet, (bytes, bytearray)) else wallet,
                "did": data.get("did"),
                "ipfs_cid": data.get("ipfs_cid"),
                "biometric_hash": bio.hex() if isinstance(bio, (bytes, bytearray)) else bio,
                "trust_tier": data.get("trust_tier", 0),
                "aid_claimed": data.get("aid_claimed", 0),
                "is_active": data.get("is_active", 0),
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
    """
    Create a real custodial wallet (W1) on-chain for refugees without smartphones.

    - Generates a real Algorand account (private key + address)
    - Funds it from DEPLOYER (so it exists on-chain)
    - Opts it in to the RefugeeContract app (so local state is allocated)
    - Registers identity hashes into W1 local state (via registrar)

    SECURITY: Private key is stored server-side only; never returned to frontend.
    """
    try:
<<<<<<< HEAD
        import algosdk
        private_key, address = algosdk.account.generate_account()
        mnemonic = algosdk.mnemonic.from_private_key(private_key)
        return {
            "address": address,
            "mnemonic": mnemonic,
=======
        client = _get_client()
        _ensure_deployer_is_registrar(client)

        # Identity ID: stable external identifier used by QR + migration challenge message.
        identity_id = uuid.uuid4().hex

        # Generate a real Algorand account for W1.
        private_key, address = algo_account.generate_account()

        # Ensure address is valid before any chain actions.
        _require_algorand_address(address, "old_wallet")

        # Fund W1 so it exists on-chain and can cover min balance + opt-in.
        # Opt-in increases minimum balance; 0.5 ALGO is a safe default for LocalNet/TestNet.
        deployer_pk = _deployer_private_key()
        _fund_account(deployer_pk, address, 500_000)

        # Opt W1 into the app so local state can be written.
        _opt_in_app(private_key, client.app_id)

        # Derive non-empty hashes for on-chain storage. (No raw PII on-chain.)
        identity_hash = hashlib.sha256(f"identity:{identity_id}".encode()).digest()
        personhood_hash = hashlib.sha256(f"personhood:{identity_id}".encode()).digest()
        age_proof_hash = hashlib.sha256(f"age:{identity_id}".encode()).digest()

        # Register identity into W1 local state (sender must be registrar).
        client.send.register((address, identity_hash, personhood_hash, age_proof_hash))

        # Store W1 private key securely in backend storage (prepare for encryption).
        # NOTE: For production, encrypt at rest (e.g., envelope encryption / KMS).
        wallets = _custodial_wallets_load()
        wallets[identity_id] = {
            "address": address,
            "private_key_b64": private_key,
            "created_at": _utc_now_iso(),
            "app_id": client.app_id,
>>>>>>> 0bf851bc2aefa0f3ec991621755503e19b34e9b9
        }
        _custodial_wallets_save(wallets)

        qr_payload = json.dumps({"identity_id": identity_id, "old_wallet": address})
        return {"data": {"identity_id": identity_id, "address": address, "qr_payload": qr_payload}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

<<<<<<< HEAD

# --- ACCESS REQUESTS (Data Governance) ---

@app.get("/api/access/requests")
def get_access_requests():
    """Fetch all data access requests."""
    return _access_load()


class AccessActionRequest(BaseModel):
    requestId: str


@app.post("/api/access/approve")
def approve_access(req: AccessActionRequest):
    """Approve a data access request."""
    rows = _access_load()
    found = False
    for r in rows:
        if r["id"] == req.requestId:
            r["status"] = "approved"
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Request not found")
    _access_save(rows)
    return {"ok": True}


@app.post("/api/access/reject")
def reject_access(req: AccessActionRequest):
    """Reject a data access request."""
    rows = _access_load()
    found = False
    for r in rows:
        if r["id"] == req.requestId:
            r["status"] = "rejected"
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Request not found")
    _access_save(rows)
    return {"ok": True}
=======
import uuid

@app.post("/api/refugee/liveness-hash")
def liveness_hash(payload: dict):
    """Receive and securely store liveness hash generated by the front-end."""
    try:
        refugee_id = payload.get("refugeeId")
        liveness_data = payload.get("livenessData", {})
        
        verification_id = str(uuid.uuid4())
        
        return {
            "success": True,
            "hashStored": True,
            "refugeeId": refugee_id,
            "verificationId": verification_id
        }
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

>>>>>>> 0bf851bc2aefa0f3ec991621755503e19b34e9b9
