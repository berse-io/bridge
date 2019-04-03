import { inject } from "@loopback/context";
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { ChainStateLeaf, CrosschainEventProof } from "./crosschain_state";
import { Repository } from "typeorm";
import { Chain } from "../db/entity/chain";
import { ChainEvent } from "../db/entity/chain_event";
import { InterchainStateUpdate } from "../db/entity/interchain_state_update";
import _ from 'lodash'
import { dehexify, hexify } from "@ohdex/shared";
import { EthereumStateLeaf } from "../chain/ethereum/state_gadget";
import { getCurrentBlocktime } from "./helpers";
import { StateTree, EventTree } from "./trees";


export class CrosschainStateService {
    @inject('repositories.Chain') chain: Repository<Chain>
    @inject('repositories.ChainEvent') chainEvent: Repository<ChainEvent>
    @inject('repositories.InterchainStateUpdate') stateUpdate: Repository<InterchainStateUpdate>

    constructor(    
    ) {
    }

    async computeUpdatedStateRoot(chainId: number): Promise<{ proof: MerkleTreeProof, leaf: ChainStateLeaf }> {
        const time = getCurrentBlocktime()
        
        // Get all exchain state roots
        let chains = (await this.chain.find()).map(({ chainId }) => chainId)

        let exchainRoots = await Promise.all(chains.map(async chainId => {
            let events = await ChainEvent.getEventsBeforeTime(chainId, time);
            let eventsTree = EventTree(events)
            return {
                chain: { chainId, },
                eventRoot: hexify(eventsTree.root())
            }
            // return InterchainStateUpdate.getLatestStaterootAtTime(chainId, time)
        }))
        
        // Compute our (new) state root
        let evs = await ChainEvent.getEventsBeforeTime(chainId, time)
        let eventsTree = EventTree(evs)
        

        // note: we don't use merkle-patricia trees yet because of implementation cost
        // so we have to canonically sort the items for the merkle tree computation
        // I've decided sorting based on chainId of the bridges is reasonable for now
        // exchainRoots = [...exchainRoots, update]
        let items = _.sortBy(exchainRoots, 'chain.chainId')

        let thisChainIdx = _.findIndex(items, x => x.chain.chainId == chainId)
        items[thisChainIdx].eventRoot = hexify(eventsTree.root());

        
        let stateTree = StateTree(items)
        
        let proof = stateTree.generateProof(thisChainIdx)
        // if(!stateTree.verifyProof(proof, eventsTree.hashLeaf(eventsTree.root()) )) throw new Error()

        let leaf = new EthereumStateLeaf
        leaf.eventsRoot = eventsTree.root()

        // console.log(stateTree.toString())
        // console.log(eventsTree.toString())

        return {
            proof,
            leaf
        }
    }

    // Proves an event for a chain (chainId) from an external chain (exchainId)
    // 
    // This involves reconstructing the state tree of this chain,
    // and reconstructing the events tree of the exchain at the time it was acknowledged in the state update
    // of this chain.
    async proveEvent(chainId: number, exchainId: number, eventHash: string): Promise<CrosschainEventProof> {
        const time = getCurrentBlocktime()

        // we have to reconstruct the merkle tree at the time of that event
        // so we can construct a proof that will be valid on that chain

        // first we get the time of that event on the exchain
        let ev = await this.chainEvent.findOne({ eventHash }, { relations: ['chain'] })
        if(!ev) throw new Error("couldn't find event")
        if(ev.chain.chainId !== exchainId) throw new Error("found event but it is from a different chain")

        // and then we get the most recent state update of this chain
        let latestStateUpdate = await InterchainStateUpdate.getLatestStaterootAtTime(chainId, time+10)

        // we figure out what the event tree would've looked like **for the exchain**
        let exchainEvents = await ChainEvent.getEventsBeforeTime(exchainId, latestStateUpdate.blockTime);
        // console.log(await ChainEvent.find({ relations: ['chain']}))
        // console.log(latestStateUpdate)
        
        if(!exchainEvents.length) throw new Error('no events');
        if(_.findIndex(exchainEvents, x => x.eventHash == eventHash) === -1) throw new Error("couldn't find event in exchain history")

        let exchainEventsTree = EventTree(exchainEvents)
        let exchainEventIdx = _.findIndex(exchainEvents, x => x.eventHash == eventHash)

        // then we recompute the state tree for this chain
        // taking into account the latest state roots at that time
        let chains = (await this.chain.find()).map(({ chainId }) => chainId)
        let chainRoots = await Promise.all(chains.map(chainId_ => {
            return InterchainStateUpdate.getLatestStaterootAtTime(chainId_, latestStateUpdate.blockTime)
        }))
        let items = _.sortBy(chainRoots, 'chain.chainId')

        let stateTree = StateTree(items)
        let exchainStateIdx = _.findIndex(items, x => x.chain.chainId == exchainId)

        let stateProof = stateTree.generateProof(exchainStateIdx)
        let eventProof = exchainEventsTree.generateProof(exchainEventIdx)

        
        // console.log(stateTree.toString())
        // console.log(exchainEventsTree.toString())

        // console.log(await this.stateUpdate.find({ relations: ['chain'] }))
        // console.log((await this.chainEvent.find({ relations: ['chain'] })))

        // if(stateProof.leaf != )
    
        // if(!stateTree.verifyProof(stateProof, exchainEventsTree.hashLeaf(eventProof.root) )) throw new Error()
        if(!stateTree.verifyProof(stateProof)) throw new Error()


        return {
            rootProof: stateProof,
            eventProof
        }
    }
}
