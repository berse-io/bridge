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
    let config = require('@ohdex/config').networks['kovan'];

    before(async () => {
        // let chain1 = await TestchainFactory.fork(config.rpcUrl, '9000')

        pe = new Web3ProviderEngine();
        const artifactAdapter = new SolCompilerArtifactAdapter(
            `${require("@ohdex/contracts")}/build/artifacts`,
            `${require("@ohdex/contracts")}/contracts`
        );
        const revertTraceSubprovider = new RevertTraceSubprovider(
            artifactAdapter, 
            '0',
            true
        );
        pe.addProvider(revertTraceSubprovider);
        pe.addProvider(new RPCSubprovider(config.rpcUrl))
        pe.start()
        web3 = new Web3Wrapper(pe);
        accounts = await web3.getAvailableAddressesAsync()
        account = accounts[0]
        txDefaults = { from: account }
    })

    beforeEach(async () => {
        if(snapshotId) await web3.revertSnapshotAsync(snapshotId);
        snapshotId = await web3.takeSnapshotAsync()
    })

    describe('#start', () => {
        it('loads past events from EventEmitter', async () => {
            let eventEmitter = await EventEmitterContract.deployFrom0xArtifactAsync(
                get0xArtifact('EventEmitter'), pe, txDefaults
            )
    
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
    
            let tracker = new EthereumChainTracker({
                ...config,
                eventEmitterAddress: eventEmitter.address
            })
            await tracker.start()
    
            expect(tracker.stateGadget.events.map(hexify)).to.have.ordered.members([
                ev_1,
                ev_2,
                ev_3
            ])
            
            await tracker.stop()
        })
    })

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
            let escrow = new EscrowContract(
                getContractAbi('Escrow'), chain1.escrowAddress,
                pe
            )

            // start relayer beforehand
            let tracker1 = new EthereumChainTracker(chain1)
            await tracker1.start()
            tracker1.listen()
            
            let spy_onEventEmitted = sinon.spy(tracker1, 'onEventEmitted')
            let spy_onTokensBridgedEvent = sinon.spy(tracker1, 'onTokensBridgedEvent');
            let spy_eventsEmit = sinon.spy(tracker1.events, 'emit')


            // Expect 2 events
            //  1) generic EventEmitter
            //  2) an Escrow TokensBridged event            

            await escrow.bridge.sendTransactionAsync(
                chain2.bridgeAddress, 
                bridgedToken.address, accounts[1], bridgeAmount, _chainId, _salt,
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
    
            let fakeMessage: MessageSentEvent = {
                fromChain: "",
                toBridge: chain1.bridgeAddress,
                data: null,
                eventHash: ""
            }
            expect(await tracker1.receiveCrosschainMessage(fakeMessage)).to.be.true;

            expect(tracker1.pendingTokenBridgingEvs).to.have.members([
                fakeMessage
            ])
        })

        it('rejects message', async () => {
            let chain1 = require('@ohdex/config').networks.kovan;

            let tracker1 = new EthereumChainTracker(chain1)
            await tracker1.start()
            tracker1.listen()
    
            let fakeMessage: MessageSentEvent = {
                fromChain: "",
                toBridge: "I'm a stupid fake bridge, I don't exist",
                data: null,
                eventHash: ""
            }
            expect(await tracker1.receiveCrosschainMessage(fakeMessage)).to.be.false;
        })
        
    })

    suiteTeardown(async () => {
        await pe.stop()
    })
})