"""
Refugee identity contract — Algorand Python (PuyaPy) implementation.

This contract matches the current app + backend flows:
- Registrar authorization via BoxMap (registrar_<address>)
- Local state stores hashed identity signals (no raw PII on-chain)
- Aid claiming
- Wallet migration (custodial W1 → self-sovereign W2), with W1 marked MIGRATED
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


MIGRATED_SENTINEL = b"MIGRATED"


class RefugeeContract(ARC4Contract):
    def __init__(self) -> None:
        # Global
        self.admin = GlobalState(Bytes, key="admin")

        # Registrars (BoxMap key: registrar_<address> -> 1/0)
        self.registrars = BoxMap(Account, UInt64, key_prefix=b"registrar_")

        # Local state (opt-in required)
        self.wallet_address = LocalState(Bytes, key="wallet_address")
        self.identity_hash = LocalState(Bytes, key="identity_hash")
        self.personhood_hash = LocalState(Bytes, key="personhood_hash")
        self.age_proof_hash = LocalState(Bytes, key="age_proof_hash")
        self.aid_claimed = LocalState(UInt64, key="aid_claimed")

    @arc4.baremethod(create="require")
    def create(self) -> None:
        self.admin.value = Txn.sender.bytes

    @arc4.baremethod(allow_actions=["OptIn"])
    def opt_in(self) -> None:
        # Opt-in only allocates local state
        pass

    def clear_state_program(self) -> UInt64:
        return UInt64(1)

    @subroutine
    def _is_admin(self) -> bool:
        return Txn.sender.bytes == self.admin.value

    @subroutine
    def _is_authorized(self) -> bool:
        if self._is_admin():
            return True
        if Txn.sender in self.registrars:
            return self.registrars[Txn.sender] == UInt64(1)
        return False

    @arc4.abimethod
    def add_registrar(self, registrar: Account, action: arc4.String) -> None:
        assert self._is_admin(), "add_registrar: sender not admin"
        act = action.native
        if act == String("add"):
            self.registrars[registrar] = UInt64(1)
        else:
            assert act == String("remove"), "add_registrar: invalid action"
            self.registrars[registrar] = UInt64(0)

    @arc4.abimethod
    def register(
        self,
        refugee: Account,
        identity_hash: arc4.DynamicBytes,
        personhood_hash: arc4.DynamicBytes,
        age_proof_hash: arc4.DynamicBytes,
    ) -> None:
        assert self._is_authorized(), "register: sender not authorized"
        assert refugee.is_opted_in(Global.current_application_id), "register: refugee not opted in"

        # Duplicate prevention: reject if already registered
        existing_identity, has_value = self.identity_hash.maybe(refugee)
        assert not has_value, "register: refugee already registered"

        self.wallet_address[refugee] = refugee.bytes
        self.identity_hash[refugee] = identity_hash.native
        self.personhood_hash[refugee] = personhood_hash.native
        self.age_proof_hash[refugee] = age_proof_hash.native
        self.aid_claimed[refugee] = UInt64(0)

    @arc4.abimethod
    def claim_aid(self, refugee: Account) -> None:
        assert self._is_authorized(), "claim_aid: sender not authorized"
        assert refugee.is_opted_in(Global.current_application_id), "claim_aid: refugee not opted in"

        val, has_val = self.aid_claimed.maybe(refugee)
        assert not has_val or val == UInt64(0), "claim_aid: already claimed"
        self.aid_claimed[refugee] = UInt64(1)

    @arc4.abimethod
    def migrate_wallet(self, old_wallet: Account, new_wallet: Account) -> None:
        """
        Admin migrates identity from W1 → W2.
        - Copies identity/personhood/age/aid_claimed to W2
        - Sets wallet_address(W2) = W2 bytes
        - Marks identity_hash(W1) = MIGRATED sentinel
        """
        assert self._is_admin(), "migrate_wallet: sender not admin"
        assert old_wallet.is_opted_in(Global.current_application_id), "migrate_wallet: old not opted in"
        assert new_wallet.is_opted_in(Global.current_application_id), "migrate_wallet: new not opted in"

        old_identity = self.identity_hash[old_wallet]
        assert old_identity != Bytes(MIGRATED_SENTINEL), "migrate_wallet: already migrated"

        # Copy state
        self.identity_hash[new_wallet] = old_identity
        self.personhood_hash[new_wallet] = self.personhood_hash[old_wallet]
        self.age_proof_hash[new_wallet] = self.age_proof_hash[old_wallet]
        self.aid_claimed[new_wallet] = self.aid_claimed[old_wallet]
        self.wallet_address[new_wallet] = new_wallet.bytes

        # Mark old as migrated
        self.identity_hash[old_wallet] = Bytes(MIGRATED_SENTINEL)
