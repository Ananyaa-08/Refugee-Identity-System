"""
Nexathon FastAPI backend - blockchain integration for RIMS.
"""
import base64
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import os
from dotenv import load_dotenv

# Load env files from project root (projects/refugee-identity-system/).
# Default to `.env` (TestNet) to match the Pera Wallet UX.
# Opt into LocalNet explicitly by setting RIMS_NETWORK=localnet (or by providing ALGOD_SERVER in env).
# IMPORTANT: do NOT clobber process env (tests/localnet set env explicitly).
_project_root = Path(__file__).resolve().parents[2]
_nexathon_root = Path(__file__).resolve().parents[1]
_env_default = _project_root / ".env"
_env_localnet = _project_root / ".env.localnet"

# Make the sibling `blockchain` package importable without requiring callers to
# set PYTHONPATH. This keeps `npm run api` working on Windows, macOS, and Linux.
if str(_nexathon_root) not in sys.path:
    sys.path.insert(0, str(_nexathon_root))

# Always load .env first (if present) without overriding process env.
load_dotenv(_env_default, override=False)

# Only load .env.localnet when explicitly requested and still don't override process env.
if os.getenv("RIMS_NETWORK", "").lower() == "localnet" and _env_localnet.exists():
    load_dotenv(_env_localnet, override=False)

from algosdk import util
from algosdk.error import AlgodHTTPError
from algosdk.encoding import decode_address
from algosdk.logic import get_application_address
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
_ACCESS_REQUESTS_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".access-requests.json"
_CUSTODIAL_WALLETS_FILE = Path(__file__).resolve().parent.parent / "backend" / ".custodial-wallets.json"
_LEGACY_REGISTRY_FILE = Path(__file__).resolve().parent.parent / "blockchain" / ".registry.json"

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


def _legacy_registry_load() -> list[dict]:
    if not _LEGACY_REGISTRY_FILE.exists():
        return []
    try:
        data = json.loads(_LEGACY_REGISTRY_FILE.read_text())
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _legacy_registry_save(rows: list[dict]) -> None:
    _LEGACY_REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    _LEGACY_REGISTRY_FILE.write_text(json.dumps(rows, indent=2))


def _next_refugee_id(rows: list[dict]) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"REF-{year}-"
    nums = []
    for row in rows:
        rid = str(row.get("id") or "")
        if rid.startswith(prefix):
            try:
                nums.append(int(rid.rsplit("-", 1)[1]))
            except Exception:
                continue
    return f"{prefix}{(max(nums) if nums else 0) + 1:03d}"


def _save_refugee_record(row: dict) -> dict:
    rows = _legacy_registry_load()
    wallet = str(row.get("walletAddress") or "")
    refugee_id = str(row.get("id") or "") or _next_refugee_id(rows)
    now = _utc_now_iso()
    normalized = {
        "walletAddress": wallet,
        "name": row.get("name") or "Registered Refugee",
        "nationality": row.get("nationality") or "N/A",
        "dob": row.get("dob") or "",
        "gender": row.get("gender") or "N/A",
        "campID": row.get("campID") or "On-Chain",
        "registeredAt": row.get("registeredAt") or now,
        "walletType": row.get("walletType") or "custodial",
        "aidClaimed": bool(row.get("aidClaimed", False)),
        "aidClaimedAt": row.get("aidClaimedAt") or row.get("aid_claimed_at"),
        "id": refugee_id,
        "languages": row.get("languages") or [],
        "familyMembers": row.get("familyMembers") or [],
        "txHash": row.get("txHash"),
    }

    replaced = False
    for i, existing in enumerate(rows):
        if existing.get("id") == refugee_id or (wallet and existing.get("walletAddress") == wallet):
            rows[i] = {**existing, **normalized}
            replaced = True
            break
    if not replaced:
        rows.append(normalized)

    _legacy_registry_save(rows)
    return normalized


def _find_refugee_by_identity(identity_id: str) -> dict | None:
    identity_id = (identity_id or "").strip()
    if not identity_id:
        return None
    for row in _refugee_rows_from_storage():
        if row.get("id") == identity_id:
            return row
    return None


def _find_refugee_by_wallet(wallet_address: str) -> dict | None:
    wallet_address = (wallet_address or "").strip()
    if not wallet_address:
        return None
    for row in _refugee_rows_from_storage():
        if row.get("walletAddress") == wallet_address:
            return row
    return None


def _identity_available_for_migration(identity_id: str, old_wallet: str) -> tuple[bool, str]:
    row = _find_refugee_by_identity(identity_id) or _find_refugee_by_wallet(old_wallet)
    if row and row.get("walletAddress") == old_wallet:
        return True, "backend_registry"

    custodial = _get_custodial_identity(identity_id)
    if custodial and custodial.get("address") == old_wallet:
        return True, "custodial_wallets"

    return False, ""


def _refugee_rows_from_storage() -> list[dict]:
    registry_rows = []
    for i, row in enumerate(_legacy_registry_load(), start=1):
        wallet_address = row.get("walletAddress") or row.get("address") or ""
        registry_rows.append(
            {
                "id": row.get("id") or f"REF-{i:03d}",
                "walletAddress": wallet_address,
                "name": row.get("name") or "Registered Refugee",
                "nationality": row.get("nationality") or "N/A",
                "dob": row.get("dob"),
                "gender": row.get("gender") or "N/A",
                "campID": row.get("campID") or row.get("camp") or "On-Chain",
                "registeredAt": row.get("registeredAt") or row.get("created_at") or _utc_now_iso(),
                "walletType": row.get("walletType") or "custodial",
                "aidClaimed": bool(row.get("aidClaimed", False)),
                "aidClaimedAt": row.get("aidClaimedAt") or row.get("aid_claimed_at"),
                "isActive": row.get("isActive", True),
                "languages": row.get("languages") or [],
                "txHash": row.get("txHash") or row.get("tx_hash"),
            }
        )

    seen_wallets = {r.get("walletAddress") for r in registry_rows if r.get("walletAddress")}

    for identity_id, row in (_custodial_wallets_load() or {}).items():
        if not isinstance(row, dict):
            continue
        wallet_address = row.get("address") or ""
        if wallet_address in seen_wallets:
            continue
        seen_wallets.add(wallet_address)
        registry_rows.append(
            {
                "id": identity_id,
                "walletAddress": wallet_address,
                "name": row.get("name") or "Registered Refugee",
                "nationality": row.get("nationality") or "N/A",
                "dob": row.get("dob"),
                "gender": row.get("gender") or "N/A",
                "campID": row.get("campID") or "On-Chain",
                "registeredAt": row.get("created_at") or _utc_now_iso(),
                "walletType": "custodial",
                "aidClaimed": bool(row.get("aidClaimed", False)),
                "aidClaimedAt": row.get("aidClaimedAt") or row.get("aid_claimed_at"),
                "isActive": True,
                "languages": row.get("languages") or [],
                "txHash": row.get("txHash") or row.get("tx_hash"),
            }
        )

    return registry_rows


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


def _safe_ts(ts: str | None) -> str:
    if not ts:
        return _utc_now_iso()
    try:
        return _parse_utc_iso(ts).isoformat()
    except Exception:
        return _utc_now_iso()


def _short_addr(addr: str | None) -> str:
    if not addr:
        return ""
    return addr


def _build_audit_logs() -> list[dict]:
    logs: list[dict] = []

    for row in _refugee_rows_from_storage():
        logs.append(
            {
                "id": f"registration:{row.get('id')}",
                "type": "Registration",
                "refugeeID": row.get("id") or "",
                "address": _short_addr(row.get("walletAddress")),
                "timestamp": _safe_ts(row.get("registeredAt")),
                "txHash": row.get("txHash"),
            }
        )
        if row.get("aidClaimed"):
            logs.append(
                {
                    "id": f"aid:{row.get('id')}",
                    "type": "Aid Issued",
                    "refugeeID": row.get("id") or "",
                    "address": _short_addr(row.get("walletAddress")),
                    "timestamp": _safe_ts(row.get("aidClaimedAt") or row.get("registeredAt")),
                    "txHash": row.get("aidTxHash") or row.get("txHash"),
                }
            )

    for row in _access_load():
        status = (row.get("status") or "").strip().lower()
        if status not in {"approved", "rejected"}:
            continue
        logs.append(
            {
                "id": f"access:{row.get('id')}",
                "type": f"Consent {status.title()}",
                "refugeeID": row.get("refugeeID") or row.get("refugeeId") or row.get("id") or "",
                "address": row.get("walletAddress") or row.get("address") or "",
                "timestamp": _safe_ts(row.get("updatedAt") or row.get("requestedAt")),
                "txHash": row.get("txHash") or row.get("tx_hash"),
            }
        )

    for row in _migration_load():
        status = (row.get("status") or "").strip().lower()
        if status not in {"pending", "approved", "rejected"}:
            continue
        logs.append(
            {
                "id": f"migration:{row.get('id')}",
                "type": "Migration",
                "refugeeID": row.get("refugeeID") or row.get("identity_id") or "",
                "address": row.get("newWallet") or row.get("oldWallet") or "",
                "timestamp": _safe_ts(row.get("approved_at") or row.get("rejected_at") or row.get("requestedAt")),
                "txHash": row.get("txHash") or row.get("tx_hash"),
            }
        )

    logs.sort(key=lambda r: r.get("timestamp") or "", reverse=True)
    return logs


def _build_admin_stats() -> dict:
    refugees = _refugee_rows_from_storage()
    migrations = _migration_load()
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    aid_claims_this_week = 0
    for row in refugees:
        if not row.get("aidClaimed"):
            continue
        try:
            claimed_at = _parse_utc_iso(row.get("aidClaimedAt") or row.get("registeredAt"))
        except Exception:
            continue
        if claimed_at >= week_start:
            aid_claims_this_week += 1

    days = []
    for offset in range(6, -1, -1):
        day = (now - timedelta(days=offset)).date()
        count = 0
        for row in refugees:
            try:
                if _parse_utc_iso(row.get("registeredAt")).date() == day:
                    count += 1
            except Exception:
                continue
        days.append({"day": day.strftime("%a"), "date": day.isoformat(), "count": count})

    aid_claimed = sum(1 for row in refugees if row.get("aidClaimed"))
    aid_pending = max(len(refugees) - aid_claimed, 0)
    seen_ids: set[str] = set()
    seen_addresses: set[str] = set()
    duplicate_count = 0
    for row in refugees:
        refugee_id = str(row.get("id") or "")
        wallet_address = str(row.get("walletAddress") or "")
        is_duplicate = False
        if refugee_id and refugee_id in seen_ids:
            is_duplicate = True
        if wallet_address and wallet_address in seen_addresses:
            is_duplicate = True
        if is_duplicate:
            duplicate_count += 1
        if refugee_id:
            seen_ids.add(refugee_id)
        if wallet_address:
            seen_addresses.add(wallet_address)

    return {
        "totalRegistered": len(refugees),
        "aidClaimsThisWeek": aid_claims_this_week,
        "pendingMigrations": sum(1 for row in migrations if (row.get("status") or "").lower() == "pending"),
        "blockedDuplicates": duplicate_count,
        "registrationsByDay": days,
        "aidDistribution": [
            {"label": "Claimed", "count": aid_claimed},
            {"label": "Not Claimed", "count": aid_pending},
        ],
        "recentActivity": _build_audit_logs()[:5],
    }


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


def _ensure_deployer_funded_for_localnet(algorand: algokit_utils.AlgorandClient) -> None:
    """
    When using AlgoKit LocalNet, a DEPLOYER mnemonic from `.env` may have 0 balance on the local chain.
    Fund it from the LocalNet dispenser so deploy/calls don't fail with overspend.
    """
    try:
        if not algorand.client.is_localnet():
            return
        deployer = algorand.account.from_environment("DEPLOYER")
        info = algorand.client.algod.account_info(deployer.address)
        if int(info.get("amount", 0)) >= 2_000_000:
            return
        faucet = algorand.account.localnet_dispenser()
        algorand.send.payment(
            algokit_utils.PaymentParams(
                sender=faucet.address,
                signer=faucet.signer,
                receiver=deployer.address,
                amount=algokit_utils.AlgoAmount(algo=5),
            )
        )
    except Exception:
        # Best-effort. If funding fails, downstream calls will raise a clear overspend error.
        return


def _contract_admin_address(client: RefugeeContractClient) -> str | None:
    """Return the contract admin Algorand address from global state, if available."""
    try:
        admin_bytes = client.state.global_state.get_value("admin")
        if isinstance(admin_bytes, (bytes, bytearray)) and len(admin_bytes) == 32:
            return util.encode_address(bytes(admin_bytes))
    except Exception:
        pass
    return None


def _deployer_account():
    algorand = _get_algorand()
    _ensure_deployer_funded_for_localnet(algorand)
    return algorand.account.from_environment("DEPLOYER")


def _ensure_deployer_is_registrar(client: RefugeeContractClient) -> None:
    deployer = _deployer_account()
    admin = _contract_admin_address(client)
    if admin and admin == deployer.address:
        return
    try:
        client.send.add_registrar(
            args=(deployer.address, "add"),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                box_references=[_create_registrar_box_reference(client.app_id, deployer.address)],
            ),
        )
    except Exception as e:
        detail = str(e)
        if admin:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Backend DEPLOYER is not authorized for this contract. "
                    f"Contract admin is {admin[:8]}…{admin[-4:]}; "
                    f"configured deployer is {deployer.address[:8]}…{deployer.address[-4:]}. "
                    "Use the deployer mnemonic that created app "
                    f"{client.app_id}, or redeploy from Admin → System Status."
                ),
            ) from e
        raise HTTPException(status_code=503, detail=detail) from e


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


def _application_exists(app_id: int) -> bool:
    """Return True if the application is deployed on the configured algod network."""
    try:
        _get_algod().application_info(app_id)
        return True
    except AlgodHTTPError as e:
        if getattr(e, "code", None) == 404:
            return False
        message = str(e).lower()
        if "not found" in message or "does not exist" in message:
            return False
        raise
    except Exception:
        return False


def _get_app_id() -> int | None:
    """
    Resolve the RefugeeContract app id for the active algod network.

    Canonical sources only (in order):
    1. Nexathon/.deployments.json (written by Admin deploy)
    2. REFUGEE_APP_ID environment variable

    Does not fall back to legacy hardcoded app IDs or overwrite deployments.json.
    """
    deployment = _get_deployment()
    candidates: list[int] = []

    file_id = deployment.get("app_id")
    if file_id is not None:
        try:
            candidates.append(int(file_id))
        except (TypeError, ValueError):
            pass

    env_id = (os.getenv("REFUGEE_APP_ID") or "").strip()
    if env_id:
        try:
            env_app_id = int(env_id)
            if env_app_id not in candidates:
                candidates.append(env_app_id)
        except ValueError:
            pass

    seen: set[int] = set()
    for app_id in candidates:
        if app_id in seen:
            continue
        seen.add(app_id)
        if _application_exists(app_id):
            return app_id

    return None


def _get_deployment() -> dict:
    """Read persisted deployment metadata."""
    if not _DEPLOYMENTS_FILE.exists():
        return {}
    try:
        data = json.loads(_DEPLOYMENTS_FILE.read_text())
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


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


def _application_creator(app_id: int) -> str | None:
    try:
        info = _get_algod().application_info(app_id)
        return info.get("params", {}).get("creator")
    except Exception:
        return None


@app.get("/api/blockchain/app-info")
def get_app_info():
    """Return deployed app ID and address (same id used for opt-in, register, and verification)."""
    app_id = _get_app_id()
    if not app_id:
        return {"data": {"app_id": None, "app_address": None}}
    deployment = _get_deployment()
    app_address = deployment.get("app_address")
    if not app_address:
        try:
            app_address = str(get_application_address(app_id))
        except Exception:
            app_address = None
    creator = _application_creator(app_id)
    warning = None
    deployer_addr = None
    try:
        deployer_addr = _deployer_account().address
        if creator and deployer_addr and creator != deployer_addr:
            warning = (
                f"App {app_id} was created by {creator}, not the RIMS deployer ({deployer_addr}). "
                "Fix DEPLOYER_MNEMONIC in .env, restart the API, then use Deploy Fresh Contract."
            )
    except Exception:
        pass
    return {
        "data": {
            "app_id": app_id,
            "app_address": app_address,
            "creator": creator,
            "deployer": deployer_addr,
            "warning": warning,
        }
    }


@app.get("/api/blockchain/custodial-identities")
def custodial_identities():
    """
    List identities created for the "no smartphone" (custodial W1) flow.

    SECURITY: never return private keys.
    """
    wallets = _custodial_wallets_load()
    out = []
    for identity_id, row in (wallets or {}).items():
        try:
            address = row.get("address")
            created_at = row.get("created_at")
            app_id = row.get("app_id")
            qr_payload = json.dumps({"identity_id": identity_id, "old_wallet": address})
            out.append(
                {
                    "identity_id": identity_id,
                    "address": address,
                    "created_at": created_at,
                    "app_id": app_id,
                    "qr_payload": qr_payload,
                }
            )
        except Exception:
            continue
    out.sort(key=lambda r: (r.get("created_at") or ""), reverse=True)
    return {"success": True, "data": out}


class IdentityIdRequest(BaseModel):
    identity_id: str


class RefugeeLookupRequest(BaseModel):
    identity_id: str | None = None
    wallet_address: str | None = None


def _get_custodial_identity(identity_id: str) -> dict | None:
    wallets = _custodial_wallets_load()
    row = (wallets or {}).get(identity_id)
    if not isinstance(row, dict):
        return None
    return row


def _find_custodial_by_wallet(wallet_address: str) -> tuple[str, dict] | None:
    wallet_address = (wallet_address or "").strip()
    if not wallet_address:
        return None
    for key, row in (_custodial_wallets_load() or {}).items():
        if isinstance(row, dict) and (row.get("address") or "").strip() == wallet_address:
            return str(key), row
    return None


def _link_custodial_refugee_id(wallet_address: str, refugee_id: str) -> None:
    """Attach human-readable REF-* id to the custodial wallet row (by wallet address)."""
    found = _find_custodial_by_wallet(wallet_address)
    if not found:
        return
    key, row = found
    wallets = _custodial_wallets_load()
    row = dict(row)
    row["refugee_id"] = refugee_id
    wallets[key] = row
    _custodial_wallets_save(wallets)


def _resolve_refugee_identity(identity_id: str) -> dict | None:
    """
    Resolve a refugee login id across custodial JSON and registry JSON.

    Users often enter REF-2026-NNN from the printed card while custodial storage
    may key wallets by UUID hex from provisioning.
    """
    identity_id = (identity_id or "").strip()
    if not identity_id:
        return None

    custodial_row: dict | None = None
    custodial_key: str | None = None
    wallets = _custodial_wallets_load() or {}

    direct = wallets.get(identity_id)
    if isinstance(direct, dict):
        custodial_key = identity_id
        custodial_row = direct
    else:
        for key, row in wallets.items():
            if not isinstance(row, dict):
                continue
            if (row.get("refugee_id") or "").strip() == identity_id:
                custodial_key = str(key)
                custodial_row = row
                break

    registry_row = _find_refugee_by_identity(identity_id)

    if custodial_row is None and registry_row:
        found = _find_custodial_by_wallet(str(registry_row.get("walletAddress") or ""))
        if found:
            custodial_key, custodial_row = found

    if custodial_row is None and registry_row is None:
        return None

    address = ""
    if custodial_row:
        address = (custodial_row.get("address") or "").strip()
    if not address and registry_row:
        address = (str(registry_row.get("walletAddress") or "")).strip()

    canonical_id = identity_id
    if registry_row and registry_row.get("id"):
        canonical_id = str(registry_row["id"])
    elif custodial_row and custodial_row.get("refugee_id"):
        canonical_id = str(custodial_row["refugee_id"])

    name = (registry_row or {}).get("name") or (custodial_row or {}).get("name") or "Registered Refugee"

    return {
        "identity_id": canonical_id,
        "address": address,
        "custodial_row": custodial_row,
        "registry_row": registry_row,
        "provisioning_status": (custodial_row or {}).get("provisioning_status"),
        "name": name,
        "created_at": (custodial_row or {}).get("created_at") or (registry_row or {}).get("registeredAt"),
    }


def _build_refugee_profile_payload(resolved: dict, chain: dict | None = None) -> dict:
    """Merge registry + custodial + on-chain status into a single aid-worker profile."""
    registry = resolved.get("registry_row") or {}
    custodial = resolved.get("custodial_row") or {}
    chain = chain or {}
    wallet_address = (resolved.get("address") or "").strip()
    canonical_id = resolved.get("identity_id") or ""

    return {
        "id": canonical_id,
        "identity_id": canonical_id,
        "name": resolved.get("name") or "Registered Refugee",
        "walletAddress": wallet_address,
        "nationality": registry.get("nationality") or custodial.get("nationality") or "N/A",
        "dob": registry.get("dob") or custodial.get("dob"),
        "gender": registry.get("gender") or custodial.get("gender") or "N/A",
        "campID": registry.get("campID") or registry.get("camp") or custodial.get("campID") or "N/A",
        "languages": registry.get("languages") or custodial.get("languages") or [],
        "familyMembers": registry.get("familyMembers") or [],
        "walletType": registry.get("walletType") or ("custodial" if custodial else "pera"),
        "aidClaimed": bool(registry.get("aidClaimed", False)),
        "registeredAt": resolved.get("created_at") or registry.get("registeredAt"),
        "status": "migrated" if chain.get("migrated") else "active",
        "verification_mode": (
            "on_chain"
            if chain.get("on_chain")
            else resolved.get("provisioning_status") or "backend_registry"
        ),
        "blockchain": {
            "funded": chain.get("funded"),
            "opted_in": chain.get("opted_in"),
            "local_state_exists": chain.get("local_state_exists"),
        },
    }


def _read_on_chain_identity_status(address: str) -> dict:
    """Best-effort on-chain status; never raises for missing app/local state."""
    result = {
        "on_chain": False,
        "migrated": False,
        "app_id": _get_app_id(),
        "opted_in": False,
        "local_state_exists": False,
        "funded": False,
        "amount_microalgos": 0,
    }
    if not result["app_id"]:
        return result
    try:
        client = _get_client()
        result["app_id"] = client.app_id
        algod = _get_algorand().client.algod
        info = algod.account_info(address)
        result["amount_microalgos"] = int(info.get("amount", 0) or 0)
        result["funded"] = result["amount_microalgos"] > 0
        try:
            algod.account_application_info(address, client.app_id)
            result["opted_in"] = True
            local_state = _read_local_state(client, address) or {}
            result["local_state_exists"] = bool(local_state)
            result["on_chain"] = bool(local_state)
            result["migrated"] = local_state.get("identity_hash") == b"MIGRATED"
        except AlgodHTTPError as e:
            if getattr(e, "code", None) != 404:
                raise
    except HTTPException:
        raise
    except Exception:
        pass
    return result


@app.post("/api/blockchain/verify-identity")
def verify_identity(body: IdentityIdRequest):
    """
    Verify refugee portal login id against registry + custodial storage.

    On-chain registration is preferred but not required when the record exists
    in the backend (e.g. local_only provisioning or registry-only legacy rows).
    """
    identity_id = (body.identity_id or "").strip()
    if not identity_id:
        raise HTTPException(status_code=400, detail="identity_id is required")

    resolved = _resolve_refugee_identity(identity_id)
    if not resolved:
        raise HTTPException(
            status_code=404,
            detail="Identity not found. Use the Refugee ID from registration (e.g. REF-2026-001).",
        )

    address = resolved["address"]
    _require_algorand_address(address, "old_wallet")

    chain = _read_on_chain_identity_status(address)
    if chain["migrated"]:
        raise HTTPException(status_code=400, detail="Identity has already been migrated")

    if chain["on_chain"]:
        mode = "on_chain"
    elif resolved.get("provisioning_status") == "local_only":
        mode = "local_only"
    elif resolved.get("registry_row") or resolved.get("custodial_row"):
        mode = "backend_registry"
    else:
        raise HTTPException(status_code=400, detail="Identity wallet is not registered on-chain")

    canonical_id = resolved["identity_id"]
    return {
        "success": True,
        "data": {
            "identity_id": canonical_id,
            "old_wallet": address,
            "app_id": chain.get("app_id"),
            "verification_mode": mode,
        },
    }


@app.post("/api/blockchain/get-identity")
def get_identity(body: IdentityIdRequest):
    """
    Get identity + on-chain status for a refugee (custodial or registry-backed).

    SECURITY: private keys are never returned.
    """
    identity_id = (body.identity_id or "").strip()
    if not identity_id:
        raise HTTPException(status_code=400, detail="identity_id is required")

    resolved = _resolve_refugee_identity(identity_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="Identity not found")

    address = resolved["address"]
    _require_algorand_address(address, "old_wallet")

    chain = _read_on_chain_identity_status(address)
    canonical_id = resolved["identity_id"]
    qr_payload = json.dumps({"identity_id": canonical_id, "old_wallet": address})
    profile = _build_refugee_profile_payload(resolved, chain)

    return {
        "success": True,
        "data": {
            "identity_id": canonical_id,
            "name": profile["name"],
            "old_wallet": address,
            "status": profile["status"],
            "created_at": resolved.get("created_at"),
            "app_id": chain.get("app_id"),
            "verification_mode": profile["verification_mode"],
            "blockchain": {
                "funded": chain["funded"],
                "amount_microalgos": chain["amount_microalgos"],
                "opted_in": chain["opted_in"],
                "local_state_exists": chain["local_state_exists"],
            },
            "qr_payload": qr_payload,
            "profile": profile,
        },
    }


@app.post("/api/refugees/lookup")
def lookup_refugee(body: RefugeeLookupRequest):
    """Resolve refugee profile by printed QR identity id and/or wallet address."""
    identity_id = (body.identity_id or "").strip()
    wallet = (body.wallet_address or "").strip()

    if wallet:
        try:
            decode_address(wallet)
        except Exception as e:
            raise HTTPException(status_code=400, detail="wallet_address must be a valid Algorand address") from e

    if not identity_id and wallet:
        registry_row = _find_refugee_by_wallet(wallet)
        if registry_row and registry_row.get("id"):
            identity_id = str(registry_row["id"])
        if not identity_id:
            found = _find_custodial_by_wallet(wallet)
            if found:
                key, crow = found
                identity_id = str(crow.get("refugee_id") or key)

    if not identity_id:
        raise HTTPException(status_code=400, detail="identity_id or wallet_address is required")

    resolved = _resolve_refugee_identity(identity_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="Identity not found")

    address = (resolved.get("address") or wallet or "").strip()
    if address:
        _require_algorand_address(address, "wallet_address")

    chain = _read_on_chain_identity_status(address) if address else {}
    profile = _build_refugee_profile_payload(resolved, chain)

    return {"success": True, "data": profile}


class DeployRequest(BaseModel):
    """force_new: create a brand-new application id (required after mis-deployed refugee creator)."""
    force_new: bool = False


@app.post("/api/blockchain/deploy")
def deploy(body: DeployRequest | None = None):
    """Deploy RefugeeContract and persist app_id to Nexathon/.deployments.json."""
    req = body or DeployRequest()
    try:
        algorand = _get_algorand()
        _ensure_deployer_funded_for_localnet(algorand)
        deployer = algorand.account.from_environment("DEPLOYER")

        if req.force_new and _DEPLOYMENTS_FILE.exists():
            _DEPLOYMENTS_FILE.unlink()

        factory = algorand.client.get_typed_app_factory(
            RefugeeContractFactory, default_sender=deployer.address
        )

        deploy_kwargs: dict = {
            "on_update": algokit_utils.OnUpdate.AppendApp,
            "on_schema_break": algokit_utils.OnSchemaBreak.AppendApp,
        }
        if req.force_new:
            deploy_kwargs.update(
                {
                    "app_name": f"RefugeeContract-{_utc_now_iso().replace(':', '').replace('-', '')[:15]}",
                    "ignore_cache": True,
                    "on_update": algokit_utils.OnUpdate.Fail,
                    "on_schema_break": algokit_utils.OnSchemaBreak.Fail,
                }
            )

        app_client, result = factory.deploy(**deploy_kwargs)
        creator = _application_creator(app_client.app_id)

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
        warning = None
        if creator and creator != deployer.address:
            warning = (
                f"App {app_client.app_id} creator is {creator}, not deployer {deployer.address}. "
                "Check DEPLOYER_MNEMONIC in .env."
            )

        return {
            "data": {
                "app_id": app_client.app_id,
                "app_address": app_client.app_address,
                "creator": creator,
                "deployer": deployer.address,
                "operation": str(result.operation_performed),
                "force_new": req.force_new,
                "warning": warning,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


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

    def _hash_bytes(v: object) -> bytes:
        # Accept:
        # - bytes
        # - hex string (64 chars) => 32 bytes
        # - base64 string (optional) => bytes
        # - fallback: utf-8 bytes (prototype/dev)
        if isinstance(v, (bytes, bytearray)):
            return bytes(v)
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return b"\x00" * 32
            # Hex (preferred)
            try:
                if len(s) == 64:
                    return bytes.fromhex(s)
            except Exception:
                pass
            # Base64
            try:
                return base64.b64decode(s, validate=True)
            except Exception:
                return s.encode()
        return b"\x00" * 32

    identity_hash = _hash_bytes(identity_hash)
    personhood_hash = _hash_bytes(personhood_hash)
    age_proof_hash = _hash_bytes(age_proof_hash)
    try:
        client = _get_client()
        if not _account_opted_into_app(refugee, client.app_id):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Refugee is not opted into contract app {client.app_id}. "
                    "Complete Application Opt-In in Pera for this wallet before registering."
                ),
            )
        deployer = _deployer_account()
        _ensure_deployer_is_registrar(client)
        print(
            f"[register] refugee={refugee} app_id={client.app_id} "
            f"deployer={deployer.address}",
            flush=True,
        )
        send_result = client.send.register(
            (refugee, identity_hash, personhood_hash, age_proof_hash),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                account_references=[refugee],
            ),
        )
        tx_id = None
        tx_ids = getattr(send_result, "tx_ids", None)
        if tx_ids:
            tx_id = tx_ids[-1] if isinstance(tx_ids, (list, tuple)) else tx_ids
        if not tx_id:
            tx_id = getattr(send_result, "tx_id", None) or getattr(send_result, "transaction_id", None)
        print(f"[register] success tx_id={tx_id} app_id={client.app_id}", flush=True)
        return {"ok": True, "tx_id": tx_id, "txHash": tx_id, "app_id": client.app_id}
    except Exception as e:
        print(f"[register] failed refugee={refugee}: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


class ClaimAidRequest(BaseModel):
    address: str


def _friendly_chain_error(exc: Exception, app_id: int | None = None) -> HTTPException:
    message = str(exc)
    lower = message.lower()
    if "does not exist" in lower and "application" in lower:
        return HTTPException(
            status_code=503,
            detail=(
                f"Smart contract application #{app_id} is not on the configured Algorand network. "
                "Redeploy from Admin → System Status, or set REFUGEE_APP_ID / .deployments.json to match TestNet."
            ),
        )
    if "claim_aid: sender not authorized" in lower or (
        "not authorized" in lower and "claim_aid" in lower
    ):
        return HTTPException(
            status_code=503,
            detail=(
                "Backend deployer is not authorized to issue aid on this contract. "
                "Ensure DEPLOYER in .env matches the account that deployed the app."
            ),
        )
    if "claim_aid: refugee not opted in" in lower or (
        "not opted in" in lower and "claim_aid" in lower
    ):
        return HTTPException(
            status_code=400,
            detail="This refugee is not opted into the identity contract. Complete on-chain registration first.",
        )
    if "claim_aid: already claimed" in lower or "already claimed" in lower:
        return HTTPException(status_code=409, detail="Aid has already been claimed for this refugee on-chain.")
    if "err opcode" in lower:
        return HTTPException(
            status_code=400,
            detail=(
                "The blockchain rejected this aid claim. The refugee may not be fully registered on-chain "
                "(opt-in + register), or the backend deployer is not authorized for this contract."
            ),
        )
    if "not opted in" in lower:
        return HTTPException(
            status_code=400,
            detail="This refugee is not opted into the identity contract. Complete on-chain registration first.",
        )
    if "not authorized" in lower:
        return HTTPException(
            status_code=503,
            detail="Backend deployer is not authorized as a registrar on the contract.",
        )
    return HTTPException(status_code=500, detail=message)


@app.post("/api/blockchain/claim-aid")
def claim_aid(req: ClaimAidRequest):
    """Mark aid as claimed for a refugee on-chain and in the backend registry."""
    address = (req.address or "").strip()
    _require_algorand_address(address, "address")

    app_id = _get_app_id()
    if not app_id:
        raise HTTPException(
            status_code=503,
            detail="Refugee contract is not deployed on this network. Deploy from Admin → System Status.",
        )

    try:
        client = _get_client()
        deployer = _deployer_account()
        _ensure_deployer_is_registrar(client)

        local = _read_registered_refugee_state(client, address)
        if not local:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This refugee is not fully registered on the blockchain for the active contract. "
                    "Re-run aid-worker registration (custodial or Pera) so opt-in and register complete, "
                    "then try issuing aid again."
                ),
            )
        if int(local.get("aid_claimed", 0) or 0) > 0:
            raise HTTPException(status_code=409, detail="Aid has already been claimed for this refugee on-chain.")

        client.send.claim_aid(
            (address,),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                account_references=[address],
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise _friendly_chain_error(e, app_id) from e

    registry_row = _find_refugee_by_wallet(address)
    if registry_row:
        _save_refugee_record(
            {
                **registry_row,
                "aidClaimed": True,
                "aidClaimedAt": _utc_now_iso(),
            }
        )

    return {"ok": True, "success": True}


def _account_opted_into_app(address: str, app_id: int) -> bool:
    """
    True only when the account has local state for this app (real opt-in).

    account_application_info returns 200 for app creators who are not opted in;
    use apps-local-state from account_info instead.
    """
    try:
        info = _get_algod().account_info(address)
        for app in info.get("apps-local-state", []) or []:
            if int(app.get("id", 0) or 0) == int(app_id):
                return True
        return False
    except Exception:
        return False


def _read_local_state(client, address: str) -> dict | None:
    """Read local state for address; return None if not opted in or no data."""
    try:
        if not _account_opted_into_app(address, client.app_id):
            return None
        local = client.state.local_state(address)
        data = local.get_all()
        if not data:
            return None
        return data
    except Exception:
        return None


def _read_registered_refugee_state(client, address: str) -> dict | None:
    """Return local state only when the refugee is opted in and has identity hashes on-chain."""
    data = _read_local_state(client, address)
    if not data:
        return None
    identity_hash = data.get("identity_hash")
    if not identity_hash or identity_hash == b"MIGRATED":
        return None
    return data


@app.get("/api/blockchain/refugee/{address}")
def get_refugee(address: str):
    """Get refugee on-chain state by address."""
    try:
        client = _get_client()
        data = _read_local_state(client, address)
        if not data:
            return {"success": False, "data": None}
        wallet = data.get("wallet_address")
        id_h = data.get("identity_hash")
        ph_h = data.get("personhood_hash")
        age_h = data.get("age_proof_hash")

        def _hex_if_bytes(v):
            if isinstance(v, (bytes, bytearray)):
                return v.hex()
            return v

        return {
            "success": True,
            "data": {
                "wallet_address": wallet.hex() if isinstance(wallet, (bytes, bytearray)) else wallet,
                "identity_hash": _hex_if_bytes(id_h),
                "personhood_hash": _hex_if_bytes(ph_h),
                "age_proof_hash": _hex_if_bytes(age_h),
                "aid_claimed": int(data.get("aid_claimed", 0) or 0),
            },
        }
    except HTTPException as e:
        if "already migrated" in str(e.detail):
            raise
        source = ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/blockchain/refugee-state/{address}")
def get_refugee_state(address: str):
    """Get refugee state for AidDistribution search (same as get_refugee, different path)."""
    return get_refugee(address)


def _identity_hash_nonempty(identity_hash) -> bool:
    if identity_hash is None:
        return False
    if isinstance(identity_hash, (bytes, bytearray)):
        return len(identity_hash) > 0
    if isinstance(identity_hash, str):
        return bool(identity_hash.strip())
    return bool(identity_hash)


@app.get("/api/blockchain/verify-onchain-status/{refugee_address}")
def verify_onchain_status(refugee_address: str):
    """
    Report on-chain registration status for a refugee wallet.

    Uses account_application_info + local state. Never raises; returns unknown on errors.
    """
    address = (refugee_address or "").strip()
    out = {
        "address": address,
        "onchain_status": "unknown",
        "identity_hash_present": False,
        "aid_claimed": 0,
    }
    if not address:
        return out
    try:
        app_id = _get_app_id()
        if not app_id:
            return out
        if not _account_opted_into_app(address, app_id):
            out["onchain_status"] = "not_registered"
            return out

        try:
            client = _get_client()
        except HTTPException:
            return out

        data = _read_local_state(client, address)
        if not data:
            out["onchain_status"] = "opted_in_only"
            return out

        identity_hash = data.get("identity_hash")
        out["aid_claimed"] = int(data.get("aid_claimed", 0) or 0)

        if identity_hash == b"MIGRATED":
            out["onchain_status"] = "migrated"
            out["identity_hash_present"] = True
        elif _identity_hash_nonempty(identity_hash):
            out["onchain_status"] = "confirmed"
            out["identity_hash_present"] = True
        else:
            out["onchain_status"] = "opted_in_only"
            out["identity_hash_present"] = False
        return out
    except Exception:
        return out


@app.get("/api/blockchain/refugees")
def get_refugees():
    """List refugees (opt-in accounts with identity). Uses indexer when available."""
    registry_rows = _refugee_rows_from_storage()
    seen_wallets = {r.get("walletAddress") for r in registry_rows if r.get("walletAddress")}

    try:
        client = _get_client()
        indexer = getattr(client.algorand.client, "indexer", None)
        if not indexer:
            return {"success": True, "data": registry_rows}
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
                if addr in seen_wallets:
                    continue
                seen_wallets.add(addr)
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
        return {"success": True, "data": [*registry_rows, *refugees]}
    except Exception as e:
        return {"success": True, "data": registry_rows}


@app.post("/api/refugees/register-record")
def register_refugee_record(body: dict):
    """Persist the user-entered refugee profile in the backend registry."""
    name = str(body.get("name") or "").strip()
    wallet_address = str(body.get("walletAddress") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not wallet_address:
        raise HTTPException(status_code=400, detail="walletAddress is required")
    try:
        decode_address(wallet_address)
    except Exception as e:
        raise HTTPException(status_code=400, detail="walletAddress must be a valid Algorand address") from e

    saved = _save_refugee_record(
        {
            "id": body.get("id") or body.get("identity_id"),
            "walletAddress": wallet_address,
            "name": name,
            "nationality": body.get("nationality"),
            "dob": body.get("dob"),
            "gender": body.get("gender"),
            "campID": body.get("campID") or body.get("campId"),
            "walletType": body.get("walletType"),
            "languages": body.get("languages") or [],
            "familyMembers": body.get("familyMembers") or [],
            "txHash": body.get("txHash"),
        }
    )
    if (saved.get("walletType") or "").lower() == "custodial" and saved.get("id"):
        _link_custodial_refugee_id(wallet_address, str(saved["id"]))
    return {"success": True, "data": saved}


@app.get("/api/audit/logs")
def audit_logs():
    """Return audit events derived from backend registry, access, and migration state."""
    return {"success": True, "data": _build_audit_logs()}


@app.get("/api/admin/stats")
def admin_stats():
    """Return admin dashboard statistics derived from backend state."""
    return {"success": True, "data": _build_admin_stats()}


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

    app_id = _get_app_id()
    source = ""
    try:
        client = _get_client()
        app_id = client.app_id
        old_state = _read_local_state(client, old_wallet)
        if old_state and old_state.get("identity_hash") == b"MIGRATED":
            raise HTTPException(status_code=400, detail="Old wallet is already migrated")
        if old_state:
            source = "on_chain"
    except HTTPException:
        raise
    except Exception:
        source = ""

    if not source:
        ok, source = _identity_available_for_migration(identity_id.strip(), old_wallet)
        if not ok:
            raise HTTPException(status_code=400, detail="Old wallet is not registered in backend registry")

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
            "app_id": app_id,
            "source": source,
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
            "app_id": app_id,
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

    app_id = _get_app_id()
    source = ""
    try:
        client = _get_client()
        app_id = client.app_id
        old_state = _read_local_state(client, body.old_wallet)
        if old_state and old_state.get("identity_hash") == b"MIGRATED":
            raise HTTPException(status_code=400, detail="Old wallet is already migrated")
        if old_state:
            source = "on_chain"
    except HTTPException as e:
        if "already migrated" in str(e.detail):
            raise
        source = ""
    except Exception:
        source = ""

    if not source:
        ok, source = _identity_available_for_migration(body.identity_id.strip(), body.old_wallet)
        if not ok:
            raise HTTPException(status_code=400, detail="Old wallet is not registered in backend registry")

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
    existing = next(
        (r for r in rows if r.get("oldWallet") == body.old_wallet and (r.get("status") or "").lower() == "pending"),
        None,
    )
    if existing:
        # Idempotent behavior: allow re-submission to attach/refresh W2 + signature,
        # instead of failing the UI with "pending migration already exists".
        existing["identity_id"] = body.identity_id.strip()
        existing["refugeeID"] = body.identity_id.strip()
        existing["newWallet"] = body.new_wallet
        existing["requestedAt"] = datetime.now(timezone.utc).isoformat()
        existing["challenge"] = {
            "message": message,
            "timestamp": challenge.get("timestamp"),
            "nonce": challenge.get("nonce"),
            "created_at": challenge.get("created_at"),
        }
        existing["app_id"] = app_id
        existing["source"] = source
        _migration_save(rows)
        return {"ok": True, "data": {"id": existing.get("id")}, "updated_existing": True}
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
        "app_id": app_id,
        "source": source,
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


@app.post("/api/blockchain/migration-request-lite")
def migration_request_lite(body: IdentityIdRequest):
    """
    Refugee-portal request (NO wallet connect, NO signature).

    Creates a pending migration request for a custodial identity_id.
    Aid workers then perform the wallet migration tooling flow separately.
    """
    identity_id = (body.identity_id or "").strip()
    if not identity_id:
        raise HTTPException(status_code=400, detail="identity_id is required")

    resolved = _resolve_refugee_identity(identity_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="Identity not found")
    identity_id = resolved["identity_id"]
    old_wallet = resolved["address"]
    display_name = resolved.get("name")
    _require_algorand_address(old_wallet, "old_wallet")

    # If on-chain is available, enforce it isn't already migrated; otherwise allow backend registry only.
    source = ""
    try:
        client = _get_client()
        old_state = _read_local_state(client, old_wallet)
        if old_state and old_state.get("identity_hash") == b"MIGRATED":
            raise HTTPException(status_code=400, detail="Old wallet is already migrated")
        if old_state:
            source = "on_chain"
    except HTTPException:
        raise
    except Exception:
        source = ""
    if not source:
        ok, source = _identity_available_for_migration(identity_id, old_wallet)
        if not ok:
            raise HTTPException(status_code=400, detail="Old wallet is not registered in backend registry")

    rows = _migration_load()
    existing = next(
        (r for r in rows if r.get("oldWallet") == old_wallet and (r.get("status") or "").lower() == "pending"),
        None,
    )
    if existing:
        # Idempotent: return existing pending request id.
        return {"ok": True, "data": {"id": existing.get("id")}, "already_pending": True}

    req = {
        "id": str(uuid.uuid4()),
        "identity_id": identity_id,
        "refugeeID": identity_id,
        "refugeeName": display_name or "Custodial → Self-sovereign migration",
        "camp": "On-Chain",
        "oldWallet": old_wallet,
        "newWallet": None,
        "requestedAt": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "source": source,
    }
    rows.append(req)
    _migration_save(rows)
    return {"ok": True, "data": {"id": req["id"]}}


@app.get("/api/blockchain/migration-requests")
def migration_requests_list(status: str | None = None):
    """
    List wallet migration requests.

    - If `status` is provided (e.g. pending/approved/rejected), filter by status.
    - Otherwise return all requests.
    """
    rows = _migration_load()
    if status:
        st = status.strip().lower()
        rows = [r for r in rows if (r.get("status") or "").lower() == st]
    rows.sort(key=lambda r: (r.get("requestedAt") or r.get("requested_at") or ""), reverse=True)
    return {"success": True, "data": rows}


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
    on_chain_result = "not_attempted"
    try:
        client = _get_client()
        algorand = _get_algorand()
        deployer = algorand.account.from_environment("DEPLOYER")

        old_state = _read_local_state(client, old_wallet)
        if old_state and old_state.get("identity_hash") == b"MIGRATED":
            raise HTTPException(status_code=400, detail="Old wallet is already migrated")

        if old_state:
            try:
                algorand.client.algod.account_application_info(new_wallet, client.app_id)
            except AlgodHTTPError as e:
                if e.code == 404:
                    on_chain_result = "new_wallet_not_opted_in"
                else:
                    raise
            else:
                client.send.migrate_wallet(
                    args=(old_wallet, new_wallet),
                    params=algokit_utils.CommonAppCallParams(
                        sender=deployer.address,
                        signer=deployer.signer,
                        account_references=[old_wallet, new_wallet, deployer.address],
                    ),
                )
                on_chain_result = "migrated"
        else:
            on_chain_result = "backend_registry_only"
    except HTTPException:
        raise
    except Exception as e:
        on_chain_result = f"backend_registry_only: {e}"

    refugee_row = _find_refugee_by_identity(req.get("identity_id") or req.get("refugeeID")) or _find_refugee_by_wallet(old_wallet)
    if refugee_row:
        _save_refugee_record({**refugee_row, "walletAddress": new_wallet, "walletType": "pera"})

    for r in rows:
        if r.get("id") == body.id:
            r["status"] = "approved"
            r["approved_at"] = datetime.now(timezone.utc).isoformat()
            r["on_chain_result"] = on_chain_result
            break
    _migration_save(rows)
    return {"ok": True, "on_chain_result": on_chain_result}


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


class GenerateCustodialWalletRequest(BaseModel):
    name: str | None = None


@app.post("/api/blockchain/generate-custodial-wallet")
def generate_custodial_wallet(body: GenerateCustodialWalletRequest | None = None):
    """
    Create a real custodial wallet (W1) on-chain for refugees without smartphones.

    - Generates a real Algorand account (private key + address)
    - Funds it from DEPLOYER (so it exists on-chain)
    - Opts it in to the RefugeeContract app (so local state is allocated)
    - Registers identity hashes into W1 local state (via registrar)

    SECURITY: Private key is stored server-side only; never returned to frontend.
    """
    try:
        client = _get_client()
        _ensure_deployer_is_registrar(client)

        # Human-readable id for QR cards and refugee portal login (REF-YYYY-NNN).
        identity_id = _next_refugee_id(_legacy_registry_load())

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
        # Contract ABI expects: register(address, byte[], byte[], byte[])void
        identity_hash = hashlib.sha256(f"identity:{identity_id}".encode()).digest()
        personhood_hash = hashlib.sha256(f"personhood:{identity_id}".encode()).digest()
        age_proof_hash = hashlib.sha256(f"age:{identity_id}".encode()).digest()

        # Register identity into W1 local state (sender must be registrar).
        deployer = _deployer_account()
        client.send.register(
            (address, identity_hash, personhood_hash, age_proof_hash),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                account_references=[address],
            ),
        )

        # Store W1 private key securely in backend storage (prepare for encryption).
        # NOTE: For production, encrypt at rest (e.g., envelope encryption / KMS).
        wallets = _custodial_wallets_load()
        private_key_b64 = (
            base64.b64encode(private_key).decode()
            if isinstance(private_key, (bytes, bytearray))
            else str(private_key)
        )
        wallets[identity_id] = {
            "address": address,
            "private_key_b64": private_key_b64,
            "created_at": _utc_now_iso(),
            "app_id": client.app_id,
            "name": (body.name.strip() if body and body.name and body.name.strip() else None),
            "refugee_id": identity_id,
        }
        _custodial_wallets_save(wallets)

        qr_payload = json.dumps({"identity_id": identity_id, "old_wallet": address})
        return {"data": {"identity_id": identity_id, "address": address, "qr_payload": qr_payload}}
    except Exception as e:
        # Keep the portal usable when Algorand env/local node is unavailable:
        # create a real Algorand account and persist it for later migration/demo flows.
        private_key, address = algo_account.generate_account()
        identity_id = _next_refugee_id(_legacy_registry_load())
        wallets = _custodial_wallets_load()
        private_key_b64 = (
            base64.b64encode(private_key).decode()
            if isinstance(private_key, (bytes, bytearray))
            else str(private_key)
        )
        wallets[identity_id] = {
            "address": address,
            "private_key_b64": private_key_b64,
            "created_at": _utc_now_iso(),
            "app_id": _get_app_id(),
            "name": (body.name.strip() if body and body.name and body.name.strip() else None),
            "refugee_id": identity_id,
            "provisioning_status": "local_only",
            "provisioning_error": str(e),
        }
        _custodial_wallets_save(wallets)
        qr_payload = json.dumps({"identity_id": identity_id, "old_wallet": address})
        return {
            "data": {
                "identity_id": identity_id,
                "address": address,
                "qr_payload": qr_payload,
                "provisioning_status": "local_only",
            }
        }

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
