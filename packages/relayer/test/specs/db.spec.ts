// import { Web3ProviderEngine } from "0x.js";
// import { Web3Wrapper } from "@0x/web3-wrapper";
// import { EventListenerContract } from "@ohdex/contracts/lib/build/wrappers/event_listener";
// import { ContractWrappers, hexify, wait } from "@ohdex/shared";
// import { expect } from 'chai';
// import { Connection, getRepository } from "typeorm";
// import { EthereumChainTracker } from "../../src/chain/ethereum";
// import { EthereumStateGadget, EthereumStateLeaf } from "../../src/chain/ethereum/state_gadget";
// import { Chain } from "../../src/db/entity/chain";
// import { ChainEvent } from "../../src/db/entity/chain_event";
// import { InterchainStateUpdate } from "../../src/db/entity/interchain_state_update";
// import { CrosschainState } from "../../src/interchain/crosschain_state";
// import { Relayer } from "../../src/relayer";
// import { dehexify } from "../../src/utils";
// import { getContractAbi, givenDbService, givenEmptyDatabase, givenEthereumChainTracker, loadWeb3 } from "../helper";

// const keccak256 = (x: any) => require('web3-utils').keccak256(x);
// const keccak256Dehexed = (x: any) => dehexify(require('web3-utils').keccak256(x));


// describe("DB", function() {
//     this.timeout(20000);

//     let chain1 = require('@ohdex/config').networks.kovan;
//     let chain2 = require('@ohdex/config').networks.rinkeby;
//     let relayer: Relayer 

//     let pe1: Web3ProviderEngine;

//     let wrappers1: ContractWrappers;
//     let wrappers2: ContractWrappers;

//     let txDefaults1
//     let txDefaults2;

//     let web31: Web3Wrapper;

//     let tracker1: EthereumChainTracker;
//     let tracker2: EthereumChainTracker;

//     let conn: Connection;

//     before(async () => {
//         // let relayer = new Relayer()
//         conn = await givenDbService();


//         // tracker needs to be connected to the database
//         // basically it needs to connect to it 1)
//         // but only once (not all of them)
//         // and then it needs to emit these events into i t


//         // TODO replace this with relayer, which will connect when done
//         // let db = new DB()
//         // await db.connect();

//         // setup testchains
//         // let testchain1 = await TestchainFactory.fork(chain1.rpcUrl, '11000');
//         // let testchain2 = await TestchainFactory.fork(chain2.rpcUrl, '11001')
//         // chain1.rpcUrl = testchain1.rpcUrl;
//         // chain2.rpcUrl = testchain2.rpcUrl;
        
//         // await chainlog({ config: require.resolve('@ohdex/relayer/test/test2.yml') });

//         // let web3Loaded = await loadWeb3(chain1);
//         // ({ 
//         //     txDefaults: txDefaults1, 
//         //     pe: pe1,
//         //     web3: web31
//         // } = web3Loaded);
//         ({ txDefaults: txDefaults1, pe: pe1, web3: web31 } = await loadWeb3(chain1));
        
//         // let {
//         //     pe: pe2,
//         //     account: account2,
//         //     txDefaults: txDefaults2
//         // } = await loadWeb3(chain2);
//         // txDefaults2 = txDefaults2;

//         wrappers1 = ContractWrappers.from(chain1, pe1);
//         // wrappers2 = ContractWrappers.from(chain2, pe2)
//     })

//     let snapshotId;
    
//     beforeEach(async () => {
//         snapshotId = await web31.takeSnapshotAsync()
//         await givenEmptyDatabase(conn)
//     })

//     afterEach(async () => {
//         await tracker1.stop()
//         // await tracker2.stop()
//         // tracker1 = null;
//         // tracker2 = null;

//         let reverted = await web31.revertSnapshotAsync(snapshotId);
//         if(!reverted) throw new Error('bad env')
//     })

//     after(async () => {
//         pe1.stop()
//     })

//     it("loads all Chain's from networks.json", async () => {
//         tracker1 = await givenEthereumChainTracker(conn, chain1)
//         await tracker1.start()
//         await tracker1.listen();

//         tracker2 = await givenEthereumChainTracker(conn, chain2)
//         await tracker2.start()
//         await tracker2.listen();

//         let chainRepo = getRepository(Chain)

//         let chains = await chainRepo.find()
        
//         expect(chains).to.have.deep.members([
//             { chainId: chain1.chainId },
//             { chainId: chain2.chainId }
//         ])

//         await tracker2.stop()
//     })

//     it("loads all Event's from EventEmitter", async () => {
//         tracker1 = await givenEthereumChainTracker(conn, chain1)
//         await tracker1.start()
//         await tracker1.listen();

//         let repo = getRepository(ChainEvent)

//         let evs = await repo.find({ relations: ["chain"] })
//         expect(evs).to.have.members([])

//         const eventHash = keccak256("123")
//         expect((await wrappers1.EventEmitter.getEventsCount.callAsync()).toString()).to.eq('0')
//         let emitEvent_txHash = await wrappers1.EventEmitter.emitEvent.sendTransactionAsync(eventHash, txDefaults1)
//         let receipt = await web31.getTransactionReceiptIfExistsAsync(emitEvent_txHash)
//         let blockTime = await web31.getBlockTimestampAsync(receipt.blockHash);

//         await wait(200)

//         evs = await repo.find({ relations: ["chain"] })

//         expect(evs).to.have.length(1)
//         let ev = evs[0]
//         expect(ev.blockTime).to.eq(blockTime)
//         expect(ev.eventHash).to.eq(eventHash)
//         expect(ev.chain).to.deep.eq({ chainId: chain1.chainId })
//     })

//     it("loads all InterchainStateUpdate's from EventListener", async () => {
//         tracker1 = await givenEthereumChainTracker(conn, chain1)
//         await tracker1.start()
//         await tracker1.listen();

//         let repo = getRepository(InterchainStateUpdate)
        
//         let updates = await repo.find()
//         expect(updates).to.have.members([])

//         const eventHash = keccak256("123")

//         expect((await wrappers1.EventEmitter.getEventsCount.callAsync()).toString()).to.eq('0')
//         await wrappers1.EventEmitter.emitEvent.sendTransactionAsync(eventHash, txDefaults1)
//         expect((await wrappers1.EventEmitter.getEventsCount.callAsync()).toString()).to.eq('1')

//         let eventListener = new EventListenerContract(
//             getContractAbi('EventListener'),
//             chain1.eventListenerAddress,
//             pe1, txDefaults1
//         );

//         let crosschainState = new CrosschainState()
//         let stateGadget1 = new EthereumStateGadget(chain1.chainId)
//         let stateGadget2 = new EthereumStateGadget(chain2.chainId)
//         crosschainState.put(stateGadget1)
//         crosschainState.put(stateGadget2)
//         stateGadget1.addEvent(eventHash)
//         crosschainState.compute()

//         let updateProof = crosschainState.proveUpdate(chain1.chainId)
//         // let eventProof = crosschainState.proveEvent(chain1.chainId, eventHash)
        
//         let updateStateRoot_txHash = await EventListenerWrapper.updateStateRoot(
//             eventListener, 
//             updateProof.proof, 
//             updateProof.leaf as EthereumStateLeaf
//         )
        
//         expect(await eventListener.interchainStateRoot.callAsync()).to.eq(hexify(updateProof.proof.root));

//         let receipt = await web31.getTransactionReceiptIfExistsAsync(updateStateRoot_txHash)
//         let blocktime = await web31.getBlockTimestampAsync(receipt.blockHash);

//         await wait(300)

//         updates = await repo.find({ relations: ["chain"] })
        
//         expect(updates).to.have.length(1)
//         let update = updates[0]
//         expect(update.blockHash).to.eq(receipt.blockHash)
//         expect(update.chain).to.deep.eq({ chainId: chain1.chainId })
//         expect(update.blockTime).to.eq(blocktime)
//         expect(update.stateRoot).to.eq(hexify(updateProof.proof.root))
//     })

//     // describe('random inserts', function() {
//     //     before(givenEmptyDatabase)

//     //     it('adds Event', async () => {
//     //         let repo = getRepository(ChainEvent)
            
//     //         let evs = await repo.find()
//     //         expect(evs).to.have.members([
//     //         ])
    
//     //         const chainRecord = new Chain()
//     //         chainRecord.chainId = 42
//     //         await getRepository(Chain).save(chainRecord)
    
//     //         const ev = new ChainEvent()
//     //         ev.eventHash = "123"
//     //         ev.blockTime = 123
//     //         ev.chain = chainRecord
//     //         await repo.save(ev)
    
//     //         const eventHash = keccak256("123")
//     //         // await wrappers1.EventEmitter.emitEvent.sendTransactionAsync(eventHash, txDefaults1)
    
//     //         evs = await repo.find({ relations: ["chain"] })
            
//     //         expect(evs).to.have.deep.members([
//     //             {
//     //                 eventHash,
//     //                 chain: { chainId: chain1.chainId }
//     //             }
//     //         ])
//     //     })
//     // })
// })

