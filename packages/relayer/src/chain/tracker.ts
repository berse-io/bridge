import { BlockWithTransactionData } from "ethereum-protocol";
import { EventEmitter } from "../declarations";
import { IChain } from "@ohdex/multichain";
import { ITokenBridgeEventArgs } from "@ohdex/contracts/lib/build/wrappers/i_token_bridge";
const eventEmitter = require("events");


import Event from 'events'
import { chainLogger } from "../logger";


interface EventEmittedEvent {
    eventHash: string;
    newChainRoot: string;
    newChainIndex: string;
}

type chainId = string
interface MessageSentEvent {
    fromChain: chainId;
    fromChainId: number;
    toBridge: string;
    data: ITokenBridgeEventArgs;
    eventHash: string;
}

interface ChainEvents {
    "EventEmitter.EventEmitted": EventEmittedEvent,
    "ITokenBridge.TokensBridgedEvent": MessageSentEvent,
    "StateRootUpdated": any
}

abstract class IChainTracker {
    logger: any;
    events: EventEmitter<ChainEvents>;
    id: string;

    abstract async start(): Promise<any>;
    abstract async stop(): Promise<any>;
}


abstract class ChainTracker extends IChainTracker implements IChain {    
    constructor(chainId: chainId) {
        super();
        this.id = chainId;

        this.events = new eventEmitter();
        this.logger = chainLogger(chainId)
    }

    abstract listen();
    // abstract computeStateLeaf(): Buffer;

    // abstract getStateRoot(): Buffer;
    // abstract getInterchainStateRoot(): Buffer;
}

export {
    ChainEvents,
    ChainTracker,
    EventEmittedEvent,
    MessageSentEvent
}