// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WillRegistry {
    enum WillStatus { Active, DeathDeclared, Executed }

    struct Will {
        uint256 id;
        address creatorWallet;
        address executorWallet;
        address[] beneficiaryWallets;
        uint256[] beneficiaryPercentages;
        string ipfsCid;
        string encryptedDocKeyIv;
        WillStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 private _willCounter;
    mapping(uint256 => Will) public wills;

    // Track user roles to will IDs for fast querying
    mapping(address => uint256[]) private _creatorWills;
    mapping(address => uint256[]) private _executorWills;
    mapping(address => uint256[]) private _beneficiaryWills;

    event WillCreated(uint256 indexed willId, address indexed creator);
    event WillUpdated(uint256 indexed willId, address indexed creator);
    event DeathDeclared(uint256 indexed willId, address indexed executor, uint256 timestamp);
    event WillExecuted(uint256 indexed willId, address indexed executor);

    function createWill(
        address creatorWallet,
        address executorWallet,
        address[] memory beneficiaryWallets,
        uint256[] memory beneficiaryPercentages,
        string memory ipfsCid,
        string memory encryptedDocKeyIv
    ) external returns (uint256) {
        require(beneficiaryWallets.length == beneficiaryPercentages.length, "Beneficiary arrays length mismatch");
        
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < beneficiaryPercentages.length; i++) {
            totalPercentage += beneficiaryPercentages[i];
        }
        require(totalPercentage == 100, "Total percentage must be 100");

        _willCounter++;
        uint256 newWillId = _willCounter;

        wills[newWillId] = Will({
            id: newWillId,
            creatorWallet: creatorWallet,
            executorWallet: executorWallet,
            beneficiaryWallets: beneficiaryWallets,
            beneficiaryPercentages: beneficiaryPercentages,
            ipfsCid: ipfsCid,
            encryptedDocKeyIv: encryptedDocKeyIv,
            status: WillStatus.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _creatorWills[creatorWallet].push(newWillId);
        _executorWills[executorWallet].push(newWillId);
        
        for (uint256 i = 0; i < beneficiaryWallets.length; i++) {
            _beneficiaryWills[beneficiaryWallets[i]].push(newWillId);
        }

        emit WillCreated(newWillId, creatorWallet);
        return newWillId;
    }

    function updateWill(
        uint256 willId,
        address[] memory beneficiaryWallets,
        uint256[] memory beneficiaryPercentages,
        string memory ipfsCid,
        string memory encryptedDocKeyIv
    ) external {
        Will storage willData = wills[willId];
        require(willData.id != 0, "Will does not exist");
        require(msg.sender == willData.creatorWallet, "Only creator can update");
        require(willData.status == WillStatus.Active, "Will is not active");
        require(beneficiaryWallets.length == beneficiaryPercentages.length, "Beneficiary arrays length mismatch");

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < beneficiaryPercentages.length; i++) {
            totalPercentage += beneficiaryPercentages[i];
        }
        require(totalPercentage == 100, "Total percentage must be 100");

        willData.beneficiaryWallets = beneficiaryWallets;
        willData.beneficiaryPercentages = beneficiaryPercentages;
        
        if (bytes(ipfsCid).length > 0) {
            willData.ipfsCid = ipfsCid;
        }
        if (bytes(encryptedDocKeyIv).length > 0) {
            willData.encryptedDocKeyIv = encryptedDocKeyIv;
        }
        
        willData.updatedAt = block.timestamp;

        // Note: For simplicity, we don't completely clear the old beneficiaries from _beneficiaryWills here.
        // In a production environment, you might want to manage the index correctly to avoid memory leaks.
        for (uint256 i = 0; i < beneficiaryWallets.length; i++) {
             // Avoid adding duplicates if they already exist
             bool exists = false;
             for (uint256 j = 0; j < _beneficiaryWills[beneficiaryWallets[i]].length; j++) {
                 if (_beneficiaryWills[beneficiaryWallets[i]][j] == willId) {
                     exists = true;
                     break;
                 }
             }
             if (!exists) {
                _beneficiaryWills[beneficiaryWallets[i]].push(willId);
             }
        }

        emit WillUpdated(willId, msg.sender);
    }

    function declareDeath(uint256 willId) external {
        Will storage willData = wills[willId];
        require(willData.id != 0, "Will does not exist");
        require(msg.sender == willData.executorWallet, "Only executor can declare death");
        require(willData.status == WillStatus.Active, "Will is not active");

        willData.status = WillStatus.DeathDeclared;
        willData.updatedAt = block.timestamp;

        emit DeathDeclared(willId, msg.sender, block.timestamp);
    }

    function markExecuted(uint256 willId) external {
        Will storage willData = wills[willId];
        require(willData.id != 0, "Will does not exist");
        require(msg.sender == willData.executorWallet, "Only executor can mark as executed");
        require(willData.status == WillStatus.DeathDeclared, "Death has not been declared");

        willData.status = WillStatus.Executed;
        willData.updatedAt = block.timestamp;

        emit WillExecuted(willId, msg.sender);
    }

    function getWill(uint256 willId) external view returns (
        uint256 id,
        address creatorWallet,
        address executorWallet,
        address[] memory beneficiaryWallets,
        uint256[] memory beneficiaryPercentages,
        string memory ipfsCid,
        string memory encryptedDocKeyIv,
        WillStatus status,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        Will storage willData = wills[willId];
        require(willData.id != 0, "Will does not exist");

        return (
            willData.id,
            willData.creatorWallet,
            willData.executorWallet,
            willData.beneficiaryWallets,
            willData.beneficiaryPercentages,
            willData.ipfsCid,
            willData.encryptedDocKeyIv,
            willData.status,
            willData.createdAt,
            willData.updatedAt
        );
    }

    function getWillIdsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorWills[creator];
    }

    function getWillIdsByExecutor(address executor) external view returns (uint256[] memory) {
        return _executorWills[executor];
    }

    function getWillIdsByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _beneficiaryWills[beneficiary];
    }
}
