// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * WillRegistry — stores will metadata on-chain with multiple allocation pools per will.
 * Creator, executor, pools (name + beneficiaries + percentages per pool), IPFS CID, encrypted key IV, status.
 * Indexed by creator, executor, and beneficiaries for "my wills" queries.
 */
contract WillRegistry {
    enum Status { Active, DeathDeclared, Executed }

    struct Pool {
        string name;
        address[] beneficiaryWallets;
        uint256[] beneficiaryPercentages;
    }

    struct WillMeta {
        uint256 id;
        address creatorWallet;
        address executorWallet;
        string ipfsCid;
        string encryptedDocKeyIv;
        address generatedContractAddress;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public nextWillId = 1;
    mapping(uint256 => WillMeta) public wills;
    mapping(uint256 => Pool[]) private _willPools;
    mapping(address => uint256[]) private _creatorWillIds;
    mapping(address => uint256[]) private _executorWillIds;
    mapping(address => uint256[]) private _beneficiaryWillIds;

    event WillCreated(uint256 indexed id, address indexed creator, address indexed executor);
    event WillUpdated(uint256 indexed id, Status status);

    function _removeBeneficiaryWillId(address beneficiary, uint256 willId) private {
        uint256[] storage ids = _beneficiaryWillIds[beneficiary];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == willId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                return;
            }
        }
    }

    function _indexBeneficiaries(uint256 willId) private {
        Pool[] storage pools = _willPools[willId];
        for (uint256 p = 0; p < pools.length; p++) {
            for (uint256 i = 0; i < pools[p].beneficiaryWallets.length; i++) {
                address addr = pools[p].beneficiaryWallets[i];
                _beneficiaryWillIds[addr].push(willId);
            }
        }
    }

    function _unindexBeneficiaries(uint256 willId) private {
        Pool[] storage pools = _willPools[willId];
        for (uint256 p = 0; p < pools.length; p++) {
            for (uint256 i = 0; i < pools[p].beneficiaryWallets.length; i++) {
                _removeBeneficiaryWillId(pools[p].beneficiaryWallets[i], willId);
            }
        }
    }

    function createWill(
        address creatorWallet,
        string[] calldata poolNames,
        address[][] calldata poolWallets,
        uint256[][] calldata poolPercentages,
        string calldata ipfsCid,
        string calldata encryptedDocKeyIv,
        address generatedContractAddress
    ) external returns (uint256 id) {
        require(msg.sender != address(0), "invalid executor");
        require(creatorWallet != address(0), "invalid creator");
        require(poolNames.length > 0 && poolNames.length == poolWallets.length && poolNames.length == poolPercentages.length, "bad pools");

        for (uint256 p = 0; p < poolNames.length; p++) {
            require(poolWallets[p].length > 0, "pool empty");
            require(poolWallets[p].length == poolPercentages[p].length, "bad pool lengths");
            uint256 sum = 0;
            for (uint256 i = 0; i < poolPercentages[p].length; i++) {
                sum += poolPercentages[p][i];
            }
            require(sum == 100, "percentages must sum to 100");
        }

        id = nextWillId++;
        address executorWallet = msg.sender;

        wills[id] = WillMeta({
            id: id,
            creatorWallet: creatorWallet,
            executorWallet: executorWallet,
            ipfsCid: ipfsCid,
            encryptedDocKeyIv: encryptedDocKeyIv,
            generatedContractAddress: generatedContractAddress,
            status: Status.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        for (uint256 p = 0; p < poolNames.length; p++) {
            _willPools[id].push(Pool({
                name: poolNames[p],
                beneficiaryWallets: poolWallets[p],
                beneficiaryPercentages: poolPercentages[p]
            }));
        }

        _creatorWillIds[creatorWallet].push(id);
        _executorWillIds[executorWallet].push(id);
        _indexBeneficiaries(id);

        emit WillCreated(id, creatorWallet, executorWallet);
        return id;
    }

    function updateWill(
        uint256 willId,
        string[] calldata poolNames,
        address[][] calldata poolWallets,
        uint256[][] calldata poolPercentages,
        string calldata ipfsCid,
        string calldata encryptedDocKeyIv,
        Status status
    ) external {
        WillMeta storage w = wills[willId];
        require(w.id != 0, "will not found");
        require(w.executorWallet == msg.sender, "only executor");
        require(w.status == Status.Active, "will not active");

        if (poolNames.length > 0) {
            require(poolNames.length == poolWallets.length && poolNames.length == poolPercentages.length, "bad pools");
            for (uint256 p = 0; p < poolNames.length; p++) {
                require(poolWallets[p].length > 0, "pool empty");
                require(poolWallets[p].length == poolPercentages[p].length, "bad pool lengths");
                uint256 sum = 0;
                for (uint256 i = 0; i < poolPercentages[p].length; i++) {
                    sum += poolPercentages[p][i];
                }
                require(sum == 100, "percentages must sum to 100");
            }
            _unindexBeneficiaries(willId);
            delete _willPools[willId];
            for (uint256 p = 0; p < poolNames.length; p++) {
                _willPools[willId].push(Pool({
                    name: poolNames[p],
                    beneficiaryWallets: poolWallets[p],
                    beneficiaryPercentages: poolPercentages[p]
                }));
            }
            _indexBeneficiaries(willId);
        }
        if (bytes(ipfsCid).length > 0) w.ipfsCid = ipfsCid;
        if (bytes(encryptedDocKeyIv).length > 0) w.encryptedDocKeyIv = encryptedDocKeyIv;
        if (status != Status.Active) w.status = status;
        w.updatedAt = block.timestamp;

        emit WillUpdated(willId, w.status);
    }

    function declareDeath(uint256 willId) external {
        WillMeta storage w = wills[willId];
        require(w.id != 0, "will not found");
        require(w.executorWallet == msg.sender, "only executor");
        require(w.status == Status.Active, "will not active");
        w.status = Status.DeathDeclared;
        w.updatedAt = block.timestamp;
        emit WillUpdated(willId, w.status);
    }

    function markExecuted(uint256 willId) external {
        WillMeta storage w = wills[willId];
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
            string memory ipfsCid,
            string memory encryptedDocKeyIv,
            address generatedContractAddress,
            Status status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        WillMeta storage w = wills[willId];
        require(w.id != 0, "will not found");
        return (
            w.id,
            w.creatorWallet,
            w.executorWallet,
            w.ipfsCid,
            w.encryptedDocKeyIv,
            w.generatedContractAddress,
            w.status,
            w.createdAt,
            w.updatedAt
        );
    }

    function getWillPoolCount(uint256 willId) external view returns (uint256) {
        require(wills[willId].id != 0, "will not found");
        return _willPools[willId].length;
    }

    function getPool(uint256 willId, uint256 poolIndex)
        external
        view
        returns (
            string memory name,
            address[] memory beneficiaryWallets,
            uint256[] memory beneficiaryPercentages
        )
    {
        require(wills[willId].id != 0, "will not found");
        Pool storage p = _willPools[willId][poolIndex];
        return (p.name, p.beneficiaryWallets, p.beneficiaryPercentages);
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
