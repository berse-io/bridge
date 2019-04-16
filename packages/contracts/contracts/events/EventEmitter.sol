pragma solidity ^0.5.0;

import "../libs/LibEvent.sol";
import "../libs/MerkleTreeVerifier.sol";
import "../libs/BytesArrayUtil.sol";
import "../whitelist/WhiteListUser.sol";
import "../interfaces/IEventEmitter.sol";

contract EventEmitter is WhitelistUser, IEventEmitter {
    using LibEvent for bytes32;
    using BytesArrayUtil for bytes32[];

    // Events pending acknowledgement on other chains.
    bytes32[] public events;
    uint256 public chainId;

    event EventEmitted(bytes32 eventHash); 
    
    bytes32 public nonce;



    // Parameters
    // ----------

    // Event acknowledgement is at minimum 1 block after emission
    uint confirmationTime_blocks = 1;

    mapping(uint => uint) blockNumToLastEvent;
    uint lastEmitted_block;
    uint lastAcknowledged_block = block.number;
    uint toConfirm_block = block.number;

    uint lastEventEmitted_block;
    uint unconfirmedEventIdx;


    // key is a temporary parameter to ensure uniqueness
    // when we use a KV merkle tree, we won't need it.
    constructor(
        address _whitelist, 
        uint256 _chainId, 
        string memory key
    ) 
        WhitelistUser(_whitelist) 
        public 
    {
        nonce = keccak256(abi.encodePacked(this, blockhash(block.number - 1), key));
        chainId = _chainId;
        unconfirmedEventIdx = 0;
        lastEventEmitted_block = block.number - confirmationTime_blocks;
        
        emitEvent(nonce);
    }

    function emitEvent(
        bytes32 _eventDataHash
    ) 
        public 
        returns (bytes32) 
    {
        // DODGY(liamz): the default is 0, which is also the same value as when there are no events.
        //               nothing bad for now, but worth keeping in mind.
        // if(block.number > (lastEmitted_block + confirmationTime_blocks)) {
        //     blockNumToLastEvent[block.number - 1] = events.length - 1;
        //     toConfirm_block = block.number;
        // }

        // if(block.number > (lastEmitted_block + confirmationTime_blocks))
        // lastEmitted_block = block.number;

        require(_eventDataHash != 0x00, "INVALID_EVENT_DATA");

        // If this is the first tx on a new block
        // if(block.number > lastEventEmitted_block) {
        //     uint confirm_block = block.number - confirmationTime_blocks;
        //     // Update the latest block we've seen
        //     lastEventEmitted_block = block.number;       // - confirmationTime_blocks;
        //     // Set the most recent event to ack as the most recent event we've seen
        //     // ie. the last block we processed, emitted this event
        //     unconfirmedEventIdx = events.length;
        // }

        // TODO implement some way of checking from which chain a event came
        bytes32 eventHash = LibEvent.getEventHash(_eventDataHash, msg.sender, chainId);
        events.push(eventHash);

        emit EventEmitted(eventHash);
        // TODO: Implement fee system

        
        
        return eventHash;
    }

    function getEventsCount() 
        public 
        view 
        returns (uint) 
    {
        return events.length;
    }

    function getLastEventToConfirm() 
        public
        view
        returns (uint)
    {
        // We want to get the events root
        // but also excluding events that were emitted during this block.
        // #racey #justblockchainthings
        // 
        // Rather than a fixed value, we parameterise this as acknowledgementDelay,
        // which is the index of the last event emitted in acknowledgementDelay_blocks


        // Events up until this block are awaiting confirmation
        uint confirm_block = block.number - confirmationTime_blocks;


        if(lastEventEmitted_block < confirm_block) {
            // The next update needs to acknowledge all events
            // Since it was so far in the past.
            return events.length;
        } else {
            // Else if there were events in the past `confirmationTime` blocks,
            // return the index of the most recent event that falls WITHIN the window
            return unconfirmedEventIdx;
        }
    }

    function getEventsRoot() 
        public 
        view 
        returns(bytes32) 
    {
        // if(events.length == 0) {
        //     // return bytes32(0);
        //     return nonce;
        // }

        return MerkleTreeVerifier._computeMerkleRoot(
            // events.sliceTo(getLastEventToConfirm())
            events
        );
    }

    function acknowledge() 
        public 
    {
        lastAcknowledged_block = block.number;
        unconfirmedEventIdx = events.length;
    }

}