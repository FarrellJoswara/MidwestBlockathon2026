// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * WillRegistry — stores will metadata on-chain.
 * Creator, executor, beneficiaries, percentages, IPFS CID, encrypted key IV, status.
 * Indexed by creator, executor, and beneficiaries for "my wills" queries.
 */
contract WillRegistry {
    enum Status { Active, DeathDeclared, Executed }

    struct Will {
        uint256 id;
        address creatorWallet;
        address executorWallet;
        address[] beneficiaryWallets;
        uint256[] beneficiaryPercentages;
        string ipfsCid;
        string encryptedDocKeyIv;
        address generatedContractAddress;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public nextWillId = 1;
    mapping(uint256 => Will) public wills;
    mapping(address => uint256[]) private _creatorWillIds;
    mapping(address => uint256[]) private _executorWillIds;
    mapping(address => uint256[]) private _beneficiaryWillIds;

    event WillCreated(uint256 indexed id, address indexed creator, address indexed executor);
    event WillUpdated(uint256 indexed id, Status status);

    function createWill(
        address creatorWallet,
        address[] calldata beneficiaryWallets,
        uint256[] calldata beneficiaryPercentages,
        string calldata ipfsCid,
        string calldata encryptedDocKeyIv,
        address generatedContractAddress
    ) external returns (uint256 id) {
        require(msg.sender != address(0), "invalid executor");
        require(creatorWallet != address(0), "invalid creator");
        require(
            beneficiaryWallets.length == beneficiaryPercentages.length && beneficiaryWallets.length > 0,
            "bad beneficiaries"
        );
        uint256 sum = 0;
        for (uint256 i = 0; i < beneficiaryPercentages.length; i++) {
            sum += beneficiaryPercentages[i];
        }
        require(sum == 100, "percentages must sum to 100");

        id = nextWillId++;
        address executorWallet = msg.sender;

        wills[id] = Will({
            id: id,
            creatorWallet: creatorWallet,
            executorWallet: executorWallet,
            beneficiaryWallets: beneficiaryWallets,
            beneficiaryPercentages: beneficiaryPercentages,
            ipfsCid: ipfsCid,
            encryptedDocKeyIv: encryptedDocKeyIv,
            generatedContractAddress: generatedContractAddress,
            status: Status.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _creatorWillIds[creatorWallet].push(id);
        _executorWillIds[executorWallet].push(id);
        for (uint256 i = 0; i < beneficiaryWallets.length; i++) {
            _beneficiaryWillIds[beneficiaryWallets[i]].push(id);
        }

        emit WillCreated(id, creatorWallet, executorWallet);
        return id;
    }

    function updateWill(
        uint256 willId,
        address[] calldata beneficiaryWallets,
        uint256[] calldata beneficiaryPercentages,
        string calldata ipfsCid,
        string calldata encryptedDocKeyIv,
        Status status
    ) external {
        Will storage w = wills[willId];
        require(w.id != 0, "will not found");
        require(w.executorWallet == msg.sender, "only executor");
        require(w.status == Status.Active, "will not active");

        if (beneficiaryWallets.length > 0) {
            require(
                beneficiaryWallets.length == beneficiaryPercentages.length,
                "bad beneficiaries"
            );
            uint256 sum = 0;
            for (uint256 i = 0; i < beneficiaryPercentages.length; i++) {
                sum += beneficiaryPercentages[i];
            }
            require(sum == 100, "percentages must sum to 100");
            w.beneficiaryWallets = beneficiaryWallets;
            w.beneficiaryPercentages = beneficiaryPercentages;
        }
        if (bytes(ipfsCid).length > 0) w.ipfsCid = ipfsCid;
        if (bytes(encryptedDocKeyIv).length > 0) w.encryptedDocKeyIv = encryptedDocKeyIv;
        if (status != Status.Active) w.status = status;
        w.updatedAt = block.timestamp;

        emit WillUpdated(willId, w.status);
    }

    function declareDeath(uint256 willId) external {
        Will storage w = wills[willId];
        require(w.id != 0, "will not found");
        require(w.executorWallet == msg.sender, "only executor");
        require(w.status == Status.Active, "will not active");
        w.status = Status.DeathDeclared;
        w.updatedAt = block.timestamp;
        emit WillUpdated(willId, w.status);
    }

    function markExecuted(uint256 willId) external {
        Will storage w = wills[willId];
        require(w.id != 0, "will not found");
        require(w.executorWallet == msg.sender, "only executor");
        require(w.status == Status.DeathDeclared, "declare death first");
        w.status = Status.Executed;
        w.updatedAt = block.timestamp;
        emit WillUpdated(willId, w.status);
    }

    function getWill(uint256 willId)
        external
        view
        returns (
            uint256 id,
            address creatorWallet,
            address executorWallet,
            address[] memory beneficiaryWallets,
            uint256[] memory beneficiaryPercentages,
            string memory ipfsCid,
            string memory encryptedDocKeyIv,
            address generatedContractAddress,
            Status status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        Will storage w = wills[willId];
        require(w.id != 0, "will not found");
        return (
            w.id,
            w.creatorWallet,
            w.executorWallet,
            w.beneficiaryWallets,
            w.beneficiaryPercentages,
            w.ipfsCid,
            w.encryptedDocKeyIv,
            w.generatedContractAddress,
            w.status,
            w.createdAt,
            w.updatedAt
        );
    }

    function getWillIdsByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorWillIds[creator];
    }

    function getWillIdsByExecutor(address executor) external view returns (uint256[] memory) {
        return _executorWillIds[executor];
    }

    function getWillIdsByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _beneficiaryWillIds[beneficiary];
    }
}
