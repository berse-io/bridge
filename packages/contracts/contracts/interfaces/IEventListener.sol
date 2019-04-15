pragma solidity ^0.5.0;

interface IEventListener {
    function checkEvent(
        bytes32 _eventHash,
        bytes32[] calldata _eventsProof,
        bool[] calldata _eventsPaths,
        bytes32 _stateProofBitmap,
        bytes calldata _stateProof
    ) external returns (bool);
}