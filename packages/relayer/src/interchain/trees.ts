import { ChainEvent } from "../db/entity/chain_event";
import { MerkleTree, SparseMerkleTree } from "@ohdex/typescript-solidity-merkle-tree";

import { dehexify, hexify } from "@ohdex/shared";
import { keccak256 } from "../utils";
import { InterchainStateUpdate } from "../db/entity/interchain_state_update";
import { BigNumber } from "0x.js";



export async function EventTree(items: ChainEvent[]) {
    return new MerkleTree(
        items.map(ev => dehexify(ev.eventHash)),
        keccak256
    )
}


export interface ChainRoot {
    eventsRoot: Buffer;
}

export interface InterchainState {
    [chainId: number]: ChainRoot
}

class InterchainStateAdapter {
    static getKey(chainId: number | string) {
        return new BigNumber(chainId).toString()
    }

    static getValue(root: ChainRoot): string {
        return hexify(root.eventsRoot);
    }
}

export class StateTree {
    tree: SparseMerkleTree;

    constructor(public state: InterchainState) {
        let state2 = {}
        Object.entries(state).map(([k, v]) => {
            state2[InterchainStateAdapter.getKey(k)] = InterchainStateAdapter.getValue(v)
        })

        this.tree = new SparseMerkleTree(256, state2)
    }

    get root(): string {
        return this.tree.root;
    }

    generateProof(chainId: number) {
        return this.tree.createMerkleProof(
            InterchainStateAdapter.getKey(chainId)
        )
    }
}
