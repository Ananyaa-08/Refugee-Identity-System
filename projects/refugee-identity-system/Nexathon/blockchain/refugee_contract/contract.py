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
    op,
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
        self.did = LocalState(String, key="did")
        self.ipfs_cid = LocalState(String, key="ipfs_cid")
        self.biometric_hash = LocalState(Bytes, key="biometric_hash")
        self.trust_tier = LocalState(UInt64, key="trust_tier")
        self.aid_claimed = LocalState(UInt64, key="aid_claimed")
        self.is_active = LocalState(UInt64, key="is_active")

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
        did: arc4.String,
        ipfs_cid: arc4.String,
        biometric_hash: arc4.DynamicBytes,
    ) -> None:
        """Authorized registrar stores identity data in refugee's local state."""
        assert self._is_authorized_registrar() or self._is_admin(), "register: sender not authorized"
        assert refugee.is_opted_in(Global.current_application_id), "register: refugee not opted in"
        
        # Duplicate prevention: reject if refugee already registered
        val, has_value = self.ipfs_cid.maybe(refugee)
        assert not has_value, "register: refugee already registered"
        
        # Store all data in refugee's local state
        self.wallet_address[refugee] = refugee.bytes
        self.did[refugee] = did.native
        self.ipfs_cid[refugee] = ipfs_cid.native
        self.biometric_hash[refugee] = biometric_hash.native
        self.trust_tier[refugee] = UInt64(0)
        self.aid_claimed[refugee] = UInt64(0)
        self.is_active[refugee] = UInt64(1)
        
        # Increment global refugee counter
        self.total_refugees += 1

    @arc4.abimethod
    def upgrade_tier(self, refugee: Account, new_tier: UInt64) -> None:
        """Only registrar can upgrade trust tier."""
        assert self._is_authorized_registrar() or self._is_admin(), "upgrade_tier: sender not authorized"
        assert refugee.is_opted_in(Global.current_application_id), "upgrade_tier: refugee not opted in"
        current_tier = self.trust_tier[refugee]
        assert new_tier > current_tier, "upgrade_tier: cannot downgrade"
        self.trust_tier[refugee] = new_tier

    @arc4.abimethod
    def issue_aid(self, refugee: Account) -> None:
        """Admin or registrar marks aid as claimed for a refugee. Prevents duplicate claims."""
        assert self._is_authorized_registrar() or self._is_admin(), "issue_aid: sender not authorized"
        assert refugee.is_opted_in(Global.current_application_id), "issue_aid: refugee not opted in"
        
        # Check aid has NOT already been claimed
        aid_val, has_aid = self.aid_claimed.maybe(refugee)
        assert not has_aid or aid_val == UInt64(0), "issue_aid: already claimed"
        self.aid_claimed[refugee] = UInt64(1)
