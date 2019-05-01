import { Web3ProviderEngine, BigNumber } from "0x.js";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { EventEmitterContract } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { WhitelistContract } from "@ohdex/contracts/lib/build/wrappers/whitelist";
import { GanacheSubprovider } from "@0x/subproviders";
import { expect, assert } from 'chai';
import { zxWeb3Connected, get0xArtifact, wait } from "@ohdex/shared"
import { deployLibraries, getDeployArgs } from "@ohdex/deployer"
import { EventEmitterAdapter } from "../../../src/chain/ethereum/event_emitter";
import { ethers } from "ethers";
import sinon from 'sinon'
import { sinonStrEqual } from "../../helper";

describe("EventEmitterAdapter", function() {
    this.timeout(15000)

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let ethersProvider: ethers.providers.Provider;
    let accounts: string[];

    let eventEmitter: EventEmitterContract;
    let adapter: EventEmitterAdapter;


    async function setupChain() {
        let provider = new GanacheSubprovider({ })
        
        
        let pe2 = new Web3ProviderEngine();
        pe2.addProvider(provider)
        pe2.start()

        web3 = new Web3Wrapper(pe2);
        expect(zxWeb3Connected(pe2), "didn't connect to chain").to.eventually.be.fulfilled;
        
        accounts = await web3.getAvailableAddressesAsync();


        pe = new Web3ProviderEngine();
        pe.addProvider(provider)
        pe.start()
        expect(zxWeb3Connected(pe), "didn't connect to chain").to.eventually.be.fulfilled;
        
        web3 = new Web3Wrapper(pe);
        ethersProvider = new ethers.providers.Web3Provider(pe)

        await deployLibraries(pe, accounts[0])
    }

    beforeEach(async () => {
        await setupChain()

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

        adapter = new EventEmitterAdapter(
            ethersProvider,
            { info: function(){} },
            eventEmitter.address
        )
    })

    describe('#loadPreviousEvents', async () => {
        it('loads initial events', async () => {
            let previous = await adapter.loadPreviousEvents()

            let eventHash = await eventEmitter.events.callAsync(new BigNumber(0))
            let lastBlock = await web3.getBlockIfExistsAsync('latest')

            expect(previous).to.have.deep.members([
                {
                    eventHash,
                    blockTime: lastBlock.timestamp
                }
            ])
        })

        it('loads 1 event', async () => {
            // console.log(await eventEmitter.getEventsCount.callAsync())
            await eventEmitter.emitEvent.sendTransactionAsync('0x01');

            let eventHash1 = await eventEmitter.events.callAsync(new BigNumber(1))
            let lastBlock1 = await web3.getBlockIfExistsAsync('latest')

            let eventHash2 = await eventEmitter.events.callAsync(new BigNumber(0))
            let lastBlock2 = await web3.getBlockIfExistsAsync(lastBlock1.number - 1)

            let previous = await adapter.loadPreviousEvents()
            expect(previous).to.have.deep.members([
                { 
                    eventHash: eventHash1,
                    blockTime: lastBlock1.timestamp
                },
                { 
                    eventHash: eventHash2,
                    blockTime: lastBlock2.timestamp
                }
            ])
        })
    })

    describe.only('#listen', async () => {
        it('hears new events', async () => {            
            adapter.listen();

            let emitted = new Promise((res,rej) => {
                adapter.events.on('eventEmitted', res);
                wait(300).then(() => rej)
            })

            await eventEmitter.emitEvent.sendTransactionAsync('0x01');

            let eventHash = await eventEmitter.events.callAsync(new BigNumber(1))

            return expect(emitted).to.eventually.have.property('eventHash').eq(eventHash)
        })
    })
})