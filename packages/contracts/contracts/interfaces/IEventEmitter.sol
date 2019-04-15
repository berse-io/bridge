interface IEventEmitter {
    function emitEvent(bytes32 _eventHash) external returns(bytes32);
}