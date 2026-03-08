// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWillExecute {
    function execute() external;
}

/**
 * Minimal backup registry for demo only. Not derived from WillRegistry.sol.
 * - createWill: same signature as app expects; stores will and indexes by creator/executor/beneficiary.
 * - declareDeath: anyone can call; invokes generated contract execute() then marks executed. No permission checks.
 * - getWill / getWillIdsBy*: same return shape so app and chain module work unchanged.
 * No updateWill, no markExecuted.
 */
contract WillRegistryBackup {
    enum Status { Active, DeathDeclared, Executed }

    struct Will {
        uint256 id;
        address creator;
        address executor;
        address[] beneficiaries;
        address generatedContractAddress;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public nextWillId = 1;
    mapping(uint256 => Will) public wills;
    mapping(address => uint256[]) private _byCreator;
    mapping(address => uint256[]) private _byExecutor;
    mapping(address => uint256[]) private _byBeneficiary;

    event WillCreated(uint256 indexed id, address indexed creator, address indexed executor);
    event WillExecuted(uint256 indexed id, address indexed caller);

    error NotFound();
    error NotActive();
    error InvalidInput();

    function createWill(
        address executor,
        address[] calldata beneficiaries,
        string calldata,
        string calldata,
        address generatedContractAddress
    ) external returns (uint256 id) {
        address creator = msg.sender;
        if (creator == address(0) || executor == address(0)) revert InvalidInput();
        if (beneficiaries.length == 0) revert InvalidInput();
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == address(0)) revert InvalidInput();
        }

        id = nextWillId++;
        uint256 ts = block.timestamp;

        wills[id] = Will({
            id: id,
            creator: creator,
            executor: executor,
            beneficiaries: beneficiaries,
            generatedContractAddress: generatedContractAddress,
            status: Status.Active,
            createdAt: ts,
            updatedAt: ts
        });

        _byCreator[creator].push(id);
        _byExecutor[executor].push(id);
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            _byBeneficiary[beneficiaries[i]].push(id);
        }

        emit WillCreated(id, creator, executor);
        return id;
    }

    function declareDeath(uint256 willId) external {
        Will storage w = wills[willId];
        if (w.id == 0) revert NotFound();
        if (w.status != Status.Active) revert NotActive();

        if (w.generatedContractAddress != address(0)) {
            IWillExecute(w.generatedContractAddress).execute();
        }

        w.status = Status.Executed;
        w.updatedAt = block.timestamp;
        emit WillExecuted(willId, msg.sender);
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
        if (w.id == 0) revert NotFound();
        return (
            w.id,
            w.creator,
            w.executor,
            w.beneficiaries,
            "",
            "",
            w.generatedContractAddress,
            w.status,
            w.createdAt,
            w.updatedAt
        );
    }

    function getWillIdsByCreator(address creator) external view returns (uint256[] memory) {
        return _byCreator[creator];
    }

    function getWillIdsByExecutor(address executor) external view returns (uint256[] memory) {
        return _byExecutor[executor];
    }

    function getWillIdsByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _byBeneficiary[beneficiary];
    }
}
