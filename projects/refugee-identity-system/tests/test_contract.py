"""
Integration tests for RefugeeContract.

Runs against LocalNet. Requires: algokit localnet start
"""

import hashlib

import algokit_utils
import pytest
from algosdk import encoding

# Test hash constants (same as original refugee-identity-contract)
IDENTITY_HASH = hashlib.sha256(b"Ahmed Ali DOB:1990 Syrian").digest()
PERSONHOOD_HASH = hashlib.sha256(b"liveness_frames_timestamp_12345").digest()
AGE_PROOF_HASH = hashlib.sha256(b"over18:true").digest()

# Local state key for migrated sentinel (contract uses Bytes(b"MIGRATED"))
MIGRATED_SENTINEL = b"MIGRATED"


def _create_registrar_box_reference(app_id: int, registrar_address: str) -> algokit_utils.BoxReference:
    """Create box reference for registrar_<address> BoxMap entry."""
    from algosdk import encoding

    address_bytes = encoding.decode_address(registrar_address)
    box_name = b"registrar_" + address_bytes
    return algokit_utils.BoxReference(app_id=app_id, name=box_name)


@pytest.fixture(scope="module")
def algorand():
    """Algorand client connected to LocalNet."""
    return algokit_utils.AlgorandClient.default_localnet()


@pytest.fixture(scope="module")
def deployer(algorand):
    """Deployer account (from LocalNet or env)."""
    try:
        dep = algorand.account.from_environment("DEPLOYER")
    except Exception:
        dep = algorand.account.from_kmd("unencrypted-default-wallet", "")

    # Ensure deployer is funded on LocalNet (env mnemonic may be unfunded).
    if algorand.client.is_localnet():
        info = algorand.client.algod.account_info(dep.address)
        # Suite funds multiple accounts and app MBR; keep a generous buffer.
        if int(info.get("amount", 0)) < 15_000_000:
            faucet = algorand.account.localnet_dispenser()
            algorand.send.payment(
                algokit_utils.PaymentParams(
                    sender=faucet.address,
                    signer=faucet.signer,
                    receiver=dep.address,
                    amount=algokit_utils.AlgoAmount(algo=25),
                )
            )

    return dep


@pytest.fixture(scope="module")
def client(algorand, deployer):
    """Deployed RefugeeContract client."""
    # Import from blockchain package (moved to Nexathon/blockchain)
    from blockchain.artifacts.refugee_contract.refugee_contract_client import (
        RefugeeContractFactory,
    )

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

    return app_client


@pytest.fixture(scope="module")
def aid_worker(algorand, deployer):
    """Funded aid worker account (shared across tests)."""
    account = algorand.account.random()
    algorand.send.payment(
        algokit_utils.PaymentParams(
            amount=algokit_utils.AlgoAmount(algo=5),
            sender=deployer.address,
            receiver=account.address,
        )
    )
    return account


@pytest.fixture(scope="module")
def refugee(algorand, deployer):
    """Funded refugee account (shared across tests)."""
    account = algorand.account.random()
    algorand.send.payment(
        algokit_utils.PaymentParams(
            amount=algokit_utils.AlgoAmount(algo=5),
            sender=deployer.address,
            receiver=account.address,
        )
    )
    assert encoding.is_valid_address(account.address)
    info = algorand.client.algod.account_info(account.address)
    assert info.get("amount", 0) > 0
    return account


class TestRefugeeContract:
    """Refugee identity contract integration tests (run in order)."""

    @pytest.mark.order(1)
    def test_1_add_registrar(self, client, deployer, aid_worker):
        """Admin adds aid worker as authorized registrar."""
        client.send.add_registrar(
            args=(aid_worker.address, "add"),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                box_references=[
                    _create_registrar_box_reference(client.app_id, aid_worker.address)
                ],
            ),
        )
        # Verify registrar is authorized
        registrar_val = client.state.box.registrars.get_value(aid_worker.address)
        assert registrar_val == 1

    @pytest.mark.order(2)
    def test_2_refugee_opt_in(self, client, refugee):
        """Refugee wallet opts in to contract."""
        client.send.opt_in.bare(
            params=algokit_utils.AppClientBareCallParams(
                sender=refugee.address,
                signer=refugee.signer,
            ),
        )
        # Verify opt-in exists on-chain (local state allocated)
        app_info = client.algorand.client.algod.account_application_info(refugee.address, client.app_id)
        assert app_info and app_info.get("app-local-state") is not None

    @pytest.mark.order(3)
    def test_3_register_refugee(self, client, aid_worker, refugee):
        """Aid worker registers refugee with identity hashes."""
        client.send.register(
            args=(refugee.address, IDENTITY_HASH, PERSONHOOD_HASH, AGE_PROOF_HASH),
            params=algokit_utils.CommonAppCallParams(
                sender=aid_worker.address,
                signer=aid_worker.signer,
            ),
        )
        # Verify local state
        identity = client.state.local_state(refugee.address).identity_hash
        assert identity == IDENTITY_HASH

    @pytest.mark.order(4)
    def test_4_read_data(self, client, refugee):
        """Read refugee data from blockchain."""
        local = client.state.local_state(refugee.address)
        identity = local.identity_hash
        aid_claimed = local.aid_claimed
        assert identity == IDENTITY_HASH
        assert aid_claimed == 0

    @pytest.mark.order(5)
    def test_5_claim_aid(self, client, aid_worker, refugee):
        """Aid worker claims aid for refugee."""
        client.send.claim_aid(
            args=(refugee.address,),
            params=algokit_utils.CommonAppCallParams(
                sender=aid_worker.address,
                signer=aid_worker.signer,
            ),
        )
        aid_claimed = client.state.local_state(refugee.address).aid_claimed
        assert aid_claimed == 1

    @pytest.mark.order(6)
    def test_6_duplicate_aid_claim_rejected(self, client, aid_worker, refugee):
        """Duplicate aid claim is rejected."""
        with pytest.raises(Exception):
            client.send.claim_aid(
                args=(refugee.address,),
                params=algokit_utils.CommonAppCallParams(
                    sender=aid_worker.address,
                    signer=aid_worker.signer,
                ),
            )

    @pytest.mark.order(7)
    def test_7_duplicate_register_rejected(self, client, aid_worker, refugee):
        """Duplicate registration is rejected."""
        with pytest.raises(Exception):
            client.send.register(
                args=(refugee.address, IDENTITY_HASH, PERSONHOOD_HASH, AGE_PROOF_HASH),
                params=algokit_utils.CommonAppCallParams(
                    sender=aid_worker.address,
                    signer=aid_worker.signer,
                ),
            )

    @pytest.mark.order(8)
    def test_8_wallet_migration(
        self, client, algorand, deployer, aid_worker, refugee
    ):
        """Admin migrates identity from custodial to new self-sovereign wallet."""
        w1_before = client.state.local_state(refugee.address)
        assert w1_before.identity_hash == IDENTITY_HASH
        assert w1_before.personhood_hash == PERSONHOOD_HASH
        assert w1_before.age_proof_hash == AGE_PROOF_HASH
        assert w1_before.aid_claimed == 1

        new_wallet = algorand.account.random()
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=5),
                sender=deployer.address,
                receiver=new_wallet.address,
            )
        )
        assert encoding.is_valid_address(new_wallet.address)
        info = algorand.client.algod.account_info(new_wallet.address)
        assert info.get("amount", 0) > 0

        # New wallet opts in
        client.send.opt_in.bare(
            params=algokit_utils.AppClientBareCallParams(
                sender=new_wallet.address,
                signer=new_wallet.signer,
            ),
        )
        app_info = client.algorand.client.algod.account_application_info(new_wallet.address, client.app_id)
        assert app_info and app_info.get("app-local-state") is not None

        # Admin migrates (foreign accounts: W1 at Accounts[1], W2 at Accounts[2]; slot 0 is sender)
        client.send.migrate_wallet(
            args=(refugee.address, new_wallet.address),
            params=algokit_utils.CommonAppCallParams(
                sender=deployer.address,
                signer=deployer.signer,
                account_references=[refugee.address, new_wallet.address, deployer.address],
            ),
        )

        w2 = client.state.local_state(new_wallet.address)
        assert w2.identity_hash == IDENTITY_HASH
        assert w2.personhood_hash == PERSONHOOD_HASH
        assert w2.age_proof_hash == AGE_PROOF_HASH
        assert w2.aid_claimed == 1
        assert w2.wallet_address == encoding.decode_address(new_wallet.address)

        old_after = client.state.local_state(refugee.address)
        assert old_after.identity_hash == MIGRATED_SENTINEL
        assert old_after.personhood_hash == PERSONHOOD_HASH
        assert old_after.age_proof_hash == AGE_PROOF_HASH

        with pytest.raises(Exception):
            client.send.migrate_wallet(
                args=(refugee.address, new_wallet.address),
                params=algokit_utils.CommonAppCallParams(
                    sender=deployer.address,
                    signer=deployer.signer,
                    account_references=[refugee.address, new_wallet.address, deployer.address],
                ),
            )
