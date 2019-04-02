pragma solidity ^0.5.0;

import "../libs/LibEvent.sol";
import "../MerkleTreeVerifier.sol";
import "../whitelist/WhiteListUser.sol";


contract EventEmitter is MerkleTreeVerifier, WhitelistUser {

    using LibEvent for bytes32;

    // Events pending acknowledgement on other chains.
    bytes32[] public events;
    uint256 public chainId;
    event EventEmitted(bytes32 eventHash); 
    
    constructor(address _whitelist, uint256 _chainId) WhitelistUser(_whitelist) public {
        chainId = _chainId;
    }

    function emitEvent(bytes32 _eventHash) public onlyWhitelisted returns(bytes32) {
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
        if(events.length == 0) return 0x0000000000000000000000000000000000000000000000000000000000000000;
        return _computeMerkleRoot(events);
    }

}