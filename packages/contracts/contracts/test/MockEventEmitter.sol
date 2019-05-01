pragma solidity ^0.5.0;

import "../interfaces/IEventEmitter.sol";
import "../libs/LibEvent.sol";

contract MockEventEmitter is IEventEmitter {
    uint public chainId;

    constructor(
        uint _chainId
    ) 
        public
    {
        chainId = _chainId;
    }

    function emitEvent(
        bytes32 _eventDataHash
    ) 
        external 
        returns (bytes32) 
    {
        bytes32 eventHash = LibEvent.getEventHash(_eventDataHash, msg.sender, chainId);
        emit IEventEmitter.EventEmitted(eventHash);
        return eventHash;
    }
}