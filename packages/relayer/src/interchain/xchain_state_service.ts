import { inject } from "@loopback/context";
import { MerkleTreeProof, SparseMerkleTree, SparseMerkleProof, deconstructProof } from "@ohdex/typescript-solidity-merkle-tree";
import { Repository } from "typeorm";
import { Chain } from "../db/entity/chain";
import { ChainEvent } from "../db/entity/chain_event";
import { InterchainStateUpdate } from "../db/entity/interchain_state_update";
import _ from 'lodash'
import { dehexify, hexify } from "@ohdex/shared";
import { getCurrentBlocktime } from "./helpers";
import { StateTree, EventTree, ChainRoot, InterchainState, EventTreeFactory } from "./trees";
import { BlockWithTransactionData } from "ethereum-protocol";
import { Snapshot } from "../db/entity/snapshot";

export interface StateRootUpdate {
    root: string;
    eventRoot: string;
    proof: SparseMerkleProof;
}

export interface EventProof {
    stateProof: SparseMerkleProof;
    eventLeafProof: MerkleTreeProof;
}


export class CrosschainStateService {
    @inject('repositories.Chain') chain: Repository<Chain>
    @inject('repositories.ChainEvent') chainEvent: Repository<ChainEvent>
    @inject('repositories.InterchainStateUpdate') stateUpdate: Repository<InterchainStateUpdate>
    @inject('repositories.Snapshot') snapshots: Repository<Snapshot>
    @inject('logging.default') logger;

    constructor(    
    ) {
    }

    async getStateTree(): Promise<StateTree> {
        const time = getCurrentBlocktime()

        // Get all exchain state roots
        let chains = (await this.chain.find()).map(({ chainId }) => chainId)

        let state: InterchainState = {}

        await Promise.all(chains.map(async chainId => {
            let eventsTree = await this.getEventsTree(chainId, time);
            // return InterchainStateUpdate.getLatestStaterootAtTime(chainId, time)
            let root: ChainRoot = {
                eventsRoot: eventsTree.root(),
                eventsTree: eventsTree
            }
            state[chainId] = root;
        }))

        let stateTree = new StateTree(state)

        return stateTree
    }

    async getEventsTree(chainId: number, time: number) {
        let events = await ChainEvent.getEventsBeforeTime(chainId, time);
        if(!events.length) throw new Error("No events");
        return await EventTreeFactory.create(events)
    }

    async addSnapshot(chainId: number, stateTree: StateTree) {
        let snapshot = new Snapshot()
        snapshot.stateTree = stateTree;
        snapshot.stateRoot = stateTree.root;
        snapshot.chain = await this.chain.findOne(chainId)
        // await snapshot.save()
        await Snapshot.insert(snapshot)
    }

    async proveStateRootUpdate(chainId: number): Promise<StateRootUpdate> {
        
        let stateTree = await this.getStateTree()
        let proof = deconstructProof(stateTree.generateProof(chainId))
        
        await this.addSnapshot(chainId, stateTree)

        let stateRootUpdate: StateRootUpdate = {
            root: stateTree.root,
            eventRoot: hexify(stateTree.state[chainId].eventsRoot),
            proof
        }

        this.logger.log('debug', `computeUpdatedStateRoot(chainId=${chainId})`)
        this.logger.log('debug', stateTree.state)
        this.logger.log('debug', stateRootUpdate)

        return stateRootUpdate
    }

    // Proves an event for a chain (chainId) from an external chain (exchainId)
    // 
    // This involves reconstructing the state tree of this chain,
    // and reconstructing the events tree of the exchain at the time it was acknowledged in the state update
    // of this chain.
    async proveEvent(chainId: number, exchainId: number, eventHash: string): Promise<EventProof> {
        this.logger.debug(`proveEvent(${JSON.stringify(arguments,null,1)})`)
        const time = getCurrentBlocktime()

        // Reconstruct the most recent state update of this chain
        
        // 1) first we get the time of that event on the exchain
        let ev = await this.chainEvent.findOne({ eventHash }, { relations: ['chain'] })
        if(!ev) throw new Error("Couldn't find event")
        if(ev.chain.chainId !== exchainId) throw new Error("Found event but it is from a different chain")

        // this.logger.debug(JSON.stringify(
        //     await Snapshot.find({ loadRelationIds: true }),
        //     null, 1)
        // )
        this.logger.debug(
            (await Snapshot.find({ loadRelationIds: true })).map(x => x.stateTree.toString()).join('\n\n\n')
        )

        let latestStateUpdate = await InterchainStateUpdate.getLatestStaterootAtTime(chainId, time)
        console.log(latestStateUpdate)

        if(ev.blockTime > latestStateUpdate.blockTime) {
            throw new Error('Exchain event not acknowledged on chain')
        }
        
        // // 2) now reconstruct the trees
        // let stateTree = await this.getStateTree(latestStateUpdate.blockTime);
        // let eventsTree = await this.getEventsTree(exchainId, latestStateUpdate.blockTime)
        let snapshot = latestStateUpdate.snapshot

        // this.logger.log('debug', snapshot.stateTree.toString())

        // async getSnapshot() {
        //     console.log(this)
        //     let snapshot = await Snapshot.findOne(this.snapshot)
        //     if(this.snapshot == null) {
        //         throw new Error("Snapshot should not be null in single-relayer implementation")
        //     }
        //     return snapshot
        // }
        

        // 3) prove
        // if(snapshot.stateTree.state[exchainId].eventsRoot.equals(otherBuffer))

        let stateProof = deconstructProof(snapshot.stateTree.generateProof(exchainId))
        
        let eventsTree = snapshot.stateTree.getEventsTree(exchainId)
        let eventIdx = eventsTree.findLeafIndex(dehexify(ev.eventHash))
        let eventLeafProof = eventsTree.generateProof(eventIdx)
        eventsTree.verifyProof(eventLeafProof)
        // this.logger.debug(eventIdx)

        let eventProof: EventProof = {
            stateProof,
            eventLeafProof
        };

        // this.logger.log('debug', `proveEvent(${arguments})`)
        // this.logger.log('debug', stateTree.state)
        // this.logger.log('debug', eventsTree.leaves)

        return eventProof;
    }
}


// debug: proveEvent({
//     "0": 4,
//     "1": 42,
//     "2": "0x139f76c7517676c8adf84a5bf4e7d187577aee1a61eb3fce7f6242fcbda32d28"
// })

// chain=4
// exchain=42

// let stateProof = deconstructProof(snapshot.stateTree.generateProof(exchainId))

// let eventIdx = snapshot.stateTree.getEventsTree(42).findLeafIndex(dehexify(ev.eventHash))
// let eventLeafProof = snapshot.stateTree.getEventsTree(42).generateProof(eventIdx)

// let eventProof: EventProof = {
//     stateProof,
//     eventLeafProof
// };