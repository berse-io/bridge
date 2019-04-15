pragma solidity ^0.5.0;

import "../libs/EventProcessor.sol";
import "../events/EventEmitter.sol";


contract XDAO is EventProcessor {
    // EventEmitter public eventEmitter;

    // mapping(address => uint) vals;

    // enum CrosschainEventTypes {
    //     FAKE,
    //     REAL
    // }

    constructor(EventListener _eventListener, EventEmitter _eventEmitter) EventProcessor(_eventListener, _eventEmitter) public {
        eventEmitter = EventEmitter(_eventEmitter);
    }

    // function bridge(bytes memory data) public {
    //     // emit event
    //     emitEvent(CrosschainEventTypes.FAKE, data);
    // }

    // function claim(bytes memory eventData, bytes memory proof) 
    //     checkEvent(CrosschainEventTypes.FAKE, eventData, proof) 
    //     public 
    // {
    //     vals[msg.sender] = 1;
    // }
}