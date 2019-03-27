import { Web3ProviderEngine } from "0x.js";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { ContractWrappers, hexify } from "@ohdex/shared";
import { expect } from 'chai';
import { getRepository } from "typeorm";
import { DB } from "../../src/db";
import { ChainEvent } from "../../src/db/entity/chain_event";
import { Relayer } from "../../src/relayer";
import { dehexify } from "../../src/utils";
import { loadWeb3, TestchainFactory, getContractAbi } from "../helper";
import { EventListenerWrapper } from "../../src/chain/ethereum";
import { EventListenerContract } from "@ohdex/contracts/lib/build/wrappers/event_listener";
import { CrosschainState } from "../../src/interchain/crosschain_state";
import { EthereumStateGadget, EthereumStateLeaf } from "../../src/chain/ethereum/state_gadget";
import { InterchainStateUpdate } from "../../src/db/entity/interchain_state_update";
import { Chain } from "../../src/db/entity/chain";

const keccak256 = (x: any) => require('web3-utils').keccak256(x);
const keccak256Dehexed = (x: any) => dehexify(require('web3-utils').keccak256(x));


describe("DB", function() {
    this.timeout(20000);

    let chain1 = require('@ohdex/config').networks.kovan;
    let chain2 = require('@ohdex/config').networks.rinkeby;
    let relayer: Relayer 

    let pe1: Web3ProviderEngine;

    let wrappers1: ContractWrappers;
    let wrappers2: ContractWrappers;

    let txDefaults1
    let txDefaults2;

    let web31: Web3Wrapper;

    before(async () => {

        let db = new DB()
        await db.connect();

        // setup testchains
        // let testchain1 = await TestchainFactory.fork(chain1.rpcUrl, '11000');
        // let testchain2 = await TestchainFactory.fork(chain2.rpcUrl, '11001')
        // chain1.rpcUrl = testchain1.rpcUrl;
        // chain2.rpcUrl = testchain2.rpcUrl;
        
        // await chainlog({ config: require.resolve('@ohdex/relayer/test/test2.yml') });

        // let web3Loaded = await loadWeb3(chain1);
        // ({ 
        //     txDefaults: txDefaults1, 
        //     pe: pe1,
        //     web3: web31
        // } = web3Loaded);
        ({ txDefaults: txDefaults1, pe: pe1, web3: web31 } = await loadWeb3(chain1));
        
        // let {
        //     pe: pe2,
        //     account: account2,
        //     txDefaults: txDefaults2
        // } = await loadWeb3(chain2);
        // txDefaults2 = txDefaults2;

        wrappers1 = ContractWrappers.from(chain1, pe1);
        // wrappers2 = ContractWrappers.from(chain2, pe2)
        
    })

    let snapshotId;
    
    beforeEach(async () => {
        snapshotId = await web31.takeSnapshotAsync()
    })

    afterEach(async () => {
        let reverted =  await web31.revertSnapshotAsync(snapshotId);
        if(!reverted) throw new Error('bad env')
    })

    after(async () => {
        pe1.stop()
    })

    // it("loads all Chain's from networks.json", async () => {
    //     let db = new DB()
    //     await db.connect()

    //     let repo = getRepository(Chain)
    //     relayer = new Relayer({
    //         chain1, chain2
    //     });
    //     await relayer.start()

    //     let chains = await repo.find()
        
    //     expect(chains).to.have.members([
    //         { id: chain1.chainId },
    //         { id: chain2.chainId }
    //     ])
    // })

    // it("loads all Event's from EventEmitter", async () => {
    //     let db = new DB()
    //     await db.connect()

    //     let repo = getRepository(Event)
        
    //     let evs = await repo.find()
    //     expect(evs).to.have.members([
    //     ])

    //     // const chainRecord = new Chain()
    //     // chainRecord.chainId = "42"
    //     // await getRepository(Chain).save(chainRecord)

    //     // const ev = new Event()
    //     // ev.eventHash = "123"
    //     // ev.chain = chainRecord
    //     // await repo.save(ev)

    //     const eventHash = keccak256("123")
    //     // await wrappers1.EventEmitter.emitEvent.sendTransactionAsync(eventHash, txDefaults1)

    //     evs = await repo.find({ relations: ["chain"] })
        
    //     expect(evs).to.have.deep.members([
    //         {
    //             eventHash,
    //             chain: { chainId: chain1.chainId }
    //         }
    //     ])
    // })

    it("loads all InterchainStateUpdate's from EventListener", async () => {
        

        let repo = getRepository(InterchainStateUpdate)
        
        let updates = await repo.find()
        expect(updates).to.have.members([])

        const eventHash = keccak256("123")



        expect((await wrappers1.EventEmitter.getEventsCount.callAsync()).toString()).to.eq('0')

        await wrappers1.EventEmitter.emitEvent.sendTransactionAsync(eventHash, txDefaults1)
        
        expect((await wrappers1.EventEmitter.getEventsCount.callAsync()).toString()).to.eq('1')
        


        let eventListener = new EventListenerContract(
            getContractAbi('EventListener'),
            chain1.eventListenerAddress,
            pe1, txDefaults1
        );
        
        

        let crosschainState = new CrosschainState()
        let stateGadget1 = new EthereumStateGadget(chain1.chainId)
        let stateGadget2 = new EthereumStateGadget(chain2.chainId)
        crosschainState.put(stateGadget1)
        crosschainState.put(stateGadget2)
        stateGadget1.addEvent(eventHash)
        crosschainState.compute()

        let update = crosschainState.proveUpdate(chain1.chainId)
        // let eventProof = crosschainState.proveEvent(chain1.chainId, eventHash)
        
        let updateStateRoot_txHash = await EventListenerWrapper.updateStateRoot(
            eventListener, 
            update.proof, 
            update.leaf as EthereumStateLeaf
        )
        
        expect(await eventListener.interchainStateRoot.callAsync()).to.eq(hexify(update.proof.root));

        let receipt = await web31.getTransactionReceiptIfExistsAsync(updateStateRoot_txHash)

        updates = await repo.find({ relations: ["chain"] })

        let blocktime = await web31.getBlockTimestampAsync(receipt.blockHash);
        
        expect(updates).to.have.deep.members([
            {
                chain: { chainId: chain1.chainId },
                blockTime: blocktime,
                blockHash: receipt.blockHash,
                stateRoot: hexify(update.proof.root),
            }
        ])
    })
})


describe.only('Query helpers', function() {
    before(async () => {
        let db = new DB()
        await db.connect()
    })

    
    it('#InterchainStateUpdate.getLatestStaterootAtTime', async () => {
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

        await getRepository(Chain)
        .createQueryBuilder()
        .insert()
        .values([
            { chainId: 42 }
        ])
        .execute()

        let chain = await getRepository(Chain).findOne()
        let repo = getRepository(InterchainStateUpdate)
        
        let fixtures = [
            {
                "blockTime": 1553695776,
                "blockHash": "0xf21fa0398570971415a4166cb9284f595f81524767e3637082f2a6f5924803ff",
                chain,
                "stateRoot": "0xd8b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
            },
            {
                "blockTime": 1553695776 + 5,
                "blockHash": "0x021fa0398570971415a4166cb9284f595f81524767e3637082f2a6f5924803ff",
                chain,
                "stateRoot": "0xe8b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
            },
            {
                "blockTime": 1553695776 + 10,
                "blockHash": "0xa21fa0398570971415a4166cb9284f595f81524767e3637082f2a6f5924803ff",
                // "chain": {
                //   "chainId": 42
                // },
                chain,
                "stateRoot": "0x38b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
            }
        ];

        await repo.save(fixtures, {})

        
        let latest = await InterchainStateUpdate.getLatestStaterootAtTime(chain.chainId, 1553695776 + 5)
        expect(latest.blockHash).to.eq(fixtures[1].blockHash)
        expect(latest.stateRoot).to.eq(fixtures[1].stateRoot)

        latest = await InterchainStateUpdate.getLatestStaterootAtTime(chain.chainId, 1553695776 + 4)
        expect(latest.blockHash).to.eq(fixtures[0].blockHash)
        expect(latest.stateRoot).to.eq(fixtures[0].stateRoot)

        latest = await InterchainStateUpdate.getLatestStaterootAtTime(chain.chainId, 1553695776 + 20)
        expect(latest.blockHash).to.eq(fixtures[2].blockHash)
        expect(latest.stateRoot).to.eq(fixtures[2].stateRoot)
    })

    it.only('Event', async () => {
        // to prove event:
        // eventsTree = new MerkleTree([ 
        //      select * from events 
        //      where chain == x and 
        //      event.blocktime < interchainstate.leaves[exchain].blocktime
        // ])
        // eventsTree.prove
        // interchainstate.prove

        await getRepository(Chain)
        .createQueryBuilder()
        .insert()
        .values([
            { chainId: 42 }
        ])
        .execute()

        let chain = await getRepository(Chain).findOne()
        let repo = getRepository(ChainEvent);
        
        let fixtures = [
            {
                "blockTime": 1553695776 + 10,
                chain,
                "eventHash": "0xa21fa0398570971415a4166cb9284f595f81524767e3637082f2a6f5924803ff",
            },
            {
                "blockTime": 1553695776 + 10,
                chain,
                "eventHash": "0x38b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
            }
        ];

        await repo.save(fixtures, {});

        let latest = await ChainEvent.getEventsBeforeTime(chain.chainId, 1553695776)
        expect(latest).to.have.length(0);

        latest = await ChainEvent.getEventsBeforeTime(chain.chainId, 1553695776 + 10)
        expect(latest).to.have.members(fixtures);

        latest = await ChainEvent.getEventsBeforeTime(chain.chainId, 1553695776 + 11)
        expect(latest).to.have.members(fixtures);
    })
})
