pragma solidity ^0.5.0;

import "./EventEmitter.sol";
import "../libs/MerkleTreeVerifier.sol";
import "../libs/SparseMerkleTree.sol";
import "../interfaces/IEventListener.sol";

contract EventListener is IEventListener {
    // The interchain state root.
    bytes32 public stateRoot;
    bytes32 public eventsRoot;

    bytes32 public lastUpdated;
    

    // bytes32 public bridgeId;
    EventEmitter emitter;

    event StateRootUpdated(bytes32 indexed root, bytes32 eventRoot);

    constructor(address _emitter) public {
        emitter = EventEmitter(_emitter);
        _updateStateRoot(emitter.nonce(), emitter.nonce());
    }

    function _updateStateRoot(bytes32 _root, bytes32 _eventsRoot) internal {
        lastUpdated = blockhash(block.number);
        stateRoot = _root;
        eventsRoot = _eventsRoot;
        emitter.acknowledge();

        emit StateRootUpdated(stateRoot, eventsRoot);
    }

    function checkEvent(
        bytes32 _eventHash,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes memory _stateProof
    ) public returns (bool) {
        bytes32 eventLeaf = MerkleTreeVerifier._hashLeaf(_eventHash);

        require(
            MerkleTreeVerifier._verify(
                eventLeaf,
                eventsRoot,
                _eventsProof,
                _eventsPaths
            ) == true,
            "_eventHash INVALID_PROOF"
        );

        require(
            SparseMerkleTree.verify(
                stateRoot,
                emitter.chainId(),
                eventsRoot,
                _stateProofBitmap,
                _stateProof
            ) == true,
            "_eventsRoot INVALID_PROOF"
        );

        return true;
    }
    
    // TODO only the relayer(s) should be able to update the proof
    function updateStateRoot(
        bytes32 _newInterchainStateRoot, 
        bytes32 _eventsRoot,
        bytes32 _proofBitmap,
        bytes memory _proof
    ) public {
        require(emitter.getEventsRoot() == _eventsRoot, "EVENT_ROOT_MISMATCH");
        
        uint256 key = emitter.chainId();

        require(
            SparseMerkleTree.verify(
                _newInterchainStateRoot,
                key,
                _eventsRoot,
                _proofBitmap,
                _proof
            ) == true,
            "_newInterchainStateRoot INVALID_PROOF"
        );
        
        _updateStateRoot(_newInterchainStateRoot, _eventsRoot);
    }
}