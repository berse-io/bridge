import {
    suiteTeardown
} from 'mocha'

import { EthereumChainTracker } from "../src/chain/ethereum";
import { Web3ProviderEngine, RPCSubprovider } from '0x.js';
import { Web3Wrapper } from '@0x/web3-wrapper';

describe('EthereumChainTracker', async () => {
    let tracker: EthereumChainTracker;
    let pe: Web3ProviderEngine;
    let web3: Web3Wrapper;
    let snapshotId = 0;
    let config = require('@ohdex/config').networks['kovan'];

    before(async () => {
        tracker = new EthereumChainTracker(config)
        await tracker.start()


        pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(config.rpcUrl))
        pe.start()
        web3 = new Web3Wrapper(pe);
    })

    beforeEach(async () => {
        if(snapshotId) await web3.revertSnapshotAsync(snapshotId);
        snapshotId = await web3.takeSnapshotAsync()
    })

    it('loads past events from event emitter', async () => {
        
        // get event emitter
        // emit some events
        // check that those events are included in the state gadget
    })

    it('loads past events from token bridge contracts', async () => {

    })

    it('routes events to other chains', async () => {
        // TokensBridgedEvent
    })

    suiteTeardown(async () => {
        await tracker.stop()
    })
})