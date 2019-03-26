pragma solidity ^0.5.0;

import "../MerkleTreeVerifier.sol";
import "../whitelist/WhiteListUser.sol";


contract EventEmitter is MerkleTreeVerifier, WhitelistUser {
    // Events pending acknowledgement on other chains.
    bytes32[] public events;
    // uint256 public chainId;
    event EventEmitted(bytes32 eventHash); 
    
    constructor(address _whitelist) WhitelistUser(_whitelist) public {
        
    }

    function emitEvent(bytes32 _eventHash) public onlyWhitelisted returns(bool) {
        require(_eventHash != 0x00, "INVALID_EVENT");
        // TODO add msg.sender to event hash (https://gitlab.com/berse.io/monorepo/issues/4)
        // TODO add chain ID of current chain to event
        
        // bytes32 markedEventHash = keccak256(abi.encodePacked(msg.sender, _eventHash));
        
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
        if(events.length == 0) return 0x0000000000000000000000000000000000000000000000000000000000000000;
        return _computeMerkleRoot(events);
    }

}