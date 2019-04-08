import { RPCSubprovider, Web3ProviderEngine } from '0x.js';
import { RevertTraceSubprovider, SolCompilerArtifactAdapter } from '@0x/sol-trace';
import { BigNumber } from "@0x/utils";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BridgedTokenContract } from "@ohdex/contracts/lib/build/wrappers/bridged_token";
import { EventEmitterContract } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { BridgeContract } from "@ohdex/contracts/lib/build/wrappers/bridge";
import { expect } from 'chai';
import { suiteTeardown } from 'mocha';
import sinon from 'sinon';
import { EthereumChainTracker, CrosschainEvent } from "../../src/chain/ethereum";
import { hexify, keccak256 } from '../../src/utils';
import { get0xArtifact, getContractAbi, sinonBignumEq, sinonStrEqual, givenEthereumChainTracker, givenDbService, givenEmptyDatabase, TestchainFactory, loadWeb3 } from '../helper';
import { Connection } from 'typeorm';
import { BlockchainLifecycle } from '@0x/dev-utils';
import { dehexify } from '@ohdex/shared';


const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

describe('EthereumChainTracker', function () {
    this.timeout(10000);

    let pe: Web3ProviderEngine;
    let web3: Web3Wrapper;
    let txDefaults;
    let account: string;
    let accounts: string[];

    let snapshotId;
    let chain1 = require('@ohdex/config').networks['kovan'];
    let conn: Connection;

    let testchain1;
    
    before(async () => {
        // testchain1 = await TestchainFactory.fork(chain1.rpcUrl, '11000')
        // chain1.rpcUrl = testchain1.rpcUrl;

        conn = await givenDbService();
        
        ({ 
            pe,
            account,
            txDefaults,
            web3
        } = await loadWeb3(chain1));
    })

    let bchain1: BlockchainLifecycle;

    beforeEach(async () => {
        // bchain1 = new BlockchainLifecycle(web3)
        // await bchain1.startAsync()
        // await web3.setHeadAsync(chain1.deploymentInfo.blockNumber)
        // if(snapshotId) await web3.revertSnapshotAsync(snapshotId);
        // snapshotId = await web3.takeSnapshotAsync()
        await givenEmptyDatabase(conn)
    })

    after(async () => {
        // await web3.setHeadAsync(chain1.deploymentInfo.blockNumber)
    })

    // afterEach(async () => {
    //     // await bchain1.revertAsync()
    // })

    describe('account', () => {
        it('uses the RELAYER_PRIVKEY env variable', async () => {
            let tracker = new EthereumChainTracker(chain1)
            await tracker.start()
            await tracker.listen()
            expect(tracker.account).to.eq('0x0')
        })
    })

    // describe('#start', () => {
    //     it('only starts ', async () => {

    //     })
    // })

    const _chainId = new BigNumber('0');
    const _salt = new BigNumber('5');

    describe('events', async () => {
        it('correctly listens to events of EventEmitter and TokenBridge contracts', async() => {
            let chain1 = require('@ohdex/config').networks.kovan;
            let chain2 = require('@ohdex/config').networks.rinkeby;

            let bridgedToken = await BridgedTokenContract.deployFrom0xArtifactAsync(
                get0xArtifact('BridgedToken'), pe, txDefaults
            )

            // 1) Mint
            const mintAmount = new BigNumber('500');
            const bridgeAmount = new BigNumber('400');

            await bridgedToken.mint.sendTransactionAsync(accounts[1], mintAmount)
            await bridgedToken.mint.sendTransactionAsync(accounts[2], mintAmount)

            // 2) Approve for bridging.
            await bridgedToken.approve.sendTransactionAsync(
                chain1.escrowAddress, bridgeAmount,
                { from: accounts[1] }
            )

            // 3) Bridge
            let bridge = new BridgeContract(
                getContractAbi('Bridge'), chain1.escrowAddress,
                pe
            )

            // start relayer beforehand
            let tracker1 = await givenEthereumChainTracker(conn, chain1)
            await tracker1.start()
            tracker1.listen()
            
            let spy_onEventEmitted = sinon.spy();
            tracker1.eventEmitter.events.on('eventEmitted', spy_onEventEmitted)

            let spy_onTokensBridgedEvent = sinon.spy();
            tracker1.bridge.events.on('tokensBridged', spy_onTokensBridgedEvent)


            // Expect 2 events
            //  1) generic EventEmitter
            //  2) an Escrow TokensBridged event            

            await bridge.bridge.sendTransactionAsync( 
                bridgedToken.address, accounts[1], bridgeAmount, _salt, _chainId, chain2.bridgeAddress,
                { from: accounts[1], gas: 1000000 }
            )
            
            await new Promise((res,rej)=>setTimeout(res, 1000));

            // @ts-ignore
            // eventHash, targetBridge, chainId, receiver, token, amount, _salt
            expect(spy_onTokensBridgedEvent).to.have.been.calledWith(
                sinon.match.any,
                sinonStrEqual(chain2.bridgeAddress),
                sinon.match.any,
                sinonStrEqual(accounts[1]),
                sinonStrEqual(bridgedToken.address),
                sinonBignumEq(bridgeAmount), sinonBignumEq(_salt),
                sinon.match.any
            )

            // @ts-ignore
            expect(spy_onEventEmitted).to.have.been.calledOnce;
            
            // @ts-ignore
            expect(spy_eventsEmit).to.have.been.calledWith(
                'ITokenBridge.TokensBridgedEvent',
                sinon.match({
                    fromChain: tracker1.stateGadget.getId(),
                    toBridge: chain2.bridgeAddress
                })
            )

            // @ts-ignore
            expect(spy_eventsEmit).to.have.been.calledWith(
                'EventEmitter.EventEmitted',
                sinon.match.any
            )
            
            await tracker1.stop()
        })
    })

    describe('#receiveCrosschainMessage', async () => {
        it('receives message', async () => {
            let chain1 = require('@ohdex/config').networks.kovan;

            let tracker1 = new EthereumChainTracker(chain1)
            await tracker1.start()
            tracker1.listen()
    
            let fakeMessage: CrosschainEvent<any> = {
                from: {
                    chainId: 0
                },
                to: {
                    targetBridge: chain1.bridgeAddress,
                },
                data: {
                    eventHash: ""
                },
            }
            expect(await tracker1.receiveCrosschainEvent(fakeMessage)).to.be.true;

            expect(tracker1.pendingCrosschainEvs).to.have.members([
                fakeMessage
            ])
        })

        it('rejects message', async () => {
            let chain1 = require('@ohdex/config').networks.kovan;

            let tracker1 = new EthereumChainTracker(chain1)
            await tracker1.start()
            tracker1.listen()
    
            let fakeMessage: CrosschainEvent<any> = {
                from: {
                    chainId: 0
                },
                to: {
                    targetBridge: "I'm a stupid fake bridge, I don't exist",
                },
                data: {
                    eventHash: ""
                },
            }
            expect(await tracker1.receiveCrosschainEvent(fakeMessage)).to.be.false;
        })
        
    })

    

    describe.only('#stateGadget', async () => {
        it("loads the most recent state root update time", async () => {
            let tracker1 = await givenEthereumChainTracker(conn, chain1)
            await tracker1.start()
            tracker1.listen()

            // expect(tracker1.lastUpdated).to.deep.eq(
            //     new Buffer(32)
            // );
        })

        it.only('loads all previous events', async () => {
            const WHITELIST_ADDR = hexify(Buffer.alloc(20))
            let eventEmitter = await EventEmitterContract.deployFrom0xArtifactAsync(
                get0xArtifact('EventEmitter'), pe, txDefaults,
                WHITELIST_ADDR,
                chain1.chainId,
                "nonce"
            )

                
            // let makeMockEvent = (x) => {
            //     // _eventHash, _triggerAddress, _triggerChain
            //     let _triggerAddress = dehexify(txDefaults.from);
                

            //     keccak256(x, )
            // }
            let ev_1 = hexify(keccak256('1'))
            let ev_2 = hexify(keccak256('2'))
            let ev_3 = hexify(keccak256('3'))
            
            await eventEmitter.emitEvent.sendTransactionAsync(
                ev_1
            )
    
            await eventEmitter.emitEvent.sendTransactionAsync(
                ev_2
            )
    
            await eventEmitter.emitEvent.sendTransactionAsync(
                ev_3
            )
    
            let tracker = await givenEthereumChainTracker(conn, {
                ...chain1,
                eventEmitterAddress: eventEmitter.address
            })
            await tracker.start()

            let prev = await tracker.eventEmitter.loadPreviousEvents()
    
            expect(prev.map(ev => ev.eventHash)).to.have.ordered.members([
                ev_1,
                ev_2,
                ev_3
            ])
            
            await tracker.stop()
        })
    })

    describe('#processBridgeEvents', async() => {
        // we have an event from an exchain
        // that we are proving after a state update to this chain
        // generate a state proof
        // proof = thischain.interchainState.prove(exchain_leaf)
        // generate an event proof
        // proof = thischain.interchainState.proveEvent(exchain, evHash)

        // how do we know?
        // interchainstate.roots = latest
        // root2eventAck: string -> number
        
        // and to compute:
        // eventsTree = new MerkleTree([ select * from events where chain == x ])
        
        

        // LATEST
        // interchainstate = new MerkleTree([
        //      each eventsTree root
        // ])

        // CURRENT FOR CHAIN
        // lastRoot = EventListener.lastRoot
        // exchainRoots = 
        //      select * from interchainStates 
        //      where state.chain == exchain and 
        //      state.blocktime < lastRoot 
        //      order by state.blockctime desc limit 1
        // interchainstate = new MerkleTree([
        //      exchainRoots
        // ])

        // to prove event:
        // eventsTree = new MerkleTree([ 
        //      select * from events 
        //      where chain == x and 
        //      event.blocktime < interchainstate.leaves[exchain].blocktime
        // ])
        // eventsTree.prove
        // interchainstate.prove


        




    })

    suiteTeardown(async () => {
        await pe.stop()
    })
})