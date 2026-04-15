// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IdentityRegistry {

    struct Refugee {
        string  did;            // Unique identity: did:ethr:0x71C...
        string  ipfsCID;        // Pointer to encrypted data on IPFS
        bytes32 biometricHash;  // SHA-256 hash of fingerprint/face
        uint256 timestamp;      // Unix time of registration
        uint8   trustTier;      // 0=Basic 1=Field 2=UNHCR 3=Govt
        bool    isActive;       // Can be deactivated if fraud proven
        address owner;          // Refugee's wallet address
    }

    mapping(address => Refugee)                   public refugees;
    mapping(bytes32 => bool)                      public biometricExists;
    mapping(bytes32 => address)                   public biometricToWallet;
    mapping(address => bool)                      public authorizedRegistrars;
    mapping(address => mapping(address => bool))  public accessGrants;
    address public admin;

    event RefugeeRegistered(address indexed wallet, string did, uint256 time);
    event AccessGranted(address indexed refugee, address indexed requester);
    event TierUpgraded(address indexed refugee, uint8 newTier);

    modifier onlyAdmin()     { require(msg.sender == admin, 'Not admin'); _; }
    modifier onlyRegistrar() { require(authorizedRegistrars[msg.sender], 'Not registrar'); _; }

    constructor() { admin = msg.sender; }

    function addRegistrar(address _r) public onlyAdmin {
        authorizedRegistrars[_r] = true;
    }

    function registerRefugee(
        address _wallet,
        string  memory _did,
        string  memory _cid,
        bytes32 _bioHash
    ) public onlyRegistrar {
        require(!biometricExists[_bioHash], 'Duplicate biometric detected');
        require(refugees[_wallet].timestamp == 0, 'Wallet already registered');
        biometricExists[_bioHash]   = true;
        biometricToWallet[_bioHash] = _wallet;
        refugees[_wallet] = Refugee(
            _did, _cid, _bioHash, block.timestamp, 0, true, _wallet
        );
        emit RefugeeRegistered(_wallet, _did, block.timestamp);
    }

    function grantAccess(address _requester) public {
        require(refugees[msg.sender].isActive, 'No active record found');
        accessGrants[msg.sender][_requester] = true;
        emit AccessGranted(msg.sender, _requester);
    }

    function revokeAccess(address _requester) public {
        accessGrants[msg.sender][_requester] = false;
    }

    function hasAccess(address _refugee, address _req) public view returns (bool) {
        return accessGrants[_refugee][_req];
    }

    function upgradeTier(address _refugee, uint8 _newTier) public onlyRegistrar {
        require(_newTier > refugees[_refugee].trustTier, 'Cannot downgrade tier');
        refugees[_refugee].trustTier = _newTier;
        emit TierUpgraded(_refugee, _newTier);
    }

    function getRefugee(address _wallet) public view returns (Refugee memory) {
        require(refugees[_wallet].isActive, 'No active record');
        return refugees[_wallet];
    }
}
