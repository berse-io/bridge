pragma solidity ^0.5.0;

import "./EventEmitter.sol";
import "../libs/MerkleTreeVerifier.sol";
import "../libs/SparseMerkleTree.sol";
import "../interfaces/IEventListener.sol";

contract EventListener is IEventListener {
    // The interchain state root.
    bytes32 public stateRoot;

    // Previous roots
    bytes32[] public previousRoots;

    // bytes32 public eventsRoot;

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
        // eventsRoot = _eventsRoot;
        emitter.acknowledge();
        previousRoots.push(_root);
        
        emit StateRootUpdated(stateRoot, _eventsRoot);
    }

    function checkEvent(
        uint256 _chainId,
        bytes32 _eventHash,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes memory _stateProof
    ) public returns (bool) {
        bytes32 eventLeaf = MerkleTreeVerifier._hashLeaf(_eventHash);

        // Compute the events root from the proof
        bytes32 eventsRoot = MerkleTreeVerifier._computeRoot(_eventsProof, _eventsPaths, eventLeaf);

        // Prove the events root is member of the current state root
        // and in doing so, prove the event is valid
        bytes32 stateRoot_comp = SparseMerkleTree.getRoot(
            eventsRoot, 
            _chainId, 
            _stateProofBitmap,
            _stateProof
        );

        // Loop backwards through previous roots.

        for(uint256 i = previousRoots.length; i > 0; i--) {
            if(
                stateRoot_comp == previousRoots[i - 1]
            ) return true;
        }

        require(false, "_eventsRoot INVALID_PROOF");


        // require(
        //     SparseMerkleTree.verify(
        //         stateRoot,
        //         _chainId,
        //         eventsRoot,
        //         _stateProofBitmap,
        //         _stateProof
        //     ) == true,
        //     "_eventsRoot INVALID_PROOF"
        // );

        // Prove the eventHash is a member of the eventsRoot
        // require(
        //     MerkleTreeVerifier._verify(
        //         eventLeaf,
        //         eventsRoot,
        //         _eventsProof,
        //         _eventsPaths
        //     ) == true,
        //     "_eventHash INVALID_PROOF"
        // );

        // return true;
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