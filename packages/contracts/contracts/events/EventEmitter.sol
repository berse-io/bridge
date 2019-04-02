pragma solidity ^0.5.0;

import "../MerkleTreeVerifier.sol";

contract EventEmitter is MerkleTreeVerifier {
    // Events pending acknowledgement on other chains.
    bytes32[] public events;

    event EventEmitted(bytes32 eventHash); 
    
    bytes32 public nonce;

    // key is a temporary parameter to ensure uniqueness
    // when we use a KV merkle tree, we won't need it.
    constructor(string memory key) public {
        nonce = keccak256(abi.encodePacked(this, blockhash(1), key));
    }

    function emitEvent(bytes32 _eventHash) public returns(bool) {
        require(_eventHash != 0x00, "INVALID_EVENT");
        events.push(_eventHash);
        emit EventEmitted(_eventHash);
        // keccak256(abi.encodePacked(msg.sender, _eventHash)) is whats added to the merkle tree of that chain
        // TODO: Implement fee system
        return true;
    }

    function acknowledgeEvents() public {
        // delete pendingEvents;
    }

    function getEventsCount() public view returns (uint) {
        return events.length;
    }

    function getEventsRoot() public view returns(bytes32) {
        if(events.length == 0) return nonce;
        return _computeMerkleRoot(events);
    }

}