import { IChain } from "@ohdex/multichain";
import { chainLogger } from "../logger";
import { EventEmitter } from "events";


abstract class IChainTracker {
    logger: any;
    events: EventEmitter
    id: string;

    abstract async start(): Promise<any>;
    abstract async stop(): Promise<any>;
}


abstract class ChainTracker extends IChainTracker implements IChain {    
    constructor(chainId: string) {
        super();
        this.id = chainId;

        this.events = new EventEmitter();
        this.logger = chainLogger(chainId)
    }

    abstract listen();
    // abstract computeStateLeaf(): Buffer;

    // abstract getStateRoot(): Buffer;
    // abstract getInterchainStateRoot(): Buffer;
}

export {
    ChainTracker,
}