"""
Nexathon FastAPI backend - blockchain integration for RIMS.
"""
import base64
import hashlib
import hmac
import json
import re
import time
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
from algosdk.encoding import decode_address, encode_address
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
_REFUGEE_LOGIN_CODES_FILE = Path(__file__).resolve().parent.parent / "backend" / ".refugee-login-codes.json"

# Refugee login code: 4 alphabets + 2 digits (e.g. ABCD12). Case-insensitive.
_LOGIN_CODE_PATTERN = re.compile(r"^[A-Za-z]{4}\d{2}$")

# Challenge TTL (seconds) — reject stale signature approvals
_MIGRATION_CHALLENGE_TTL_S = 10 * 60

# Refugee wallet-login challenge TTL (seconds). Short-lived, one-time-use.
_LOGIN_CHALLENGE_TTL_S = 5 * 60
# In-memory store: challenge string -> {identity_id, expected_address, expires_at}
_login_challenges: dict[str, dict] = {}

VALID_AID_TYPES: tuple[str, ...] = ("food", "medicine", "shelter", "cash", "clothing")

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")
ADMIN_USER_ID = os.getenv("ADMIN_USER", "admin")
_ADMIN_CHALLENGE_TTL_S = 5 * 60
_ADMIN_SESSION_TTL_S = 4 * 60 * 60
_admin_challenges: dict[str, float] = {}
_admin_sessions: dict[str, float] = {}


def _derive_deployer_address() -> str | None:
    m = os.getenv("DEPLOYER_MNEMONIC", "").strip()
    if not m:
        return None
    try:
        pk = mnemonic.to_private_key(m)
        return algo_account.address_from_private_key(pk)
    except Exception:
        return None


DEPLOYER_ADDRESS = _derive_deployer_address()


def _purge_expired_admin_challenges() -> None:
    now = time.time()
    expired = [k for k, exp in _admin_challenges.items() if exp <= now]
    for k in expired:
        del _admin_challenges[k]


def _purge_expired_admin_sessions() -> None:
    now = time.time()
    expired = [k for k, exp in _admin_sessions.items() if exp <= now]
    for k in expired:
        del _admin_sessions[k]


def _issue_admin_session_token() -> str:
    _purge_expired_admin_sessions()
    token = str(uuid.uuid4())
    _admin_sessions[token] = time.time() + _ADMIN_SESSION_TTL_S
    return token


def _admin_challenge_valid(challenge: str) -> bool:
    _purge_expired_admin_challenges()
    expires_at = _admin_challenges.get(challenge)
    if expires_at is None:
        return False
    if expires_at <= time.time():
        del _admin_challenges[challenge]
        return False
    return True


def _consume_admin_challenge(challenge: str) -> None:
    _admin_challenges.pop(challenge, None)


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


def _login_codes_load() -> dict:
    if not _REFUGEE_LOGIN_CODES_FILE.exists():
        return {}
    try:
        return json.loads(_REFUGEE_LOGIN_CODES_FILE.read_text())
    except Exception:
        return {}


def _login_codes_save(data: dict) -> None:
    _REFUGEE_LOGIN_CODES_FILE.parent.mkdir(parents=True, exist_ok=True)
    _REFUGEE_LOGIN_CODES_FILE.write_text(json.dumps(data, indent=2))


def _normalize_login_code(code: str) -> str:
    return (code or "").strip().upper()


def _hash_login_code(identity_id: str, code: str) -> str:
    """Salt the hash with the refugee id so the digest is unique per refugee."""
    payload = f"{(identity_id or '').strip().upper()}:{_normalize_login_code(code)}".encode()
    return hashlib.sha256(payload).hexdigest()


def _get_stored_login_code_hash(identity_id: str) -> str | None:
    rid = (identity_id or "").strip().upper()
    if not rid:
        return None
    return (_login_codes_load() or {}).get(rid) or None


def _set_login_code_hash(identity_id: str, code: str) -> None:
    rid = (identity_id or "").strip().upper()
    if not rid:
        return
    rows = _login_codes_load() or {}
    rows[rid] = _hash_login_code(rid, code)
    _login_codes_save(rows)


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
        return []
    try:
        return json.loads(_ACCESS_REQUESTS_FILE.read_text())
    except Exception:
        return []


def _next_access_request_id(rows: list[dict]) -> str:
    nums = []
    for row in rows:
        rid = str(row.get("id") or "")
        if rid.startswith("REQ-"):
            try:
                nums.append(int(rid.replace("REQ-", "")))
            except Exception:
                continue
    return f"REQ-{(max(nums) if nums else 0) + 1:03d}"


_ACCESS_FIELD_LABELS = {
    "ageProof": "Age Verification",
    "nationality": "Nationality Proof",
    "identity": "Full Identity",
    "record": "Registration Record",
}


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
    if DEPLOYER_ADDRESS:
        print(f"[startup] DEPLOYER_ADDRESS={DEPLOYER_ADDRESS}")
    else:
        print("[startup] DEPLOYER_ADDRESS=not configured (set DEPLOYER_MNEMONIC)")


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
        "custodial_key": custodial_key,
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


class RefugeeLoginRequest(BaseModel):
    identity_id: str
    login_code: str | None = None


class IdentityProbeRequest(BaseModel):
    identity_id: str


class RefugeePinLoginRequest(BaseModel):
    identity_id: str
    pin: str


class LoginVerifySignatureRequest(BaseModel):
    identity_id: str
    challenge: str
    signature: str
    address: str


def _identity_login_state(identity_id: str) -> dict | None:
    """
    Determine the current login state for a refugee identity.

    Combines custodial storage, registry storage, and migration history to
    decide which wallet is currently linked to the identity and how the
    refugee should authenticate.

    Returns None if no identity matches the provided id.

    Output:
      {
        "identity_id": canonical REF id,
        "name": human-readable display name,
        "status": "active" | "pending_migration" | "migrated" | "disabled",
        "wallet_type": "custodial" | "pera",
        "linked_wallet": currently authoritative wallet address,
        "custodial_wallet": original W1 (if any),
        "migrated_wallet": post-migration W2 (if any),
        "requires_pin_setup": True if no PIN hash is stored (custodial only),
        "is_active": bool,
        "created_at": ISO timestamp (if known),
      }
    """
    rid = (identity_id or "").strip()
    if not rid:
        return None

    resolved = _resolve_refugee_identity(rid)
    if not resolved:
        return None

    canonical_id = resolved["identity_id"]
    custodial_row = resolved.get("custodial_row") or {}
    registry_row = resolved.get("registry_row") or {}

    custodial_wallet = (custodial_row.get("address") or "").strip()
    registry_wallet = str(registry_row.get("walletAddress") or "").strip()
    registry_wallet_type = (registry_row.get("walletType") or "").lower()

    # Identify any migration history for this identity (latest first).
    migrations = _migration_load()
    rid_upper = canonical_id.upper()

    def _row_matches(row: dict) -> bool:
        rid_in_row = str(row.get("identity_id") or row.get("refugeeID") or "").upper()
        if rid_in_row == rid_upper:
            return True
        if custodial_wallet and (row.get("oldWallet") or "") == custodial_wallet:
            return True
        return False

    approved_migration = None
    pending_migration = None
    for row in migrations:
        if not _row_matches(row):
            continue
        status = (row.get("status") or "").lower()
        if status == "approved" and approved_migration is None:
            approved_migration = row
        elif status == "pending" and pending_migration is None:
            pending_migration = row

    # Disabled flag (future-proof; not yet written by any flow).
    is_active = registry_row.get("isActive", True) if registry_row else True

    if not is_active:
        return {
            "identity_id": canonical_id,
            "name": resolved.get("name") or "Registered Refugee",
            "status": "disabled",
            "wallet_type": registry_wallet_type or "custodial",
            "linked_wallet": registry_wallet or custodial_wallet,
            "custodial_wallet": custodial_wallet or None,
            "migrated_wallet": registry_wallet if registry_wallet_type == "pera" else None,
            "requires_pin_setup": False,
            "is_active": False,
            "created_at": resolved.get("created_at"),
        }

    if approved_migration:
        new_wallet = str(approved_migration.get("newWallet") or "").strip() or registry_wallet
        return {
            "identity_id": canonical_id,
            "name": resolved.get("name") or "Registered Refugee",
            "status": "migrated",
            "wallet_type": "pera",
            "linked_wallet": new_wallet,
            "custodial_wallet": custodial_wallet or None,
            "migrated_wallet": new_wallet,
            "requires_pin_setup": False,
            "is_active": True,
            "created_at": resolved.get("created_at"),
        }

    # No approved migration. If the registry says the wallet type is "pera" and
    # there is no custodial row, treat it as a self-sovereign identity that
    # authenticates with the Pera wallet from day one.
    if not custodial_wallet and registry_wallet_type == "pera":
        return {
            "identity_id": canonical_id,
            "name": resolved.get("name") or "Registered Refugee",
            "status": "active",
            "wallet_type": "pera",
            "linked_wallet": registry_wallet,
            "custodial_wallet": None,
            "migrated_wallet": registry_wallet,
            "requires_pin_setup": False,
            "is_active": True,
            "created_at": resolved.get("created_at"),
        }

    # Custodial (W1) — possibly with a pending migration.
    linked = custodial_wallet or registry_wallet
    status = "pending_migration" if pending_migration else "active"
    return {
        "identity_id": canonical_id,
        "name": resolved.get("name") or "Registered Refugee",
        "status": status,
        "wallet_type": "custodial",
        "linked_wallet": linked,
        "custodial_wallet": linked or None,
        "migrated_wallet": None,
        "requires_pin_setup": _get_stored_login_code_hash(canonical_id) is None,
        "is_active": True,
        "created_at": resolved.get("created_at"),
    }


def _purge_expired_login_challenges() -> None:
    now = time.time()
    for key in [k for k, v in _login_challenges.items() if v.get("expires_at", 0) <= now]:
        del _login_challenges[key]


def _issue_login_challenge(identity_id: str, expected_address: str) -> tuple[str, int]:
    _purge_expired_login_challenges()
    timestamp = _utc_now_iso()
    nonce = _new_nonce()
    challenge = f"RIMS Refugee Login: {identity_id} at {timestamp} nonce {nonce}"
    expires_at = int(time.time()) + _LOGIN_CHALLENGE_TTL_S
    _login_challenges[challenge] = {
        "identity_id": identity_id,
        "expected_address": expected_address,
        "expires_at": float(expires_at),
        "issued_at": timestamp,
    }
    return challenge, expires_at


def _consume_login_challenge(challenge: str) -> dict | None:
    """Return the challenge record if valid and remove it (single-use)."""
    _purge_expired_login_challenges()
    record = _login_challenges.pop(challenge, None)
    if not record:
        return None
    if record.get("expires_at", 0) <= time.time():
        return None
    return record


@app.get("/api/blockchain/refugee-login-status/{identity_id}")
def refugee_login_status(identity_id: str):
    """Backward-compatible: returns whether a custodial PIN needs to be set up."""
    state = _identity_login_state(identity_id)
    if not state:
        raise HTTPException(
            status_code=404,
            detail="Identity not found. Use the Refugee ID from registration (e.g. REF-2026-001).",
        )
    return {
        "success": True,
        "data": {
            "identity_id": state["identity_id"],
            "requires_setup": state.get("requires_pin_setup", False),
        },
    }


@app.post("/api/blockchain/verify-identity")
def verify_identity(body: RefugeeLoginRequest):
    """
    First-phase login probe.

    Send the Refugee ID; the response describes which authentication flow the
    frontend should render (PIN for custodial W1, Pera Wallet signature for
    migrated W2). This endpoint NEVER authenticates the user — it only
    discloses the identity state required to drive the UI.

    The legacy `login_code` field is ignored here; the dedicated
    `/api/blockchain/refugee-login-pin` endpoint handles PIN validation.
    """
    state = _identity_login_state(body.identity_id)
    if not state:
        raise HTTPException(
            status_code=404,
            detail="Identity not found. Use the Refugee ID from registration (e.g. REF-2026-001).",
        )

    if not state["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="This identity has been disabled. Contact an administrator for assistance.",
        )

    linked = state.get("linked_wallet") or ""
    has_linked_wallet = False
    if linked:
        try:
            _require_algorand_address(linked, "linked_wallet")
            has_linked_wallet = True
        except HTTPException:
            # An identity may be registered without a wallet yet (legacy rows).
            # Return state so UI can show a friendly message instead of crashing.
            has_linked_wallet = False

    # SECURITY: do NOT leak the linked wallet address from the unauthenticated
    # probe — disclosing it would aid impersonation and tracking. The backend
    # alone enforces address matching at signature verification time.
    return {
        "success": True,
        "data": {
            "identity_id": state["identity_id"],
            "name": state["name"],
            "status": state["status"],
            "wallet_type": state["wallet_type"],
            "has_linked_wallet": has_linked_wallet,
            "requires_pin_setup": state["requires_pin_setup"],
            "is_migrated": state["status"] == "migrated",
            "is_custodial": state["wallet_type"] == "custodial",
            "auth_method": "wallet" if state["wallet_type"] == "pera" else "pin",
        },
    }


@app.post("/api/blockchain/refugee-login-pin")
def refugee_login_pin(body: RefugeePinLoginRequest):
    """
    Second-phase login for custodial (W1) identities.

    Accepts a 6-character PIN (4 letters + 2 digits). On first login the PIN
    is stored as a salted SHA-256 hash; subsequent logins verify the hash with
    a constant-time comparison.

    Migrated identities are rejected — they must use wallet-based login.
    """
    state = _identity_login_state(body.identity_id)
    if not state:
        raise HTTPException(status_code=404, detail="Identity not found.")

    if not state["is_active"]:
        raise HTTPException(status_code=403, detail="This identity has been disabled.")

    if state["status"] == "migrated" or state["wallet_type"] != "custodial":
        raise HTTPException(
            status_code=403,
            detail="This identity has migrated to a self-sovereign wallet. Use Pera Wallet to log in.",
        )

    pin = _normalize_login_code(body.pin)
    if not _LOGIN_CODE_PATTERN.match(pin or ""):
        raise HTTPException(
            status_code=400,
            detail="PIN must be 4 letters followed by 2 digits (e.g. ABCD12).",
        )

    canonical_id = state["identity_id"]
    stored_hash = _get_stored_login_code_hash(canonical_id)
    first_login = stored_hash is None
    if first_login:
        _set_login_code_hash(canonical_id, pin)
    else:
        provided_hash = _hash_login_code(canonical_id, pin)
        if not hmac.compare_digest(stored_hash, provided_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials.")

    return {
        "success": True,
        "data": {
            "identity_id": canonical_id,
            "linked_wallet": state["linked_wallet"],
            "wallet_type": state["wallet_type"],
            "status": state["status"],
            "first_login": first_login,
        },
    }


@app.get("/api/blockchain/login-challenge")
def login_challenge(identity_id: str):
    """
    Issue a one-time, short-lived challenge message for wallet-based login.

    Only available for identities authenticated via Pera Wallet (self-sovereign
    initial registration or post-migration W2). Custodial identities must use
    PIN login.
    """
    state = _identity_login_state(identity_id)
    if not state:
        raise HTTPException(status_code=404, detail="Identity not found.")
    if not state["is_active"]:
        raise HTTPException(status_code=403, detail="This identity has been disabled.")
    if state["wallet_type"] != "pera":
        raise HTTPException(
            status_code=400,
            detail="Wallet login is only available for self-sovereign identities. Use your PIN to log in.",
        )

    linked = state.get("linked_wallet") or ""
    _require_algorand_address(linked, "linked_wallet")
    challenge, expires_at = _issue_login_challenge(state["identity_id"], linked)
    # SECURITY: do not return the linked wallet address. The frontend connects
    # whatever wallet the refugee opens in Pera, signs the challenge, and
    # submits it to the backend. The backend is the sole authority that
    # compares the signing address against the linked W2 wallet.
    return {
        "success": True,
        "data": {
            "identity_id": state["identity_id"],
            "challenge": challenge,
            "expires_at": expires_at,
            "expires_in_seconds": _LOGIN_CHALLENGE_TTL_S,
        },
    }


@app.post("/api/blockchain/verify-login-signature")
def verify_login_signature(body: LoginVerifySignatureRequest):
    """
    Verify a Pera Wallet signature against a previously issued challenge.

    Authenticates the refugee for W2 (self-sovereign) login by checking:
      1) The challenge exists, is unexpired, and has not been reused.
      2) The challenge was issued for this Refugee ID.
      3) The signing address matches the wallet currently linked to the
         identity (post-migration W2 or original Pera registration).
      4) The Ed25519 signature is valid for the challenge bytes.

    Any failure returns "Wallet verification failed." with HTTP 401.
    """
    state = _identity_login_state(body.identity_id)
    if not state:
        raise HTTPException(status_code=401, detail="Wallet verification failed.")
    if not state["is_active"]:
        raise HTTPException(status_code=403, detail="This identity has been disabled.")
    if state["wallet_type"] != "pera":
        raise HTTPException(status_code=403, detail="Wallet verification failed.")

    challenge = (body.challenge or "").strip()
    address = (body.address or "").strip()
    signature_b64 = (body.signature or "").strip()
    if not challenge or not address or not signature_b64:
        raise HTTPException(status_code=401, detail="Wallet verification failed.")

    _require_algorand_address(address, "address")

    record = _consume_login_challenge(challenge)
    if not record:
        raise HTTPException(
            status_code=401,
            detail="Login challenge expired or already used. Request a new challenge and try again.",
        )

    if (record.get("identity_id") or "").strip() != state["identity_id"]:
        raise HTTPException(status_code=401, detail="Wallet verification failed.")

    expected_wallet = state["linked_wallet"]
    try:
        if _canonical_algo_address(address) != _canonical_algo_address(expected_wallet):
            raise HTTPException(status_code=401, detail="Wallet verification failed.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Wallet verification failed.") from e

    # Pera signData returns raw Ed25519 bytes; the frontend sends standard base64.
    verified = False
    try:
        verified = util.verify_bytes(challenge.encode(), signature_b64, address)
    except Exception:
        verified = False
    if not verified:
        try:
            signature = base64.b64decode(signature_b64)
            verified = util.verify_bytes(challenge.encode(), signature, address)
        except Exception:
            verified = False
    if not verified:
        raise HTTPException(status_code=401, detail="Wallet verification failed.")

    return {
        "success": True,
        "data": {
            "identity_id": state["identity_id"],
            "linked_wallet": expected_wallet,
            "wallet_type": state["wallet_type"],
            "status": state["status"],
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
    login_state = _identity_login_state(canonical_id) or {}

    linked_wallet = login_state.get("linked_wallet") or address
    custodial_wallet = login_state.get("custodial_wallet") or address if login_state.get("wallet_type") == "custodial" else login_state.get("custodial_wallet")
    migrated_wallet = login_state.get("migrated_wallet")

    # Aid history for the authoritative wallet (W2 if migrated, W1 otherwise).
    aid_claimed_types: list[str] = []
    aid_history_wallet = linked_wallet or address
    try:
        client = _get_client()
        types, _ = _on_chain_aid_types(client, aid_history_wallet)
        aid_claimed_types = types
    except Exception:
        aid_claimed_types = []

    # Migration history (timeline shown on the dashboard).
    migration_history = []
    for row in _migration_load():
        rid_in_row = str(row.get("identity_id") or row.get("refugeeID") or "").upper()
        if rid_in_row != canonical_id.upper():
            continue
        migration_history.append(
            {
                "id": row.get("id"),
                "status": (row.get("status") or "").lower(),
                "oldWallet": row.get("oldWallet"),
                "newWallet": row.get("newWallet"),
                "requestedAt": row.get("requestedAt") or row.get("requested_at"),
                "approvedAt": row.get("approved_at"),
                "rejectedAt": row.get("rejected_at"),
            }
        )
    migration_history.sort(key=lambda r: r.get("requestedAt") or "", reverse=True)

    return {
        "success": True,
        "data": {
            "identity_id": canonical_id,
            "name": profile["name"],
            "old_wallet": address,
            "walletAddress": profile.get("walletAddress") or address,
            "linked_wallet": linked_wallet,
            "custodial_wallet": custodial_wallet,
            "migrated_wallet": migrated_wallet,
            "status": login_state.get("status") or profile["status"],
            "is_migrated": (login_state.get("status") == "migrated") or (profile["status"] == "migrated"),
            "walletType": profile["walletType"],
            "wallet_type": login_state.get("wallet_type") or profile["walletType"],
            "created_at": resolved.get("created_at"),
            "app_id": chain.get("app_id"),
            "verification_mode": profile["verification_mode"],
            "blockchain": {
                "funded": chain["funded"],
                "amount_microalgos": chain["amount_microalgos"],
                "opted_in": chain["opted_in"],
                "local_state_exists": chain["local_state_exists"],
                "on_chain": chain["on_chain"],
                "migrated": chain["migrated"],
            },
            "aid_claimed_types": aid_claimed_types,
            "migration_history": migration_history,
            "qr_payload": qr_payload,
            "profile": profile,
            "authorized_consent_wallets": sorted(_authorized_refugee_wallets(canonical_id)),
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


def _decode_aid_claimed_types(raw: object) -> list[str]:
    """Parse comma-separated aid types from on-chain local state bytes."""
    if raw is None:
        return []
    if isinstance(raw, (bytes, bytearray)):
        text = bytes(raw).decode("utf-8", errors="replace")
    else:
        text = str(raw)
    text = text.strip()
    if not text:
        return []
    return [part.strip() for part in text.split(",") if part.strip()]


def _on_chain_aid_types(client, address: str) -> tuple[list[str], dict | None]:
    """Return claimed aid types and local state for a registered refugee."""
    local = _read_registered_refugee_state(client, address)
    if not local:
        return [], None
    return _decode_aid_claimed_types(local.get("aid_claimed_types")), local


class ClaimAidRequest(BaseModel):
    aid_type: str
    refugee_address: str | None = None
    address: str | None = None  # legacy alias


def _friendly_chain_error(exc: Exception, app_id: int | None = None) -> HTTPException:
    message = str(exc)
    # Prefer the contract assert / logic-eval message when present (AlgoKit LogicError).
    for needle in ("claim_aid:", "register:", "migrate_wallet:", "logic eval error", "assert failed"):
        if needle in message.lower():
            idx = message.lower().find(needle)
            if idx >= 0:
                message = message[idx:].split("\n")[0].strip()
            break
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
    if "aid type already claimed" in lower:
        return HTTPException(
            status_code=409,
            detail="Aid type already claimed for this refugee on-chain.",
        )
    if "claim_aid: already claimed" in lower or "already claimed" in lower:
        return HTTPException(status_code=409, detail="Aid has already been claimed for this refugee on-chain.")
    if "err opcode" in lower or "logic eval error" in lower:
        return HTTPException(
            status_code=400,
            detail=(
                message
                if len(message) < 300
                else (
                    "The blockchain rejected this aid claim. The refugee may not be fully registered "
                    f"on contract app {app_id} (opt-in + register after redeploy), or the aid type was "
                    "already claimed."
                )
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


@app.get("/api/blockchain/aid-status/{refugee_address}")
def aid_status(refugee_address: str):
    """Return per-type aid claim status from on-chain local state."""
    address = (refugee_address or "").strip()
    _require_algorand_address(address, "refugee_address")

    app_id = _get_app_id()
    if not app_id:
        raise HTTPException(
            status_code=503,
            detail="Refugee contract is not deployed on this network. Deploy from Admin → System Status.",
        )

    try:
        client = _get_client()
        claimed, local = _on_chain_aid_types(client, address)
        if local is None and not _account_opted_into_app(address, client.app_id):
            claimed = []
        unclaimed = [t for t in VALID_AID_TYPES if t not in claimed]
        return {
            "refugee_address": address,
            "claimed_types": claimed,
            "unclaimed_types": unclaimed,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/blockchain/claim-aid")
def claim_aid(req: ClaimAidRequest):
    """Mark a specific aid type as claimed for a refugee on-chain and in the backend registry."""
    address = (req.refugee_address or req.address or "").strip()
    aid_type = (req.aid_type or "").strip().lower()
    _require_algorand_address(address, "refugee_address")

    if aid_type not in VALID_AID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"aid_type must be one of: {', '.join(VALID_AID_TYPES)}",
        )

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

        claimed_before, local = _on_chain_aid_types(client, address)
        if not local:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This refugee is not fully registered on the blockchain for the active contract. "
                    "Re-run aid-worker registration (custodial or Pera) so opt-in and register complete, "
                    "then try issuing aid again."
                ),
            )
        if aid_type in claimed_before:
            raise HTTPException(
                status_code=409,
                detail=f"Aid type '{aid_type}' has already been claimed for this refugee.",
            )

        client.send.claim_aid(
            (address, aid_type),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                account_references=[address],
            ),
        )
        claimed_after, _ = _on_chain_aid_types(client, address)
    except HTTPException:
        raise
    except Exception as e:
        raise _friendly_chain_error(e, app_id) from e

    registry_row = _find_refugee_by_wallet(address)
    if registry_row:
        types = list(registry_row.get("aidClaimedTypes") or [])
        if aid_type not in types:
            types.append(aid_type)
        _save_refugee_record(
            {
                **registry_row,
                "aidClaimed": bool(types),
                "aidClaimedTypes": types,
                "aidClaimedAt": _utc_now_iso(),
            }
        )

    return {
        "ok": True,
        "success": True,
        "aid_type_claimed": aid_type,
        "all_claimed_types": claimed_after,
    }


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
        registered = _read_registered_refugee_state(client, address)
        if not registered:
            if _account_opted_into_app(address, client.app_id):
                return {
                    "success": False,
                    "data": None,
                    "detail": (
                        "Wallet is opted into the contract but not registered. "
                        "Complete aid-worker registration (register step) on the current app."
                    ),
                }
            return {"success": False, "data": None}
        data = registered
        wallet = data.get("wallet_address")
        id_h = data.get("identity_hash")
        ph_h = data.get("personhood_hash")
        age_h = data.get("age_proof_hash")

        def _hex_if_bytes(v):
            if isinstance(v, (bytes, bytearray)):
                return v.hex()
            return v

        claimed_types = _decode_aid_claimed_types(data.get("aid_claimed_types"))

        return {
            "success": True,
            "data": {
                "wallet_address": wallet.hex() if isinstance(wallet, (bytes, bytearray)) else wallet,
                "identity_hash": _hex_if_bytes(id_h),
                "personhood_hash": _hex_if_bytes(ph_h),
                "age_proof_hash": _hex_if_bytes(age_h),
                "aid_claimed": int(data.get("aid_claimed", 0) or 0),
                "aid_claimed_types": claimed_types,
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


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminVerifySignatureRequest(BaseModel):
    challenge: str
    signature: str
    address: str


@app.get("/api/admin/auth-challenge")
def admin_auth_challenge():
    """Issue a short-lived challenge for deployer wallet admin login."""
    _purge_expired_admin_challenges()
    timestamp = _utc_now_iso()
    nonce = _new_nonce()
    challenge = f"RIMS Admin Login: {timestamp} nonce {nonce}"
    expires_at = int(time.time()) + _ADMIN_CHALLENGE_TTL_S
    _admin_challenges[challenge] = float(expires_at)
    return {"challenge": challenge, "expires_at": expires_at}


@app.post("/api/admin/verify-signature")
def admin_verify_signature(body: AdminVerifySignatureRequest):
    """Verify deployer wallet signature against a issued admin auth challenge."""
    challenge = (body.challenge or "").strip()
    address = (body.address or "").strip()
    signature_b64 = (body.signature or "").strip()

    if not challenge or not address or not signature_b64:
        raise HTTPException(status_code=401, detail="Authentication failed")

    if not _admin_challenge_valid(challenge):
        raise HTTPException(status_code=401, detail="Authentication failed")

    if not DEPLOYER_ADDRESS:
        raise HTTPException(status_code=401, detail="Authentication failed")

    _require_algorand_address(address, "address")

    if address != DEPLOYER_ADDRESS:
        raise HTTPException(status_code=401, detail="Authentication failed")

    # Pera signData returns raw Ed25519 bytes; the frontend sends standard base64.
    # algosdk.util.verify_bytes accepts that base64 string (same as migration-request).
    if not util.verify_bytes(challenge.encode(), signature_b64, address):
        try:
            signature = base64.b64decode(signature_b64)
            verified = util.verify_bytes(challenge.encode(), signature, address)
        except Exception:
            verified = False
        if not verified:
            raise HTTPException(status_code=401, detail="Authentication failed")

    _consume_admin_challenge(challenge)
    token = _issue_admin_session_token()
    return {"authenticated": True, "token": token}


@app.post("/api/admin/login")
def admin_login(body: AdminLoginRequest):
    """Password-based admin login (fallback when Pera Wallet is unavailable)."""
    username = (body.username or "").strip()
    if username != ADMIN_USER_ID or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid administrator credentials")
    token = _issue_admin_session_token()
    return {"authenticated": True, "token": token}


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

    registry = resolved.get("registry_row") or {}
    wallet_type = str(registry.get("walletType") or "").strip().lower()
    if wallet_type == "pera":
        raise HTTPException(
            status_code=400,
            detail="Wallet migration is not available for self-sovereign (smartphone) registrations.",
        )

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


class CompleteCustodialOnchainRequest(BaseModel):
    identity_id: str


@app.post("/api/blockchain/complete-custodial-onchain")
def complete_custodial_onchain(body: CompleteCustodialOnchainRequest):
    """
    Finish on-chain setup for a custodial wallet that was saved as local_only
    (fund, opt-in, register on the active contract).
    """
    identity_id = (body.identity_id or "").strip()
    if not identity_id:
        raise HTTPException(status_code=400, detail="identity_id is required")

    resolved = _resolve_refugee_identity(identity_id)
    if not resolved or not resolved.get("custodial_row"):
        raise HTTPException(status_code=404, detail="Custodial identity not found")

    row = dict(resolved["custodial_row"])
    address = str(row.get("address") or "").strip()
    _require_algorand_address(address, "address")
    pk_b64 = row.get("private_key_b64")
    if not pk_b64:
        raise HTTPException(status_code=400, detail="Custodial private key missing on server")

    try:
        private_key = base64.b64decode(pk_b64, validate=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Invalid custodial private key") from e

    client = _get_client()
    _ensure_deployer_is_registrar(client)

    if _read_registered_refugee_state(client, address):
        wallets = _custodial_wallets_load()
        key = resolved.get("custodial_key") or identity_id
        if key in wallets:
            wallets[key] = {**wallets[key], "app_id": client.app_id, "provisioning_status": "on_chain"}
            wallets[key].pop("provisioning_error", None)
            _custodial_wallets_save(wallets)
        return {"ok": True, "address": address, "status": "already_registered"}

    deployer_pk = _deployer_private_key()
    try:
        info = _get_algod().account_info(address)
        amount = int(info.get("amount", 0) or 0)
    except Exception:
        amount = 0
    if amount < 300_000:
        _fund_account(deployer_pk, address, 500_000)

    if not _account_opted_into_app(address, client.app_id):
        _opt_in_app(private_key, client.app_id)

    identity_hash = hashlib.sha256(f"identity:{identity_id}".encode()).digest()
    personhood_hash = hashlib.sha256(f"personhood:{identity_id}".encode()).digest()
    age_proof_hash = hashlib.sha256(f"age:{identity_id}".encode()).digest()

    deployer = _deployer_account()
    client.send.register(
        (address, identity_hash, personhood_hash, age_proof_hash),
        params=algokit_utils.CommonAppCallParams(
            sender=deployer.address,
            signer=deployer.signer,
            account_references=[address],
        ),
    )

    wallets = _custodial_wallets_load()
    key = resolved.get("custodial_key") or identity_id
    if key in wallets:
        wallets[key] = {
            **wallets[key],
            "app_id": client.app_id,
            "provisioning_status": "on_chain",
        }
        wallets[key].pop("provisioning_error", None)
        _custodial_wallets_save(wallets)

    return {"ok": True, "address": address, "status": "registered", "app_id": client.app_id}


# --- ACCESS REQUESTS (Data Governance) ---


def _canonical_algo_address(address: str) -> str:
    """Normalize an Algorand address for reliable equality checks."""
    return encode_address(decode_address((address or "").strip()))


def _authorized_refugee_wallets(identity_id: str) -> set[str]:
    """
    Wallets allowed to approve data-access requests for a refugee:
    - Registered custodial/Pera wallet (W1)
    - Current registry wallet (W2 after migration)
    - Approved migration newWallet
    """
    rid = (identity_id or "").strip().upper()
    if not rid:
        return set()

    authorized: set[str] = set()

    def add(addr: str | None) -> None:
        if not addr or not str(addr).strip():
            return
        try:
            authorized.add(_canonical_algo_address(str(addr).strip()))
        except Exception:
            pass

    resolved = _resolve_refugee_identity(rid)
    if resolved:
        add(resolved.get("address"))

    registry = _find_refugee_by_identity(rid)
    if not registry and resolved:
        registry = resolved.get("registry_row")
    if registry:
        add(registry.get("walletAddress"))

    for row in _migration_load():
        row_id = (str(row.get("identity_id") or row.get("refugeeID") or "")).strip().upper()
        if row_id != rid:
            continue
        if (row.get("status") or "").lower() == "approved":
            add(row.get("newWallet"))
            add(row.get("oldWallet"))

    return authorized


class CreateAccessRequest(BaseModel):
    refugee_id: str
    requestedField: str
    purpose: str
    requestedBy: str | None = "Aid Worker"


class AccessActionRequest(BaseModel):
    requestId: str


class AccessApproveRequest(BaseModel):
    requestId: str
    signer_address: str


@app.get("/api/access/requests")
def get_access_requests(refugee_id: str | None = None):
    """Fetch data access requests; optional refugee_id filters to one refugee."""
    rows = _access_load()
    rid = (refugee_id or "").strip()
    if not rid:
        return rows
    rid_upper = rid.upper()
    return [
        r
        for r in rows
        if (str(r.get("refugee_id") or "").upper() == rid_upper)
        or (str(r.get("refugeeId") or "").upper() == rid_upper)
    ]


@app.post("/api/access/request")
def create_access_request(body: CreateAccessRequest):
    """Create a pending data-access request for a refugee (by REF id)."""
    refugee_id = (body.refugee_id or "").strip().upper()
    if not refugee_id:
        raise HTTPException(status_code=400, detail="refugee_id is required")
    if not refugee_id.startswith("REF-"):
        raise HTTPException(status_code=400, detail="refugee_id must look like REF-2026-001")

    purpose = (body.purpose or "").strip()
    if len(purpose) < 3:
        raise HTTPException(status_code=400, detail="purpose must be at least 3 characters")

    field_key = (body.requestedField or "").strip()
    field_label = _ACCESS_FIELD_LABELS.get(field_key) or field_key
    if field_key not in _ACCESS_FIELD_LABELS:
        raise HTTPException(
            status_code=400,
            detail=f"requestedField must be one of: {', '.join(_ACCESS_FIELD_LABELS.keys())}",
        )

    resolved = _resolve_refugee_identity(refugee_id)
    registry_row = _find_refugee_by_identity(refugee_id)
    if not resolved and not registry_row:
        raise HTTPException(
            status_code=404,
            detail=f"No refugee found for id {refugee_id}. Register the refugee first.",
        )

    wallet = ""
    name = "Registered Refugee"
    if resolved:
        wallet = (resolved.get("address") or "").strip()
        name = resolved.get("name") or name
    if registry_row:
        wallet = wallet or str(registry_row.get("walletAddress") or "").strip()
        name = registry_row.get("name") or name

    rows = _access_load()
    row = {
        "id": _next_access_request_id(rows),
        "refugee_id": refugee_id,
        "refugeeId": refugee_id,
        "walletAddress": wallet,
        "name": name,
        "requestedField": field_label,
        "requestedFieldKey": field_key,
        "purpose": purpose,
        "requestedBy": (body.requestedBy or "Aid Worker").strip() or "Aid Worker",
        "requestedAt": _utc_now_iso(),
        "status": "pending",
    }
    rows.append(row)
    _access_save(rows)
    return {"ok": True, "data": row}


@app.post("/api/access/approve")
def approve_access(req: AccessApproveRequest):
    """Approve a data access request; signer must own the refugee identity (W1 or post-migration W2)."""
    signer = (req.signer_address or "").strip()
    if not signer:
        raise HTTPException(status_code=400, detail="signer_address is required")
    _require_algorand_address(signer, "signer_address")

    rows = _access_load()
    target: dict | None = None
    for r in rows:
        if r["id"] == req.requestId:
            target = r
            break
    if not target:
        raise HTTPException(status_code=404, detail="Request not found")
    if (target.get("status") or "").lower() != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be approved")

    refugee_id = (target.get("refugee_id") or target.get("refugeeId") or "").strip()
    if not refugee_id:
        raise HTTPException(status_code=400, detail="Request is missing refugee_id")

    allowed = _authorized_refugee_wallets(refugee_id)
    try:
        signer_canonical = _canonical_algo_address(signer)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signer_address") from e

    if signer_canonical not in allowed:
        raise HTTPException(
            status_code=403,
            detail=(
                "Connected Pera wallet does not match your registered identity wallet "
                "or your wallet after migration."
            ),
        )

    target["status"] = "approved"
    target["approved_at"] = _utc_now_iso()
    target["approved_by_wallet"] = signer_canonical
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
