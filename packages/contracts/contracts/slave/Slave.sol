pragma solidity ^0.5.0;


contract Slave {

    address master;
    uint256 masterChainId;
    mapping(bytes32 => bool) public processed;

    constructor(address _master, uint256 _masterChainId, address _eventListener)  public {
        master = _master;
        masterChainId = _masterChainId;
    }


    function doCall(address payable _to, uint256 _value, bytes memory _data) public {
        // verify event



        _to.call.value(_value)(_data);
    } 

}