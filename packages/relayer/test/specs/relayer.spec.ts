import { RPCSubprovider, Web3ProviderEngine } from '0x.js';
import { RevertTraceSubprovider, SolCompilerArtifactAdapter } from '@0x/sol-trace';
import { BigNumber } from "@0x/utils";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BridgedTokenContract } from "@ohdex/contracts/lib/build/wrappers/bridged_token";
import { EscrowContract } from '@ohdex/contracts/lib/build/wrappers/escrow';
import { EventEmitterContract } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { expect } from 'chai';
import { suiteTeardown } from 'mocha';
import sinon from 'sinon';
import { EthereumChainTracker } from "../../src/chain/ethereum";
import { MessageSentEvent } from '../../src/chain/tracker';
import { hexify, keccak256 } from '../../src/utils';
import { get0xArtifact, getContractAbi, sinonBignumEq, sinonStrEqual } from '../helper';
import { CrosschainState } from '../../src/interchain/crosschain_state';
import { StateGadget } from '../../src/chain/abstract_state_gadget';
import { EthereumStateGadget } from '../../src/chain/ethereum/state_gadget';


const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);


// receive emitted event on one chain
// route to another chain
// update the state root of another chain
// and then prove the event in the state

// THERE COULD be a race condition wherein the event makes it into the StateGadget AFTER the cross chain update
// ignoring this for now

// there could be another race condition
// whereby a chain updates its state twice
// and while we are going through the process of processBridgeEvents
// it constructs the wrong proof for the current state root
// so we need to make sure that it 

// if at one point it fails from callAsync
// then we retry
// with a 

describe('CrosschainState', async() => {
    // it('contains all chains in the crosschain state', async () => {
    //     // chain1/2
    //     // prove an event on another chain

    // })

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


    // it('updates crosschain state on new events', async() => {
        // let chain1 = require('@ohdex/config').networks.kovan;
        // let chain2 = require('@ohdex/config').networks.rinkeby;

        // create two events
        // update one chain
        // update another chain
        // wait for the bridge event to be processed
            // event routed from one tracker to another tracker
            // on the state root update, the tracker proves the event correctly
        

        // another chain update
        // the tracker 
    // })
})