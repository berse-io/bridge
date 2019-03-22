import { MerkleTree, MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { StateGadget, ChainStateLeaf } from "../chain/abstract_state_gadget";
import { keccak256, hexify } from "../utils";



class CrosschainState {
    chains: {
        [id: string]: StateGadget
    } = {};

    tree: MerkleTree;

    leaves: ChainStateLeaf[] = [];

    leafIdx: {
        [id: string]: number
    } = {};

    // @ts-ignore
    get root(): string {
        return hexify(this.tree.root())
    }

    put(state: StateGadget) {
        this.chains[state.getId()] = state
    }

    compute() {
        let chains = Object.keys(this.chains)
        let leafIdx: {
            [id: string]: number
        } = {};
        let leaves: ChainStateLeaf[] = []

        let i = 0;
        for(let id of chains) {
            let leaf = this.chains[id].getLeaf()
            leaves.push(leaf)
            leafIdx[id] = i;
            i++
        }

        let tree = new MerkleTree(
            leaves.map(leaf => leaf.toBuffer()),
            keccak256
        )

        this.tree = tree;
        this.leaves = leaves;
        this.leafIdx = leafIdx;
    }

    proveUpdate(chainId: string): CrosschainStateUpdateProof {
        if(!this.tree) throw new Error('compute() was not called yet');
        if(!this.chains[chainId]) throw new Error(`no chain for id ${chainId}`)
        let leafIdx = this.leafIdx[chainId]
        let leaf = this.leaves[leafIdx]
        let proof = this.tree.generateProof(leafIdx)
        
        return {
            chainId,
            proof,
            leaf
        }
    }

    proveEvent(fromChain: string, eventHash: string): CrosschainEventProof {
        if(!this.tree) throw new Error('compute() was not called yet');
        if(!this.chains[fromChain]) throw new Error(`no chain for id ${fromChain}`)

        let gadget = this.chains[fromChain]
        let eventProof = gadget.proveEvent(eventHash)

        let rootProof = this.tree.generateProof(
            this.leafIdx[fromChain]
        );
        
        // if(eventProof.root != this.leaves[fromChain].)
        let leafIdx = this.leafIdx[fromChain]
        if(!this.leaves[leafIdx].toBuffer().equals(gadget.getLeaf().toBuffer())) {
            throw new Error("interchain state tree needs to be recomputed")
        }

        // if(!rootProof.leaf.equals(eventProof.root)) throw new Error("interchain state tree needs to be recomputed")

        return {
            eventProof,
            rootProof
        }
    }
}

class CrosschainStateUpdateProof {
    chainId: string;
    proof: MerkleTreeProof;
    leaf: ChainStateLeaf;
}

class CrosschainEventProof {
    eventProof: MerkleTreeProof;
    rootProof: MerkleTreeProof;
}

export {
    ChainStateLeaf,

    CrosschainState,
    CrosschainStateUpdateProof,
    CrosschainEventProof
}