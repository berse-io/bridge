import { ethers } from "ethers";
import { EventEmitterEvents } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { EventEmitter } from "events";

interface EmittedEvent {
    blockTime: number;
    eventHash: string;
}

export class EventEmitterAdapter {
    eventEmitter_web3: any;
    eventEmitter_sub: ethers.Contract;
    public events = new EventEmitter()
    
    constructor(
        private ethersProvider: ethers.providers.Provider,
        private logger: any,
        eventEmitterAddress: string,
    ) {
        this.eventEmitter_sub = new ethers.Contract(
            eventEmitterAddress,
            require('@ohdex/contracts/build/artifacts/EventEmitter.json').compilerOutput.abi,
            this.ethersProvider
        )
    }

    async loadPreviousEvents(): Promise<EmittedEvent[]> {
        let previousEvents = [];

        // 2. Load all previously emitted events (including those that may not be ack'd on other chains yet)
        // 
        const EventEmitted = this.eventEmitter_sub.filters.EventEmitted(null);
        const EventEmitted_logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.eventEmitter_sub.address,
            topics: EventEmitted.topics
        });

        for (const log of EventEmitted_logs) {
            let eventHash = log.data;
            
            let event: EmittedEvent = {
                blockTime: (await this.ethersProvider.getBlock(log.blockHash)).timestamp,
                eventHash
            }
            previousEvents.push(event)
        }

        
        return previousEvents;
    }

    listen() {
        let self = this;

        // 1) Listen to any events emitted from this chain
        this.eventEmitter_sub.on(EventEmitterEvents.EventEmitted, async function(eventHash: string, ev: ethers.Event) {
            self.logger.info(`EventEmitted, block=#${ev.blockNumber} eventHash=${eventHash}`)
            // this.stateGadget.addEvent(eventHash);

            let event: EmittedEvent = { 
                eventHash,
                blockTime: (await self.ethersProvider.getBlock(ev.blockHash)).timestamp,
            }
    
            self.events.emit('eventEmitted', event);
        })
    }

    async stop() {
        await this.eventEmitter_sub.removeAllListeners(EventEmitterEvents.EventEmitted)
    }

}