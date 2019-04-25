pragma solidity ^0.5.0;

library LibEvent {
    function getEventHash(
        bytes32 _eventDataHash, 
        address _triggerAddress, 
        uint256 _triggerChain
    ) 
        internal 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(
            _eventDataHash, 
            _triggerAddress, 
            _triggerChain
        ));
    }

}