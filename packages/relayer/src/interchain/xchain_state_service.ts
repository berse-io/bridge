import { inject } from "@loopback/context";
import { MerkleTreeProof, SparseMerkleTree, SparseMerkleProof, deconstructProof } from "@ohdex/typescript-solidity-merkle-tree";
import { ChainStateLeaf, CrosschainEventProof } from "./crosschain_state";
import { Repository } from "typeorm";
import { Chain } from "../db/entity/chain";
import { ChainEvent } from "../db/entity/chain_event";
import { InterchainStateUpdate } from "../db/entity/interchain_state_update";
import _ from 'lodash'
import { dehexify, hexify } from "@ohdex/shared";
import { EthereumStateLeaf } from "../chain/ethereum/state_gadget";
import { getCurrentBlocktime } from "./helpers";
import { StateTree, EventTree, ChainRoot, InterchainState } from "./trees";
import { BlockWithTransactionData } from "ethereum-protocol";

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
    @inject('logging.default') logger;

    constructor(    
    ) {
    }

    async getStateTree(time: number): Promise<StateTree> {
        // Get all exchain state roots
        let chains = (await this.chain.find()).map(({ chainId }) => chainId)

        let state: InterchainState = {}

        await Promise.all(chains.map(async chainId => {
            let eventsTree = await this.getEventsTree(chainId, time);
            // return InterchainStateUpdate.getLatestStaterootAtTime(chainId, time)
            let root: ChainRoot = {
                eventsRoot: eventsTree.root()
            }
            state[chainId] = root;
        }))

        let stateTree = new StateTree(state)

        return stateTree
    }

    async getEventsTree(chainId: number, time: number) {
        let events = await ChainEvent.getEventsBeforeTime(chainId, time);
        if(!events.length) throw new Error("No events");
        return await EventTree(events)
    }

    async proveStateRootUpdate(chainId: number): Promise<StateRootUpdate> {
        const time = getCurrentBlocktime()
        
        let stateTree = await this.getStateTree(time)
        
        let proof = deconstructProof(stateTree.generateProof(chainId))

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
        const time = getCurrentBlocktime()

        // Reconstruct the most recent state update of this chain
        
        // 1) first we get the time of that event on the exchain
        let ev = await this.chainEvent.findOne({ eventHash }, { relations: ['chain'] })
        if(!ev) throw new Error("Couldn't find event")
        if(ev.chain.chainId !== exchainId) throw new Error("Found event but it is from a different chain")

        let latestStateUpdate = await InterchainStateUpdate.getLatestStaterootAtTime(chainId, time)
        if(ev.blockTime > latestStateUpdate.blockTime) {
            throw new Error('Exchain event not acknowledged on chain')
        }
        
        // 2) now reconstruct the trees
        let stateTree = await this.getStateTree(latestStateUpdate.blockTime);
        let eventsTree = await this.getEventsTree(exchainId, latestStateUpdate.blockTime)

        // 3) prove
        let stateProof = deconstructProof(stateTree.generateProof(exchainId))
        let eventIdx = eventsTree.findLeafIndex(dehexify(ev.eventHash))
        let eventLeafProof = eventsTree.generateProof(eventIdx)

        let eventProof: EventProof = {
            stateProof,
            eventLeafProof
        };

        this.logger.log('debug', `proveEvent(${arguments})`)
        this.logger.log('debug', stateTree.state)
        this.logger.log('debug', eventsTree.leaves)

        return eventProof;
    }
}




// // we have to reconstruct the merkle tree at the time of that event
//         // so we can construct a proof that will be valid on that chain

        // // first we get the time of that event on the exchain
        // let ev = await this.chainEvent.findOne({ eventHash }, { relations: ['chain'] })
        // if(!ev) throw new Error("couldn't find event")
        // if(ev.chain.chainId !== exchainId) throw new Error("found event but it is from a different chain")

//         // and then we get the most recent state update of this chain
//         let latestStateUpdate = await InterchainStateUpdate.getLatestStaterootAtTime(chainId, time+10)

//         // we figure out what the event tree would've looked like **for the exchain**
//         let exchainEvents = await ChainEvent.getEventsBeforeTime(exchainId, latestStateUpdate.blockTime);

        
//         if(!exchainEvents.length) throw new Error('no events');
//         if(_.findIndex(exchainEvents, x => x.eventHash == eventHash) === -1) throw new Error("couldn't find event in exchain history")

//         let exchainEventsTree = EventTree(exchainEvents)
//         let exchainEventIdx = _.findIndex(exchainEvents, x => x.eventHash == eventHash)

//         // then we recompute the state tree for this chain
//         // taking into account the latest state roots at that time
//         let chains = (await this.chain.find()).map(({ chainId }) => chainId)
//         let chainRoots = await Promise.all(chains.map(chainId_ => {
//             return InterchainStateUpdate.getLatestStaterootAtTime(chainId_, latestStateUpdate.blockTime)
//         }))

//         let state: InterchainState = {};
//         chainRoots.map(root => {
//             state[root.chain.chainId] = {
//                 eventsRoot: dehexify(root.eventRoot)
//             }
//         })
//         let stateTree = new StateTree(state)

//         let stateProof = deconstructProof(stateTree.generateProof(exchainId))
//         // let eventProof = exchainEventsTree.generateProof(exchainEventIdx)

//         let eventProof: EventProof = {
//             stateProof,
//             eventLeafProof: 
//         }

//         // if(!stateTree.verifyProof(stateProof, exchainEventsTree.hashLeaf(eventProof.root) )) throw new Error()
//         if(!stateTree.verifyProof(stateProof)) throw new Error()


//         return {
//             rootProof: stateProof,
//             eventProof
//         }