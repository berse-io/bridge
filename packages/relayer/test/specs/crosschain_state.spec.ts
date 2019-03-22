import { expect } from 'chai';
import { EthereumStateGadget } from '../../src/chain/ethereum/state_gadget';
import { CrosschainState } from '../../src/interchain/crosschain_state';

const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

describe('CrosschainState', async() => {
    it('#create', async() => {
        let state = new CrosschainState;
    })

    describe('#proveUpdate', async() => {
        let state: CrosschainState;
        let chain1: EthereumStateGadget, chain2: EthereumStateGadget;

        beforeEach(async() => {
            state = new CrosschainState;
            chain1 = new EthereumStateGadget("0")
            chain2 = new EthereumStateGadget("1")
        })

        it('proves successfully', async() => {
            state.put(chain1)
            state.put(chain2)
            state.compute()

            let proof1 = state.proveUpdate(chain1.id)
            let proof2 = state.proveUpdate(chain2.id)
            expect(state.tree.verifyProof(proof1.proof)).to.be.true;
            expect(state.tree.verifyProof(proof2.proof)).to.be.true;
        })

        it('throws for unknown chain', async() => {
            state.put(chain1)
            state.put(chain2)
            state.compute()

            expect(() => state.proveUpdate("5")).to.throw;
        })
    })

    describe('#proveEvent', async() => {
        let state: CrosschainState;
        let chain1: EthereumStateGadget, chain2: EthereumStateGadget;

        const MOCK_EVENT_HASH = "123";

        beforeEach(async() => {
            state = new CrosschainState;
            chain1 = new EthereumStateGadget("0")
            chain2 = new EthereumStateGadget("1")
        })

        it('proves successfully', async() => {
            state.put(chain1)
            state.put(chain2)
            state.compute()
    
            chain1.addEvent(MOCK_EVENT_HASH)
            state.compute()

            expect(chain1.getLeaf().eventsRoot)
    
            let proof = state.proveEvent(chain1.id, MOCK_EVENT_HASH)
            expect(state.tree.verifyProof(proof.rootProof)).to.be.true;
            expect(chain1.eventsTree.verifyProof(proof.eventProof)).to.be.true;
        })

        it('fails for unknown event', async() => {
            state.put(chain1)
            state.compute()
    
            chain1.addEvent(MOCK_EVENT_HASH)
    
            expect(() => state.proveEvent(chain1.id, "unknown-event")).to.throw('no event unknown-event')
        })

        it('fails if state not recomputed', async() => {
            state.put(chain1)
            state.put(chain2)
            state.compute()
    
            chain1.addEvent(MOCK_EVENT_HASH)
    
            expect(() => state.proveEvent(chain1.id, MOCK_EVENT_HASH)).to.throw('interchain state tree needs to be recomputed')
        })
    })
})