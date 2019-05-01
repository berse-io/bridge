pragma solidity ^0.5.0;

contract IEvents {

    function createCallEvent(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(_to, _value, _data));
    } 
}
