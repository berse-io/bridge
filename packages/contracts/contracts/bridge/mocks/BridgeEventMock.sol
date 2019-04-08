pragma solidity ^0.5.0;

import '../ITokenBridge.sol';

contract BridgeEventMock is ITokenBridge {


    constructor() ITokenBridge(EventListener(address(0)), EventEmitter(address(0))) public {
        // silence!
    }

    function tokensClaimed(address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt) public {
        emit TokensClaimed(_token, _receiver, _amount, _chainId, _salt);
    }
}