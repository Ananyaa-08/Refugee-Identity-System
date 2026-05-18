"""Backend diagnostic - run from Nexathon directory."""
import sys, os
from pathlib import Path

results = []

def check(label, fn):
    try:
        result = fn()
        results.append(f"PASS  {label}: {result}")
        return result
    except Exception as e:
        results.append(f"FAIL  {label}: {type(e).__name__}: {e}")
        return None

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

check("DEPLOYER_MNEMONIC words", lambda: len(os.environ.get("DEPLOYER_MNEMONIC","").split()))
check("ALGOD_SERVER", lambda: os.environ.get("ALGOD_SERVER","NOT SET"))

import algokit_utils
algorand = check("AlgorandClient.from_environment", lambda: algokit_utils.AlgorandClient.from_environment())
deployer = check("account.from_environment(DEPLOYER)", lambda: algokit_utils.AlgorandClient.from_environment().account.from_environment("DEPLOYER"))

if deployer:
    check("Deployer address", lambda: deployer.address)

from blockchain.blockchain_utils import get_app_id
from blockchain.artifacts.refugee_contract.refugee_contract_client import RefugeeContractClient
if algorand and deployer:
    _app_id = get_app_id()
    check("APP_ID from .deployments.json / env", lambda: _app_id or "NOT SET")
    client = check("RefugeeContractClient init", lambda: RefugeeContractClient(
        algorand=algorand, app_id=_app_id,
        default_sender=deployer.address, default_signer=deployer.signer
    )) if _app_id else None
    if client:
        check("Global state read", lambda: f"totalRefugees={client.state.global_state().total_refugees}")

# Print all results
print("\n=== BACKEND DIAGNOSTIC RESULTS ===")
for r in results:
    icon = "✅" if r.startswith("PASS") else "❌"
    print(f"  {icon} {r}")
print("===================================\n")
