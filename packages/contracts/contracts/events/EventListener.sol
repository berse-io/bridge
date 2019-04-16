pragma solidity ^0.5.0;

import "./EventEmitter.sol";
import "../libs/MerkleTreeVerifier.sol";
import "../libs/SparseMerkleTree.sol";
import "../interfaces/IEventListener.sol";

contract EventListener is IEventListener {
    // The interchain state root.
    bytes32 public interchainStateRoot;
    bytes32 public lastUpdated;
    bytes32 public acknowledgedEventsRoot;
    // bytes32 public acknowledgedEventsRoot;
    
    // The last recorded root of this chain on other chains.
    bytes32 public lastAttestedStateRoot;

    // bytes32 public bridgeId;
    EventEmitter emitter;

    // bytes32 public stateRoot;
    uint public _stateRootUpdated;

    mapping(bytes32 => uint) stateRootToChainRoot;

    mapping(uint256 => bytes32[]) chainIdToProofs; 

    event StateRootUpdated(bytes32 indexed root, bytes32 eventRoot);
    event ProofSubmitted(uint256 indexed chainId, bytes32 indexed proof);

    constructor(address _emitter) public {
        // bytes32 nonce = keccak256(abi.encodePacked(this, blockhash(1), _emitter));
        emitter = EventEmitter(_emitter);
        // emitter.emitEvent(emitter.nonce());
        _updateStateRoot(emitter.nonce());
    }

    function _updateStateRoot(bytes32 root) internal {
        lastUpdated = blockhash(block.number);
        interchainStateRoot = root;
        emitter.acknowledge();
        emit StateRootUpdated(root, emitter.getEventsRoot());
    }

    function checkEvent(
        bytes32 _eventHash,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes memory _stateProof
    ) public returns (bool) {
        // bytes32 eventsRoot = emitter.getEventsRoot();

        bytes32 eventLeaf = MerkleTreeVerifier._hashLeaf(_eventHash);

        require(
            MerkleTreeVerifier._verify(
                eventLeaf,
                acknowledgedEventsRoot,
                _eventsProof,
                _eventsPaths
            ) == true,
            "_eventHash INVALID_PROOF"
        );

        require(
            SparseMerkleTree.verify(
                interchainStateRoot,
                emitter.chainId(),
                acknowledgedEventsRoot,
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
        // require(emitter.getEventsRoot() == _eventsRoot, "EVENT_ROOT_MISMATCH");
        
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
        
        acknowledgedEventsRoot = _eventsRoot;
        _updateStateRoot(_newInterchainStateRoot);
    
    }
}