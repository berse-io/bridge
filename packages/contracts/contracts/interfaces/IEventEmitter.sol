pragma solidity ^0.5.0;

interface IEventEmitter {
    function emitEvent(bytes32 _eventHash) external returns(bytes32);
}