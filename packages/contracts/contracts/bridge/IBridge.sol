pragma solidity ^0.5.0;

interface IBridge {
    // deposit:
    //     deposit tokens on chain
    //     emits crosschain event

    // issueBridged:
    //     verify deposit is locked
    //     mint bridged tokens

    // burnBridged:
    //     burn bridged tokens

    // withdraw:
    //     burn bridge tokens
    //     transfer deposit to amount
}