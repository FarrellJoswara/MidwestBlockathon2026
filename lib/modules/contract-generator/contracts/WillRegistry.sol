// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * WillRegistry — minimal on-chain index of wills.
 * Stores: creator, executor, flat beneficiaries[], IPFS CID, encrypted key IV, generated contract address, status, timestamps.
 * Indexed by creator, executor, and beneficiaries for "my wills" queries.
 * No pools or percentages on-chain; allocation details live off-chain (IPFS / generated contract).
 */
contract WillRegistry {
    enum Status { Active, DeathDeclared, Executed }

    struct Will {
        uint256 id;
        address creator;
        address executor;
        address[] beneficiaries;
        string ipfsCid;
        string encryptedDocKeyIv;
        address generatedContractAddress;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    error InvalidCreator();
    error InvalidExecutor();
    error EmptyBeneficiaries();
    error InvalidBeneficiary();
    error WillNotFound();
    error NotCreator();
    error NotExecutor();
    error WillNotActive();
    error InvalidStatusTransition();

    uint256 public nextWillId = 1;
    mapping(uint256 => Will) public wills;
    mapping(address => uint256[]) private _willIdsByCreator;
    mapping(address => uint256[]) private _willIdsByExecutor;
    mapping(address => uint256[]) private _willIdsByBeneficiary;

    event WillCreated(uint256 indexed id, address indexed creator, address indexed executor);
    event WillUpdated(uint256 indexed id, Status status);

    function _removeFromUint256Array(uint256[] storage arr, uint256 value) private {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                return;
            }
        }
    }

    function _indexBeneficiaries(uint256 willId, address[] memory beneficiaries) private {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address addr = beneficiaries[i];
            _willIdsByBeneficiary[addr].push(willId);
        }
    }

    function _unindexBeneficiaries(uint256 willId, address[] storage beneficiaries) private {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            _removeFromUint256Array(_willIdsByBeneficiary[beneficiaries[i]], willId);
        }
    }

    function createWill(
        address executor,
        address[] calldata beneficiaries,
        string calldata ipfsCid,
        string calldata encryptedDocKeyIv,
        address generatedContractAddress
    ) external returns (uint256 id) {
        address creator = msg.sender;
        if (creator == address(0)) revert InvalidCreator();
        if (executor == address(0)) revert InvalidExecutor();
        if (beneficiaries.length == 0) revert EmptyBeneficiaries();
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == address(0)) revert InvalidBeneficiary();
        }

        id = nextWillId++;
        uint256 ts = block.timestamp;

        wills[id] = Will({
            id: id,
            creator: creator,
            executor: executor,
            beneficiaries: beneficiaries,
            ipfsCid: ipfsCid,
            encryptedDocKeyIv: encryptedDocKeyIv,
            generatedContractAddress: generatedContractAddress,
            status: Status.Active,
            createdAt: ts,
            updatedAt: ts
        });

        _willIdsByCreator[creator].push(id);
        _willIdsByExecutor[executor].push(id);
        _indexBeneficiaries(id, beneficiaries);

        emit WillCreated(id, creator, executor);
        return id;
    }

    function updateWill(
        uint256 willId,
        address[] calldata beneficiaries,
        string calldata ipfsCid,
        string calldata encryptedDocKeyIv
    ) external {
        Will storage w = wills[willId];
        if (w.id == 0) revert WillNotFound();
        if (msg.sender != w.creator) revert NotCreator();
        if (w.status != Status.Active) revert WillNotActive();

        if (beneficiaries.length > 0) {
            for (uint256 i = 0; i < beneficiaries.length; i++) {
                if (beneficiaries[i] == address(0)) revert InvalidBeneficiary();
            }
            _unindexBeneficiaries(willId, w.beneficiaries);
            w.beneficiaries = beneficiaries;
            _indexBeneficiaries(willId, beneficiaries);
        }
        if (bytes(ipfsCid).length > 0) w.ipfsCid = ipfsCid;
        if (bytes(encryptedDocKeyIv).length > 0) w.encryptedDocKeyIv = encryptedDocKeyIv;
        w.updatedAt = block.timestamp;

        emit WillUpdated(willId, w.status);
    }

    function declareDeath(uint256 willId) external {
        Will storage w = wills[willId];
        if (w.id == 0) revert WillNotFound();
        if (msg.sender != w.executor) revert NotExecutor();
        if (w.status != Status.Active) revert InvalidStatusTransition();
        w.status = Status.DeathDeclared;
        w.updatedAt = block.timestamp;
        emit WillUpdated(willId, w.status);
    }

    function markExecuted(uint256 willId) external {
        Will storage w = wills[willId];
        if (w.id == 0) revert WillNotFound();
        if (msg.sender != w.executor) revert NotExecutor();
        if (w.status != Status.DeathDeclared) revert InvalidStatusTransition();
        w.status = Status.Executed;
        w.updatedAt = block.timestamp;
        emit WillUpdated(willId, w.status);
    }

    function getWill(uint256 willId)
        external
        view
        returns (
            uint256 id,
            address creator,
            address executor,
            address[] memory beneficiaries,
            string memory ipfsCid,
            string memory encryptedDocKeyIv,
            address generatedContractAddress,
            Status status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        Will storage w = wills[willId];
        if (w.id == 0) revert WillNotFound();
        return (
            w.id,
            w.creator,
            w.executor,
            w.beneficiaries,
            w.ipfsCid,
            w.encryptedDocKeyIv,
            w.generatedContractAddress,
            w.status,
            w.createdAt,
            w.updatedAt
        );
    }

    function getWillIdsByCreator(address creator) external view returns (uint256[] memory) {
        return _willIdsByCreator[creator];
    }

    function getWillIdsByExecutor(address executor) external view returns (uint256[] memory) {
        return _willIdsByExecutor[executor];
    }

    function getWillIdsByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _willIdsByBeneficiary[beneficiary];
    }
}
