pragma solidity ^0.5.0;

interface IEventEmitter {
    event EventEmitted(bytes32 eventHash);

    function emitEvent(bytes32 _eventDataHash) external returns(bytes32);
}