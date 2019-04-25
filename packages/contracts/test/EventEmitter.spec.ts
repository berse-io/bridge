import { Web3ProviderEngine, BigNumber } from "0x.js";
import { waitUntilConnected, get0xArtifact, dehexify, hexify } from "./helpers";
import { getDeployArgs, deployLibraries } from '@ohdex/deployer'
// let getDeployArgs;
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { GanacheSubprovider } from "@0x/subproviders";
import { EventEmitterContract } from "../build/wrappers/event_emitter";
import { WhitelistContract } from "../build/wrappers/whitelist";

import chai, { expect, should, assert } from 'chai';
import { describe, it, setup, teardown } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';

import { MerkleTree } from '@ohdex/typescript-solidity-merkle-tree'

describe('EventEmitter', function () {
    this.timeout(15000)

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let accounts: string[];

    let eventEmitter: EventEmitterContract;


    before(async () => {
        let provider = new GanacheSubprovider({ })
        
        
        let pe2 = new Web3ProviderEngine();
        pe2.addProvider(provider)
        pe2.start()

        web3 = new Web3Wrapper(pe2);
        expect(waitUntilConnected(pe2), "didn't connect to chain").to.eventually.be.fulfilled;
        
        accounts = await web3.getAvailableAddressesAsync();


        pe = new Web3ProviderEngine();
        pe.addProvider(provider)
        pe.start()
        expect(waitUntilConnected(pe), "didn't connect to chain").to.eventually.be.fulfilled;
        
        web3 = new Web3Wrapper(pe);

        await deployLibraries(pe, accounts[0])
        
    });

    beforeEach(async () => { 
        let txDefaults = { from: accounts[0] }


        let whitelist = await WhitelistContract.deployFrom0xArtifactAsync(
            get0xArtifact('Whitelist'),
            pe, txDefaults,
        );
        
        // @ts-ignore
        eventEmitter = await EventEmitterContract.deployAsync(
            ...getDeployArgs('EventEmitter', pe, accounts[0], true),
            whitelist.address,
            new BigNumber(4),
            "nonce"
        );

        await whitelist.addWhitelisted.sendTransactionAsync(eventEmitter.address, txDefaults);
    })

    describe.only('#getEventsRoot', async () => {
        it('default (1 event)', async () => {
            expect(
                (await eventEmitter.getEventsCount.callAsync()).toString()
            ).to.eq('1')

            let eventHash1 = await eventEmitter.events.callAsync(new BigNumber(0))

            let root = (await eventEmitter.getEventsRoot.callAsync()).toString()

            let tree = new MerkleTree(
                [ eventHash1 ].map(dehexify)
            );
            let rootJs = hexify(tree.root())

            expect(root).to.eq(rootJs)
        })

        it('2 events', async () => {
            await eventEmitter.emitEvent.sendTransactionAsync('0x10')

            expect(
                (await eventEmitter.getEventsCount.callAsync()).toString()
            ).to.eq('2')

            let eventHash1 = await eventEmitter.events.callAsync(new BigNumber(0));
            let eventHash2 = await eventEmitter.events.callAsync(new BigNumber(1));

            let root = (await eventEmitter.getEventsRoot.callAsync()).toString()

            await web3.sendTransactionAsync({
                from: accounts[0],
                to: accounts[1],
                value: '1'
            })

            let lastEvent = await eventEmitter.getLastEventToConfirm.callAsync()
            expect(lastEvent.toString()).to.eq('2')

            // @ts-ignore
            // , eventHash2
            let tree = new MerkleTree(
                [ eventHash1, eventHash2 ].map(dehexify)
            );
            console.log(tree.toString())
            
            let rootJs = hexify(tree.root())
            expect(root).to.eq(rootJs)

            console.log(root, rootJs)
        })
    })

    describe('#getLastEventToConfirm', async () => {
        it('0 events', async () => {
            expect(
                (await eventEmitter.getLastEventToConfirm.callAsync()).toString()
            ).to.eq('0')
        })

        it('1 events', async () => {
            await eventEmitter.emitEvent.sendTransactionAsync('0x10')
            expect(
                (await eventEmitter.getLastEventToConfirm.callAsync()).toString()
            ).to.eq('1')
        })

        it('2 events', async () => {
            await eventEmitter.emitEvent.sendTransactionAsync('0x10')
            await eventEmitter.emitEvent.sendTransactionAsync('0x12')
            await eventEmitter.emitEvent.sendTransactionAsync('0x13')
            
            expect(
                (await eventEmitter.getLastEventToConfirm.callAsync()).toString()
            ).to.eq('2')


            await eventEmitter.emitEvent.sendTransactionAsync('0x13')
            
            expect(
                (await eventEmitter.getLastEventToConfirm.callAsync()).toString()
            ).to.eq('3')
        })
    })
})