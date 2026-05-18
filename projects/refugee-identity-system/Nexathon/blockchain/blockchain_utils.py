import json
import os
from pathlib import Path

import algokit_utils


ALGOD_SERVER = "https://testnet-api.algonode.cloud"
ALGOD_PORT = "443"
ALGOD_TOKEN = ""

_DEPLOYMENTS_FILE = Path(__file__).resolve().parent.parent / ".deployments.json"


def _read_deployments_app_id() -> int | None:
    if not _DEPLOYMENTS_FILE.exists():
        return None
    try:
        data = json.loads(_DEPLOYMENTS_FILE.read_text())
        app_id = data.get("app_id") if isinstance(data, dict) else None
        return int(app_id) if app_id is not None else None
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


def get_app_id() -> int | None:
    """Active RefugeeContract app id from .deployments.json or REFUGEE_APP_ID env."""
    file_id = _read_deployments_app_id()
    if file_id is not None:
        return file_id
    env_id = (os.getenv("REFUGEE_APP_ID") or "").strip()
    if env_id:
        try:
            return int(env_id)
        except ValueError:
            return None
    return None


# Backwards-compatible alias for scripts that import APP_ID
APP_ID = get_app_id()


def get_algorand() -> algokit_utils.AlgorandClient:
    """
    Return an Algorand client configured for TestNet.

    Uses explicit Algod settings and DEPLOYER_MNEMONIC from environment.
    """
    os.environ.setdefault("ALGOD_SERVER", ALGOD_SERVER)
    os.environ.setdefault("ALGOD_PORT", ALGOD_PORT)
    os.environ.setdefault("ALGOD_TOKEN", ALGOD_TOKEN)
    return algokit_utils.AlgorandClient.from_environment()
