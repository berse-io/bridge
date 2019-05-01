pragma solidity ^0.5.0;

// import '../libs/LibEvent.sol';
// import "../events/EventListener.sol";
// // import './IEvents.sol';

contract Slave {}
// contract Slave is IEvents {

//     using LibEvent for bytes32;

//     address master;
//     uint256 masterChainId;

//     mapping(bytes32 => bool) public processed;

//     EventListener public eventListener;

//     constructor(address _master, uint256 _masterChainId, address _eventListener)  public {
//         master = _master;
//         masterChainId = _masterChainId;
//         eventListener = EventListener(_eventListener);
//     }


//     function doCall(
//         address payable _to,
//         uint256 _value,
//         bytes memory _data,
//         bytes32[] memory _proof,
//         bool[] memory _proofPaths,
//         bytes32[] memory _eventsProof,
//         bool[] memory _eventsPaths,
//         bytes32 _eventsRoot
//     ) public {
//         // verify event
//         bytes32 eventHash = createCallEvent(_to, _value, _data);
//         eventHash = eventHash.getMarkedEvent(master, masterChainId);
//         require(eventListener.checkEvent(_proof, _proofPaths, _eventsProof, _eventsPaths, _eventsRoot, eventHash), "EVENT_NOT_FOUND");
//         _to.call.value(_value)(_data);
//     } 

// }