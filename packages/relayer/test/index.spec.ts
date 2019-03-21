import {
    suiteTeardown
} from 'mocha'

import { EthereumChainTracker } from "../src/chain/ethereum";
import { Web3ProviderEngine, RPCSubprovider } from '0x.js';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { EventEmitterContract, EventEmitterEvents } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { EventListenerContract, EventListenerEvents } from "@ohdex/contracts/lib/build/wrappers/event_listener";
import { BridgedTokenContract } from "@ohdex/contracts/lib/build/wrappers/bridged_token";
import { getContractAbi, get0xArtifact, TestchainFactory, caseInsensitiveEquals, sinonStrEqual, sinonBignumEq } from './helper';
import { keccak256, hexify } from '../src/utils';
import { expect, assert } from 'chai';
import { BigNumber } from "@0x/utils";
import { EscrowContract } from '@ohdex/contracts/lib/build/wrappers/escrow';
import { RevertTraceSubprovider } from '@0x/sol-trace';
import { SolCompilerArtifactAdapter } from '@0x/sol-trace';
import { ContractWrappers } from '@ohdex/shared'
import sinon from 'sinon'
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
import * as sleep from 'sleep';

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
    
            expect(tracker.state.events.map(hexify)).to.have.ordered.members([
                ev_1,
                ev_2,
                ev_3
            ])
            
            await tracker.stop()
        })
    })

    // it('loads unprocessed past events from token bridge contracts', async () => {
        // let eventEmitter = await EventEmitterContract.deployFrom0xArtifactAsync(
        //     get0xArtifact('EventEmitter'), pe, txDefaults
        // )

        // tracker = new EthereumChainTracker({
        //     ...config,
        //     eventEmitterAddress: eventEmitter.address
        // })
        // await tracker.start()



        // await tracker.stop()
    // })

    const _chainId = new BigNumber('0');
    const _salt = new BigNumber('5');

    describe.only('TokensBridged event routing', async () => {
        it('routes correctly for one event in one block', async() => {
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

            // let chain1Contracts = ContractWrappers.from(chain1, pe);
            
            await tracker1.stop()
        })

        it('routes correctly for 2 events in one block', async () => {
            // since two events are in one block
            // we need to verify that they are added to the tree in order
            // and then also that 

        })
    })

    // describe('#onTokensBridgedEvent', () => {
    //     it('routes events to other chains', async () => {
            
    //         // TokensBridgedEvent

    //     })
    // })
    

    suiteTeardown(async () => {
        await pe.stop()
    })
})