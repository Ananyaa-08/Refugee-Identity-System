// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AidDistribution {

    struct AidRecord {
        string  aidType;    // 'food', 'medicine', 'shelter', 'cash'
        uint256 timestamp;  // When it was claimed
        address issuedBy;   // Which registrar issued it
    }

    mapping(address => mapping(string => bool))  public aidClaimed;
    mapping(address => AidRecord[])              public aidHistory;
    mapping(address => bool)                     public authorizedIssuers;
    address public admin;

    event AidIssued(address indexed refugee, string aidType, uint256 time);
    event AidDenied(address indexed refugee, string aidType, string reason);

    modifier onlyAdmin()  { require(msg.sender == admin, 'Not admin'); _; }
    modifier onlyIssuer() { require(authorizedIssuers[msg.sender], 'Not issuer'); _; }

    constructor() { admin = msg.sender; }
    function addIssuer(address _i) public onlyAdmin { authorizedIssuers[_i] = true; }

    function issueAid(address _refugee, string memory _aidType) public onlyIssuer {
        if (aidClaimed[_refugee][_aidType]) {
            emit AidDenied(_refugee, _aidType, 'Already claimed');
            revert('Aid type already claimed by this refugee');
        }
        aidClaimed[_refugee][_aidType] = true;
        aidHistory[_refugee].push(AidRecord(_aidType, block.timestamp, msg.sender));
        emit AidIssued(_refugee, _aidType, block.timestamp);
    }

    function hasReceivedAid(address _r, string memory _t) public view returns (bool) {
        return aidClaimed[_r][_t];
    }

    function getAidHistory(address _r) public view returns (AidRecord[] memory) {
        return aidHistory[_r];
    }
}
