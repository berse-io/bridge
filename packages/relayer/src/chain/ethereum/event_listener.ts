import { ethers } from "ethers";
import { Web3ProviderEngine } from "0x.js";
import { EventListenerContract, EventListenerEvents } from "@ohdex/contracts/lib/build/wrappers/event_listener";
import { EventEmitter } from "events";
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { EthereumStateLeaf } from "./state_gadget";
import { hexify } from "@ohdex/shared";

interface StateRootUpdated { 
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
        txDefaults: any
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

    async updateStateRoot(proof: MerkleTreeProof, leaf: EthereumStateLeaf) {
        return this.eventListener.updateStateRoot.sendTransactionAsync(
            proof.proofs.map(hexify),
            proof.paths,
            hexify(proof.root),
            hexify(leaf.eventsRoot)
        )
    }
}



            // this.interchainStateRoot = dehexify(root);
            // this.lastUpdated = dehexify(await this.eventListener.lastUpdated.callAsync())