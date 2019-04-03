pragma solidity ^0.5.0;

import "../events/EventEmitter.sol";
import "../events/EventListener.sol";

contract ITokenBridge {
    uint256 chainId;
    // bytes32 public tokenBridgeId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    mapping(bytes32 => bool) public processedEvents;

    event TokensBridged(
        bytes32 eventHash, 
        address targetBridge, 
        uint256 indexed chainId, address indexed receiver, address indexed token, uint256 amount, uint256 _salt
    );

    constructor(EventListener _eventListener, EventEmitter _eventEmitter) public {
        // tokenBridgeId = keccak256(abi.encodePacked(this, blockhash(1)));
        // tokenBridgeId = abi.encodePacked(bytes12(0x000000000000000000000000), address(this));
        // tokenBridgeId = bytes32(uint256(address(this)) << 96);

        eventListener = _eventListener;
        eventEmitter = _eventEmitter;
    }
    
    function _createBridgeTokenEvent(
        address _targetBridge, address _receiver, address _token, uint256 _amount, uint256 _chainId, uint256 _salt, bool _bridgingBack
    ) internal {
        bytes32 eventHash = _getTokensBridgedEventHash(
            _token, _receiver, _amount, _salt, _chainId, _bridgingBack
        );
        eventHash = eventEmitter.emitEvent(eventHash); //Emit and return marked event reusing the variable
        emit TokensBridged(eventHash, _targetBridge, _chainId, _receiver, _token, _amount, _salt);
    }

    function _getTokensBridgedEventHash(
       address _token, 
       address _receiver,
       uint256 _amount,
       uint256 _salt,
       uint256 _targetChainId,
       bool _bridgingBack
       
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _receiver, _token, _amount, _salt, _targetChainId, _bridgingBack
        ));
    }

    function _checkEventProcessed(bytes32 eventHash) internal {
        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;
    }
}