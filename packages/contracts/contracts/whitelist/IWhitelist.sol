pragma solidity ^0.5.0;

contract IWhitelist {
    function isWhitelisted(address account) public view returns (bool);
}