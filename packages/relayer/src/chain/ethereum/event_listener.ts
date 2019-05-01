import { Web3ProviderEngine } from "0x.js";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { EventListenerContract, EventListenerEvents } from "@ohdex/contracts/lib/build/wrappers/event_listener";
import { ethers } from "ethers";
import { EventEmitter } from "events";
import { StateRootUpdate } from "../../interchain/xchain_state_service";

export interface StateRootUpdated { 
    blockHash: string;
    blockTime: number;
    stateRoot: string;
    eventRoot: string;
}

export class EventListenerAdapter {
    eventListener: EventListenerContract;
    eventListener_sub: ethers.Contract;
    public events = new EventEmitter()

    constructor(
        private ethersProvider: ethers.providers.Provider,
        private logger: any,
        eventListenerAddress: string,
        pe: Web3ProviderEngine,
        txDefaults: any,
        private web3Wrapper: Web3Wrapper
    ) {
        this.eventListener = new EventListenerContract(
            require('@ohdex/contracts/build/artifacts/EventListener.json').compilerOutput.abi,
            eventListenerAddress,
            pe,
            txDefaults
        );
        this.eventListener_sub = new ethers.Contract(
            eventListenerAddress,
            require('@ohdex/contracts/build/artifacts/EventListener.json').compilerOutput.abi,
            this.ethersProvider
        )
    }

    async loadPreviousStateRootUpdates(): Promise<StateRootUpdated[]> {
        let previous = [];

        // 1. Load chain's state root
        // 
        const StateRootUpdated = this.eventListener_sub.filters.StateRootUpdated();
        const StateRootUpdated_logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.eventListener_sub.address,
            topics: StateRootUpdated.topics
        });

        for (const log of StateRootUpdated_logs) {
            let blockTime = (await this.ethersProvider.getBlock(log.blockHash)).timestamp
            
            let { root: stateRoot, eventRoot } = this.eventListener_sub.interface.events.StateRootUpdated.decode(log.data, log.topics)

            let stateRootUpdated: StateRootUpdated = {
                blockHash: log.blockHash,
                blockTime,
                stateRoot,
                eventRoot
            }

            previous.push(stateRootUpdated)
            // this.interchainStateRoot = dehexify(stateRoot);
        }

        return previous;
    }

    listen() {
        let self = this;

        // 2) Listen to any state root updates that happen
        this.eventListener_sub.on(EventListenerEvents.StateRootUpdated, async function(root: string, eventRoot: string, ev: ethers.Event) {
            self.logger.info(`StateRootUpdated root=${root}`)

            let stateRootUpdated: StateRootUpdated = {
                blockHash: ev.blockHash,
                blockTime: (await ev.getBlock()).timestamp,
                stateRoot: root,
                eventRoot,
            }

            self.events.emit('stateRootUpdated', stateRootUpdated);
        })
    }

    async stop() {
        await this.eventListener_sub.removeAllListeners(EventListenerEvents.StateRootUpdated)
    }

    async updateStateRoot(stateRootUpdate: StateRootUpdate) {
        await this.web3Wrapper.awaitTransactionSuccessAsync( 
            await this.eventListener.updateStateRoot.sendTransactionAsync(
                stateRootUpdate.root, 
                stateRootUpdate.eventRoot,
                stateRootUpdate.proof.proofBitmap,
                stateRootUpdate.proof.proofNodes
            )
        );
    }
}