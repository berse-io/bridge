import { ChainEvent } from "../db/entity/chain_event";
import { MerkleTree } from "@ohdex/typescript-solidity-merkle-tree";

import { dehexify } from "@ohdex/shared";
import { keccak256 } from "../utils";
import { InterchainStateUpdate } from "../db/entity/interchain_state_update";

export function EventTree(items: ChainEvent[]) {
    return new MerkleTree(
        items.map(ev => dehexify(ev.eventHash)),
        keccak256
    )
}

export function StateTree(items: any[]) {
    return new MerkleTree(
        items.map(item => dehexify(item.eventRoot)),
        keccak256
    )
}