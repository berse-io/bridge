pragma solidity ^0.5.0;

import "./IWhitelist.sol";

contract WhitelistUser {

    IWhitelist public whitelist;

    modifier onlyWhitelisted() {
        require(whitelist.isWhitelisted(msg.sender), "MSG.SENDER_NOT_WHITELISTED");
        _;
    }

    constructor(address _whitelistAddress) public {
        whitelist = IWhitelist(_whitelistAddress);
    }

}