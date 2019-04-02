pragma solidity ^0.5.0;

library LibEvent {

    function getMarkedEvent(bytes32 _eventHash, address _triggerAddress, uint256 _triggerChain) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_eventHash, _triggerAddress, _triggerChain));
    }

}