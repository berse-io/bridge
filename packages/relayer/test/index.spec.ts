import {
    suiteTeardown
} from 'mocha'

import { EthereumChainTracker } from "../src/chain/ethereum";
import { Web3ProviderEngine, RPCSubprovider } from '0x.js';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { EventEmitterContract, EventEmitterEvents } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { EventListenerContract, EventListenerEvents } from "@ohdex/contracts/lib/build/wrappers/event_listener";
import { getContractAbi, get0xArtifact } from './helper';
import { keccak256, hexify } from '../src/utils';
import { expect } from 'chai';

describe('EthereumChainTracker', async () => {
    let tracker: EthereumChainTracker;
    let pe: Web3ProviderEngine;
    let web3: Web3Wrapper;
    let txDefaults;
    let account: string;

    let snapshotId;
    let config = require('@ohdex/config').networks['kovan'];

    before(async () => {
        pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(config.rpcUrl))
        pe.start()
        web3 = new Web3Wrapper(pe);
        account = (await web3.getAvailableAddressesAsync())[0]
        txDefaults = { from: account }
    })

    beforeEach(async () => {
        if(snapshotId) await web3.revertSnapshotAsync(snapshotId);
        snapshotId = await web3.takeSnapshotAsync()
    })

    it('loads past events from event emitter', async () => {
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

        tracker = new EthereumChainTracker({
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

    it('loads past events from token bridge contracts', async () => {

    })

    it('routes events to other chains', async () => {
        // TokensBridgedEvent
    })

    suiteTeardown(async () => {
        await tracker.stop()
        await pe.stop()
    })
})