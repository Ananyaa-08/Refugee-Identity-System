import os

import algokit_utils


ALGOD_SERVER = "https://testnet-api.algonode.cloud"
ALGOD_PORT = "443"
ALGOD_TOKEN = ""

# Deployed TestNet App ID (RefugeeContract)
APP_ID = 758845823


def get_algorand() -> algokit_utils.AlgorandClient:
    """
    Return an Algorand client configured for TestNet.

    Uses explicit Algod settings and DEPLOYER_MNEMONIC from environment.
    """
    # Ensure env has the expected values (allows backend/.env loading to define them)
    os.environ.setdefault("ALGOD_SERVER", ALGOD_SERVER)
    os.environ.setdefault("ALGOD_PORT", ALGOD_PORT)
    os.environ.setdefault("ALGOD_TOKEN", ALGOD_TOKEN)
    return algokit_utils.AlgorandClient.from_environment()
