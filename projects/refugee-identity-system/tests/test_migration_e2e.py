import base64
import hashlib
import os

import algokit_utils
import pytest
from algosdk import account as algo_account
from algosdk import encoding, mnemonic, util
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def algorand():
    return algokit_utils.AlgorandClient.default_localnet()


@pytest.fixture(scope="module")
def funded_deployer_mnemonic(algorand) -> str:
    """
    Create a funded deployer that the backend can use via DEPLOYER_MNEMONIC.
    """
    # Use localnet dispenser as faucet (works even if KMD wallet name differs)
    faucet = algorand.account.localnet_dispenser()

    sk, addr = algo_account.generate_account()
    algorand.send.payment(
        algokit_utils.PaymentParams(
            sender=faucet.address,
            signer=faucet.signer,
            receiver=addr,
            amount=algokit_utils.AlgoAmount(algo=10),
        )
    )
    info = algorand.client.algod.account_info(addr)
    assert info.get("amount", 0) > 0
    return mnemonic.from_private_key(sk)


@pytest.fixture()
def backend_client(tmp_path, funded_deployer_mnemonic, monkeypatch):
    """
    Import the backend after setting LocalNet env, and isolate its file-backed state.
    """
    monkeypatch.setenv("DEPLOYER_MNEMONIC", funded_deployer_mnemonic)
    monkeypatch.setenv("ALGOD_SERVER", "http://localhost")
    monkeypatch.setenv("ALGOD_PORT", "4001")
    monkeypatch.setenv("ALGOD_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    monkeypatch.setenv("INDEXER_SERVER", "http://localhost")
    monkeypatch.setenv("INDEXER_PORT", "8980")
    monkeypatch.setenv("INDEXER_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

    from Nexathon.backend import main as backend_main

    # Point backend file persistence to tmp to avoid polluting repo.
    backend_main._DEPLOYMENTS_FILE = tmp_path / ".deployments.json"
    backend_main._MIGRATION_REQUESTS_FILE = tmp_path / ".migration-requests.json"
    backend_main._MIGRATION_CHALLENGES_FILE = tmp_path / ".migration-challenges.json"
    backend_main._CUSTODIAL_WALLETS_FILE = tmp_path / ".custodial-wallets.json"

    return TestClient(backend_main.app)


def _sign_b64(message: str, private_key: bytes) -> str:
    signed = util.sign_bytes(message.encode(), private_key)
    # py-algorand-sdk versions may return bytes or base64-encoded str
    if isinstance(signed, bytes):
        return base64.b64encode(signed).decode()
    return signed


def test_e2e_migration_flow(algorand, backend_client):
    # 1) Deploy contract via backend (admin authority is deployer mnemonic)
    deploy = backend_client.post("/api/blockchain/deploy")
    assert deploy.status_code == 200
    app_id = deploy.json()["data"]["app_id"]
    assert isinstance(app_id, int) and app_id > 0

    # 2) Backend creates real W1: generate + fund + opt-in + register local state + QR payload
    w1_resp = backend_client.post("/api/blockchain/generate-custodial-wallet")
    assert w1_resp.status_code == 200
    data = w1_resp.json()["data"]
    identity_id = data["identity_id"]
    w1_addr = data["address"]
    qr_payload = data["qr_payload"]

    assert encoding.is_valid_address(w1_addr)
    assert identity_id and isinstance(identity_id, str)
    assert "old_wallet" in qr_payload and w1_addr in qr_payload

    # W1 exists on-chain and has balance
    w1_info = algorand.client.algod.account_info(w1_addr)
    # Funded (500k) then spends fees; ensure it's clearly non-zero and funded.
    assert int(w1_info.get("amount", 0)) >= 400_000

    # W1 opted-in and has identity in local state (and not migrated)
    from blockchain.artifacts.refugee_contract.refugee_contract_client import RefugeeContractClient

    client = RefugeeContractClient(
        algorand=algorand,
        app_id=app_id,
        default_sender=algorand.account.localnet_dispenser().address,
        default_signer=algorand.account.localnet_dispenser().signer,
    )
    local_w1 = client.state.local_state(w1_addr).get_all()
    assert local_w1.get("identity_hash") is not None
    assert local_w1.get("identity_hash") != b"MIGRATED"

    expected_id_hash = hashlib.sha256(f"identity:{identity_id}".encode()).digest()
    assert local_w1["identity_hash"] == expected_id_hash

    # 3) Create W2 (user wallet), fund + opt-in (required by contract)
    w2 = algorand.account.random()
    faucet = algorand.account.localnet_dispenser()
    algorand.send.payment(
        algokit_utils.PaymentParams(
            sender=faucet.address,
            signer=faucet.signer,
            receiver=w2.address,
            amount=algokit_utils.AlgoAmount(algo=2),
        )
    )
    assert encoding.is_valid_address(w2.address)

    client.send.opt_in.bare(
        params=algokit_utils.AppClientBareCallParams(sender=w2.address, signer=w2.signer)
    )

    # 4) Migration challenge message + W2 signature (frontend equivalent)
    msg_resp = backend_client.get(
        "/api/blockchain/migration-message",
        params={"identity_id": identity_id, "old_wallet": w1_addr, "new_wallet": w2.address},
    )
    assert msg_resp.status_code == 200
    msg = msg_resp.json()["data"]["message"]
    sig_b64 = _sign_b64(msg, w2.private_key)

    submit_resp = backend_client.post(
        "/api/blockchain/migration-request",
        json={
            "identity_id": identity_id,
            "old_wallet": w1_addr,
            "new_wallet": w2.address,
            "signed_message": sig_b64,
        },
    )
    assert submit_resp.status_code == 200
    req_id = submit_resp.json()["data"]["id"]

    # 5) Admin approves migration (on-chain migrate_wallet)
    approve_resp = backend_client.post("/api/blockchain/migration-approve", json={"id": req_id})
    assert approve_resp.status_code == 200

    # 6) Verify W2 now holds identity; W1 is inactive (MIGRATED)
    local_w2 = client.state.local_state(w2.address).get_all()
    assert local_w2["identity_hash"] == expected_id_hash

    local_w1_after = client.state.local_state(w1_addr).get_all()
    assert local_w1_after["identity_hash"] == b"MIGRATED"

    # 7) Double migration protection: backend must reject new challenge for migrated W1
    msg_again = backend_client.get(
        "/api/blockchain/migration-message",
        params={"identity_id": identity_id, "old_wallet": w1_addr, "new_wallet": w2.address},
    )
    assert msg_again.status_code == 400
    assert "already migrated" in msg_again.json()["detail"].lower()

