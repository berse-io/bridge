import { EventTree, EventTreeFactory, StateTree } from "../../src/interchain/trees";
import { ChainEvent } from "../../src/db/entity/chain_event";
import { keccak256 } from "../../src/utils";
import { hexify } from "@ohdex/shared";
import { MerkleTree } from "@ohdex/typescript-solidity-merkle-tree";
import { expect } from 'chai'

let i = 0;

function givenChainEvent() {
    let ev = new ChainEvent
    ev.eventHash = hexify(keccak256(``+i++))
    return ev;
}

describe('EventsTree', async () => {
    describe('serialisation', async () => {
        it('works', async () => {
            let items = [1,2,3,4,5].map(givenChainEvent)
            let tree = await EventTreeFactory.create(items)
            
            let sz = tree.sz()
            let dsz = EventTree.dsz(sz)

            expect(dsz.root().equals(tree.root())).to.be.true;

            // generate proof
            let proof = tree.generateProof(2)
            expect(
                dsz.verifyProof(proof)
            ).to.be.true;
        })
    })
})

describe.only('StateTree', async () => {
    describe('serialisation', async () => {
        it('works', async () => {
            let items1 = [1,2,3,4,5].map(givenChainEvent)
            let tree1 = await EventTreeFactory.create(items1)

            let items2 = [1,3,3,4,5].map(givenChainEvent)
            let tree2 = await EventTreeFactory.create(items2)
            
            let stateTree = new StateTree({
                '1': {
                    eventsRoot: tree1.root(),
                    eventsTree: tree1
                },
                '2': {
                    eventsRoot: tree2.root(),
                    eventsTree: tree2
                }
            })

            let sz = stateTree.sz()
            // console.log(sz)
            let dsz = StateTree.dsz(sz)

            expect(stateTree.root).to.eq(dsz.root);
            // console.log(dsz.state)
            expect(stateTree.state).to.deep.eq(dsz.state)
            expect(stateTree.tree.tree).to.deep.eq(dsz.tree.tree);

            let proof = stateTree.generateProof(1)
            let proof2 = dsz.generateProof(1)
            expect(
                proof
            ).to.deep.eq(proof2)
        })
    })
})