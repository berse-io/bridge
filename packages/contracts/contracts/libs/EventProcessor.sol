pragma solidity ^0.5.0;

import "../events/EventListener.sol";
import "./RLP.sol";

contract EventProcessor {
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    using RLP for RLP.RLPItem;
    using RLP for bytes;

    constructor(EventListener _eventListener, EventEmitter _eventEmitter) public {
        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);
    }

    function emitEvent(uint8 eventKey, bytes memory eventData) internal {
        bytes32 h = keccak256(abi.encodePacked(eventKey, eventData));
        eventEmitter.emitEvent(h);
    }

    // _proofData is RLP encoded.
    function checkEvent(uint8 eventKey, bytes memory _proofData, bytes32 _eventHash) internal {
        verifyProof(_proofData, _eventHash);
        // check if event already processed
    }

    function verifyProof(bytes memory _proofData, bytes32 _eventHash) internal { 
        RLP.RLPItem memory item = RLP.toRLPItem(_proofData);
        RLP.RLPItem[] memory params = RLP.toList(item);

        RLP.RLPItem[] memory _eventsProof_list = RLP.toList(params[0]);
        bytes32[] memory _eventsProof = new bytes32[](_eventsProof_list.length);
        for(uint i = 0; i < _eventsProof.length; i++) {
            _eventsProof[i] = _eventsProof_list[i].toBytes32();
        }

        RLP.RLPItem[] memory _eventsPaths_list = RLP.toList(params[1]);
        bool[] memory _eventsPaths = new bool[](_eventsPaths_list.length);
        for(uint i = 0; i < _eventsPaths_list.length; i++) {
            _eventsPaths[i] = _eventsPaths_list[i].toBool();
        }

        bytes32 _stateProofBitmap = RLP.toBytes32(params[2]);
        bytes memory _stateProof = RLP.toData(params[3]);

        require(eventListener.checkEvent(
            // TODO(liamz): replace with actual id
            0,
            _eventHash,
            // _eventsProof,
            _eventsProof,
            // _eventsPaths,
            _eventsPaths,
            // _stateProofBitmap,
            _stateProofBitmap,
            // _stateProof
            _stateProof
        ), "INVALID_EVENT_PROOF");
    }
}