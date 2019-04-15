pragma solidity ^0.5.0;

import "../libs/LibEvent.sol";
import "../MerkleTreeVerifier.sol";
import "../whitelist/WhiteListUser.sol";
import "../interfaces/IEventEmitter.sol";

contract EventEmitter is WhitelistUser, IEventEmitter {
    using LibEvent for bytes32;

    // Events pending acknowledgement on other chains.
    bytes32[] public events;
    uint256 public chainId;
    event EventEmitted(bytes32 eventHash); 
    
    bytes32 public nonce;

    // key is a temporary parameter to ensure uniqueness
    // when we use a KV merkle tree, we won't need it.
    constructor(address _whitelist, uint256 _chainId, string memory key) WhitelistUser(_whitelist) public {
        nonce = keccak256(abi.encodePacked(this, blockhash(block.number - 1), key));
        chainId = _chainId;
    }

    function emitEvent(bytes32 _eventHash) public returns(bytes32) {
        require(_eventHash != 0x00, "INVALID_EVENT");
        // TODO implement some way of checking from which chain a event came
        bytes32 markedEventHash = _eventHash.getMarkedEvent(msg.sender, chainId);
        events.push(markedEventHash);
        emit EventEmitted(markedEventHash);
        // TODO: Implement fee system
        return markedEventHash;
    }

    function acknowledgeEvents() public {
        // delete pendingEvents;
    }

    function getEventsCount() public view returns (uint) {
        return events.length;
    }

    function getEventsRoot() public view returns(bytes32) {
        return MerkleTreeVerifier._computeMerkleRoot(events);
    }

}