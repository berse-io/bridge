import { ChainEvent } from "../db/entity/chain_event";
import { MerkleTree, SparseMerkleTree } from "@ohdex/typescript-solidity-merkle-tree";

import { dehexify, hexify } from "@ohdex/shared";
import { keccak256 } from "../utils";
import { BigNumber } from "0x.js";
import { SchemaEventTree, SerialisationUtils, SchemaStateTree, staticImplements, ISerialisableStatic } from "./trees_sz";




export class EventTreeFactory {
    static async create(items: ChainEvent[]): Promise<EventTree> {
        return new EventTree(
            items.map(ev => dehexify(ev.eventHash)),
            keccak256
        )
    }
}



@staticImplements<ISerialisableStatic>()
export class EventTree extends MerkleTree {
    sz(): string {
        return JSON.stringify(this);
    }

    static dsz(x: string, data?: SchemaEventTree): EventTree {
        let obj = Object.create(this.prototype);

        data = data || SerialisationUtils.parse<SchemaEventTree>(x)
        obj.hashFn = keccak256;
        obj.hashSizeBytes = 32;
        obj.items = data.items.map(dehexify);
        obj.layers = data.layers.map(layer => layer.map(dehexify));

        return obj;
    }
}


export interface ChainRoot {
    eventsRoot: Buffer;
    eventsTree: EventTree;
}

export interface InterchainState {
    [chainId: string]: ChainRoot
}

class InterchainStateAdapter {
    static getKey(chainId: number | string) {
        return new BigNumber(chainId).toString()
    }

    static getValue(root: ChainRoot): string {
        return hexify(root.eventsRoot);
    }
}


@staticImplements<ISerialisableStatic>()
export class StateTree {
    tree: SparseMerkleTree;
    state: InterchainState;

    constructor(
        state: InterchainState
    ) {
        this.state = state;

        let state2 = {}
        Object.entries(state).map(([k, v]) => {
            state2[InterchainStateAdapter.getKey(k)] = InterchainStateAdapter.getValue(v)
        })

        this.tree = new SparseMerkleTree(256, state2)
    }

    get root(): string {
        return this.tree.root;
    }

    getEventsTree(chainId: number): EventTree {
        return this.state[chainId].eventsTree;
    }

    generateProof(chainId: number) {
        let key = InterchainStateAdapter.getKey(chainId)
        let proof = this.tree.createMerkleProof(
            InterchainStateAdapter.getKey(chainId)
        )

        // TODO(liamz): should be invariant but just to be sure.

        let leaf = this.state[chainId].eventsRoot
        
        this.tree.verify(proof, key, hexify(leaf))
        
        return proof;
    }

    sz(): string {
        return JSON.stringify(this);
    }

    static dsz(s: string, data?: SchemaStateTree): StateTree {
        data = data || SerialisationUtils.parse<SchemaStateTree>(s);
        let obj = Object.create(this.prototype) as StateTree;
        
        obj.state = {};

        Object.keys(data.state).map(k => {
            obj.state[k] = {
                eventsRoot: dehexify(data.state[k].eventsRoot),
                eventsTree: EventTree.dsz("", data.state[k].eventsTree)
            }
        })

        obj.tree = Object.create(SparseMerkleTree.prototype);
        obj.tree = Object.assign(obj.tree, data.tree);
        
        return obj;
    }

    toString(): string {
        let str = '';
        str += `STATE:\n`
        str += `root = ${this.root}\n`
        Object.keys(this.state).map(k => {
            str += `\t${k}`.padEnd(5) + `= ${this.state[k].eventsTree.root().toString('hex')}` + `\n`
        })
        str += `\n\n`
        str += `EVENT TREES:\n`
        Object.keys(this.state).map(k => {
            let evs = this.state[k]
            str += `chainId=${k}\n`
            str += evs.eventsTree.toString()
            str += `\n`
        })

        return str;
    }
}
