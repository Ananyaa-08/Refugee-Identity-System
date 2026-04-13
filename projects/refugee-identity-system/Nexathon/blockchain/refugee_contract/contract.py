"""
Refugee identity contract — Algorand Python (PuyaPy) implementation.

Manages refugee identity registration with hashes (no raw PII on-chain),
authorized registrars, aid claim tracking, and wallet migration.
"""

from algopy import (
    ARC4Contract,
    Account,
    Bytes,
    Global,
    LocalState,
    GlobalState,
    BoxMap,
    String,
    Txn,
    UInt64,
    arc4,
    subroutine,
)


class RefugeeContract(ARC4Contract):
    """Refugee identity management contract."""

    def __init__(self) -> None:
        # Global: deployer becomes admin on create
        self.admin = GlobalState(Bytes, key="admin")
        self.total_refugees = UInt64(0)
        # Registrars stored in BoxMap (dynamic keys: registrar_<address> -> 1 or 0)
        self.registrars = BoxMap(Account, UInt64, key_prefix=b"registrar_")
        # Local state per refugee (requires opt-in)
        self.wallet_address = LocalState(Bytes, key="wallet_address")
        self.identity_hash = LocalState(Bytes, key="identity_hash")
        self.personhood_hash = LocalState(Bytes, key="personhood_hash")
        self.age_proof_hash = LocalState(Bytes, key="age_proof_hash")
        self.aid_claimed = LocalState(UInt64, key="aid_claimed")

    @arc4.baremethod(create="require")
    def create(self) -> None:
        """Runs on deployment. Sets the deployer as admin."""
        self.admin.value = Txn.sender.bytes
        self.total_refugees = UInt64(0)

    @arc4.baremethod(allow_actions=["OptIn"])
    def opt_in(self) -> None:
        """Any wallet can opt in. Opt-in only allocates local state space."""
        pass

    def clear_state_program(self) -> UInt64:
        """Approve when a wallet force-closes their local state."""
        return UInt64(1)

    @subroutine
    def _is_admin(self) -> bool:
        """Check if caller is the contract deployer."""
        return Txn.sender.bytes == self.admin.value

    @subroutine
    def _is_authorized_registrar(self) -> bool:
        """Check if caller is an authorized aid worker."""
        if Txn.sender in self.registrars:
            return self.registrars[Txn.sender] == UInt64(1)
        return False

    @arc4.abimethod
    def add_registrar(self, registrar: Account, action: arc4.String) -> None:
        """Only admin can add or remove authorized registrars."""
        assert self._is_admin(), "add_registrar: sender not admin"
        action_native = action.native
        if action_native == String("add"):
            self.registrars[registrar] = UInt64(1)
        else:
            assert action_native == String("remove"), "add_registrar: invalid action"
            self.registrars[registrar] = UInt64(0)

    @arc4.abimethod
    def register(
        self,
        refugee: Account,
        identity_hash: arc4.DynamicBytes,
        personhood_hash: arc4.DynamicBytes,
        age_proof_hash: arc4.DynamicBytes,
    ) -> None:
        """Authorized registrar stores identity/personhood/age hashes in refugee's local state."""
        assert self._is_authorized_registrar(), "register: sender not authorized registrar"
        assert refugee.is_opted_in(Global.current_application_id), "register: refugee not opted in"
        # Duplicate prevention: reject if refugee already registered
        existing_id, has_value = self.identity_hash.maybe(refugee)
        assert not has_value, "register: refugee already registered"
        # Validate none of the hashes are empty
        id_hash_bytes = identity_hash.native
        person_hash_bytes = personhood_hash.native
        age_hash_bytes = age_proof_hash.native
        assert id_hash_bytes != Bytes(), "register: empty identity hash"
        assert person_hash_bytes != Bytes(), "register: empty personhood hash"
        assert age_hash_bytes != Bytes(), "register: empty age proof hash"
        # Store all data in refugee's local state
        self.wallet_address[refugee] = refugee.bytes
        self.identity_hash[refugee] = id_hash_bytes
        self.personhood_hash[refugee] = person_hash_bytes
        self.age_proof_hash[refugee] = age_hash_bytes
        self.aid_claimed[refugee] = UInt64(0)
        # Increment global refugee counter
        self.total_refugees += 1

    @arc4.abimethod
    def claim_aid(self, refugee: Account) -> None:
        """Admin or registrar marks aid as claimed for a refugee. Prevents duplicate claims."""
        assert self._is_admin() or self._is_authorized_registrar(), "claim_aid: sender not authorized"
        assert refugee.is_opted_in(Global.current_application_id), "claim_aid: refugee not opted in"
        assert refugee in self.identity_hash, "claim_aid: refugee not registered"
        # Check aid has NOT already been claimed
        aid_val, has_aid = self.aid_claimed.maybe(refugee)
        assert not has_aid or aid_val == UInt64(0), "claim_aid: already claimed"
        self.aid_claimed[refugee] = UInt64(1)

    @arc4.abimethod
    def migrate_wallet(self, old_wallet: Account, new_wallet: Account) -> None:
        """Admin migrates identity from custodial wallet (old) to refugee's new wallet."""
        assert self._is_admin(), "migrate_wallet: sender not admin"
        assert old_wallet.is_opted_in(Global.current_application_id), "migrate_wallet: old wallet not opted in"
        assert new_wallet.is_opted_in(Global.current_application_id), "migrate_wallet: new wallet not opted in"
        assert old_wallet in self.identity_hash, "migrate_wallet: old wallet not registered"
        old_id = self.identity_hash[old_wallet]
        assert old_id != Bytes(b"MIGRATED"), "migrate_wallet: old wallet already migrated"
        # Copy all identity data to new wallet
        old_personhood = self.personhood_hash[old_wallet]
        old_age = self.age_proof_hash[old_wallet]
        old_aid_val, has_aid = self.aid_claimed.maybe(old_wallet)
        old_aid = UInt64(0)
        if has_aid:
            old_aid = old_aid_val
        self.wallet_address[new_wallet] = new_wallet.bytes
        self.identity_hash[new_wallet] = old_id
        self.personhood_hash[new_wallet] = old_personhood
        self.age_proof_hash[new_wallet] = old_age
        self.aid_claimed[new_wallet] = old_aid
        # Invalidate old wallet record
        self.identity_hash[old_wallet] = Bytes(b"MIGRATED")
