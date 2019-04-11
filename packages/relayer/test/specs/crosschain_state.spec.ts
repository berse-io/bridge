// import { expect } from 'chai';
// import { EthereumStateGadget } from '../../src/chain/ethereum/state_gadget';
// import { CrosschainState } from '../../src/interchain/crosschain_state';
// import { givenEmptyDatabase } from '../helper';
// import { Connection, Repository, createConnection } from 'typeorm';
// import { options } from '../../src/db';
// import { Chain } from '../../src/db/entity/chain';
// import { InterchainStateUpdate } from '../../src/db/entity/interchain_state_update';
// import { ChainEvent } from '../../src/db/entity/chain_event';
// import { keccak256 } from '../../src/utils';
// import { hexify, dehexify } from '@ohdex/shared';
// import { getCurrentBlocktime } from '../../src/interchain/helpers';
// import { CrosschainStateService } from '../../src/interchain/xchain_state_service';
// import { MerkleTree } from '@ohdex/typescript-solidity-merkle-tree';
// import { EventTree } from '../../src/interchain/trees';

// const chai = require("chai");
// const sinonChai = require("sinon-chai");
// const chaiAsPromised = require('chai-as-promised')
// chai.use(sinonChai);
// chai.use(chaiAsPromised)

// describe('CrosschainState', async() => {
//     it('#create', async() => {
//         let state = new CrosschainState;
//     })

//     describe('#proveUpdate', async() => {
//         let state: CrosschainState;
//         let chain1: EthereumStateGadget, chain2: EthereumStateGadget;

//         beforeEach(async() => {
//             state = new CrosschainState;
//             chain1 = new EthereumStateGadget("0")
//             chain2 = new EthereumStateGadget("1")
//         })

//         it('proves successfully', async() => {
//             state.put(chain1)
//             state.put(chain2)
//             state.compute()

//             let proof1 = state.proveUpdate(chain1.id)
//             let proof2 = state.proveUpdate(chain2.id)
//             expect(state.tree.verifyProof(proof1.proof)).to.be.true;
//             expect(state.tree.verifyProof(proof2.proof)).to.be.true;
//         })

//         it('throws for unknown chain', async() => {
//             state.put(chain1)
//             state.put(chain2)
//             state.compute()

//             expect(() => state.proveUpdate("5")).to.throw;
//         })
//     })

//     describe('#proveEvent', async() => {
//         let state: CrosschainState;
//         let chain1: EthereumStateGadget, chain2: EthereumStateGadget;

//         const MOCK_EVENT_HASH = "123";

//         beforeEach(async() => {
//             state = new CrosschainState;
//             chain1 = new EthereumStateGadget("0")
//             chain2 = new EthereumStateGadget("1")
//         })

//         it('proves successfully', async() => {
//             state.put(chain1)
//             state.put(chain2)
//             state.compute()
    
//             chain1.addEvent(MOCK_EVENT_HASH)
//             state.compute()

//             expect(chain1.getLeaf().eventsRoot)
    
//             let proof = state.proveEvent(chain1.id, MOCK_EVENT_HASH)
//             expect(state.tree.verifyProof(proof.rootProof)).to.be.true;
//             expect(chain1.eventsTree.verifyProof(proof.eventProof)).to.be.true;
//         })

//         it('fails for unknown event', async() => {
//             state.put(chain1)
//             state.compute()
    
//             chain1.addEvent(MOCK_EVENT_HASH)
    
//             expect(() => state.proveEvent(chain1.id, "unknown-event")).to.throw('no event unknown-event')
//         })

//         it('fails if state not recomputed', async() => {
//             state.put(chain1)
//             state.put(chain2)
//             state.compute()
    
//             chain1.addEvent(MOCK_EVENT_HASH)
    
//             expect(() => state.proveEvent(chain1.id, MOCK_EVENT_HASH)).to.throw('interchain state tree needs to be recomputed')
//         })
//     })
// })

// const testDbOpts = {
//     ...options,
//     name: 'default'
// }

// describe.only('CrosschainStateService', function() {
//     let conn: Connection;
//     let chain: Repository<Chain>;
//     let stateUpdate: Repository<InterchainStateUpdate>
//     let chainEvent: Repository<ChainEvent>
//     let crosschainStateService: CrosschainStateService;

//     before(async () => {
//         conn = await createConnection(testDbOpts)
//     })

//     beforeEach(async () => {
//         await givenEmptyDatabase(conn)

//         chain = conn.getRepository(Chain)
//         chainEvent = conn.getRepository(ChainEvent)
//         stateUpdate = conn.getRepository(InterchainStateUpdate)

//         crosschainStateService = new CrosschainStateService()
//         crosschainStateService.chain = chain
//         crosschainStateService.chainEvent = chainEvent
//         crosschainStateService.stateUpdate = stateUpdate
//     })

//     afterEach(async () => {
//         // await conn.close()
//     })

//     const MOCK_INITIAL_STATEROOT = (x) => hexify(keccak256("STATEROOT"+x))
//     const MOCK_INITIAL_EVENTROOT = (x) => hexify(keccak256("EVENTROOT"+x))
//     const MOCK_BLOCKHASH = () => keccak256(""+new Date)
//     const MOCK_EVENT = (x) => keccak256(""+x)

//     it("works in a simple case", async () => {
//         // Setup chains
//         let chain1 = new Chain()        
//         chain1.chainId = 4
        
//         let chain2 = new Chain()
//         chain2.chainId = 42

//         await chain.insert([
//             chain1,
//             chain2
//         ])

//         // Setup initial state updates
//         const T = getCurrentBlocktime() - 10000;

//         let stateUpdate_initial = {
//             blockTime: T,
//             blockHash:
//              '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9'
//         };

//         await stateUpdate.insert([
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: hexify(keccak256('1')),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
//                 chain: chain1
//             },
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: hexify(keccak256('2')),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
//                 chain: chain2
//             }
//         ])

//         // Now insert an event
//         let event1 = new ChainEvent()
//         event1.blockTime = T + 10
//         event1.chain = chain1
//         event1.eventHash = hexify(MOCK_EVENT("a"))
//         await event1.save()

//         // Update the state root
//         let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)
//         let { proof: stateProof2, leaf: eventLeaf2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)

//         let eventTree = EventTree([ event1 ])

        
//         expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
//         expect(stateProof.leaf.equals(
//             eventTree.hashLeaf( eventLeaf.toBuffer()) )
//         ).to.be.true;

//         // Insert the new state roots
//         let stateUpdate1 = new InterchainStateUpdate
//         stateUpdate1.chain = chain1
//         stateUpdate1.blockTime = T + 20
//         stateUpdate1.eventRoot = hexify(eventLeaf.toBuffer())
//         stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate1.stateRoot = hexify(stateProof.root)
//         await stateUpdate1.save()

//         let stateUpdate2 = new InterchainStateUpdate
//         stateUpdate2.chain = chain2
//         stateUpdate2.blockTime = T + 20
//         stateUpdate2.eventRoot = hexify(eventLeaf2.toBuffer())
//         stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate2.stateRoot = hexify(stateProof2.root)
//         await stateUpdate2.save()

//         // Now attempt to prove using that state root, on another chain
//         const chainId = chain2.chainId
//         const exchainId = chain1.chainId

//         expect(
//             await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
//         ).to.deep.eq(stateUpdate1)

//         expect(
//             (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[0].eventHash
//         ).to.equal(
//             event1.eventHash
//         )

//         let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
//     })

//     it("works in a complex case, when another state root update occurs", async () => {
//         // Setup chains
//         let chain1 = new Chain()        
//         chain1.chainId = 4
        
//         let chain2 = new Chain()
//         chain2.chainId = 42

//         await chain.insert([
//             chain1,
//             chain2
//         ])

//         // Setup initial state updates
//         let stateUpdate_initial = {
//             blockTime: 1554070986,
//             blockHash:
//              '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
//             stateRoot:
//              '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
//             eventRoot:
//              '0x0000000000000000000000000000000000000000000000000000000000000000', 
//         };

//         await stateUpdate.insert([
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
//                 chain: chain1
//             },
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
//                 chain: chain2
//             }
//         ])

//         // Now insert an event
//         let event1 = new ChainEvent()
//         event1.blockTime = getCurrentBlocktime() - 10
//         event1.chain = chain1
//         event1.eventHash = hexify(MOCK_EVENT("a"))
//         await event1.save()

//         // Update the state root
//         let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

//         let eventTree = EventTree([ event1 ])

//         expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
//         expect(stateProof.leaf.equals(
//             eventTree.hashLeaf( eventLeaf.toBuffer()) )
//         ).to.be.true;

//         // Insert the new state root
//         let stateUpdate1 = new InterchainStateUpdate
//         stateUpdate1.chain = chain1
//         stateUpdate1.blockTime = getCurrentBlocktime()
//         stateUpdate1.eventRoot = hexify(eventLeaf.toBuffer())
//         stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate1.stateRoot = hexify(stateProof.root)
//         await stateUpdate1.save()

//         // Insert another state root in the meanwhile
//         let { proof: stateProof2, leaf: eventLeaf2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)
//         let stateUpdate2 = new InterchainStateUpdate
//         stateUpdate2.chain = chain2
//         stateUpdate2.blockTime = getCurrentBlocktime()
//         stateUpdate2.eventRoot = hexify(eventLeaf2.toBuffer())
//         stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate2.stateRoot = hexify(stateProof2.root)
//         await stateUpdate2.save()



//         // Now attempt to prove using that state root, on another chain
//         const chainId = chain2.chainId
//         const exchainId = chain1.chainId

//         expect(
//             await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
//         ).to.deep.eq(stateUpdate1)

//         expect(
//             (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[0].eventHash
//         ).to.equal(
//             event1.eventHash
//         )

//         let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
        
        
//     })

//     it("works with multiple unacknowleded events", async () => {
//         // Setup chains
//         let chain1 = new Chain()        
//         chain1.chainId = 4
        
//         let chain2 = new Chain()
//         chain2.chainId = 42

//         await chain.insert([
//             chain1,
//             chain2
//         ])

//         // Setup initial state updates
//         let stateUpdate_initial = {
//             blockTime: 1554070986,
//             blockHash:
//              '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
//             stateRoot:
//              '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
//             eventRoot:
//              '0x0000000000000000000000000000000000000000000000000000000000000000', 
//         };

//         await stateUpdate.insert([
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
//                 chain: chain1
//             },
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
//                 chain: chain2
//             }
//         ])

//         // Now insert an event
//         const mockEvents = [
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("a")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("b")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("c")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("d")),
//                 chain: chain2
//             }
//         ]
//         await chainEvent.insert(mockEvents)
        

//         // Update the state root
//         let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

//         let eventTree = EventTree(<ChainEvent[]> [
//             mockEvents[0],
//             mockEvents[1],
//             mockEvents[2]
//         ])

//         const event1 = mockEvents[2]

//         expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
//         expect(stateProof.leaf.equals(
//             eventTree.hashLeaf( eventLeaf.toBuffer()) )
//         ).to.be.true;

//         // Insert the new state root
//         let stateUpdate1 = new InterchainStateUpdate
//         stateUpdate1.chain = chain1
//         stateUpdate1.blockTime = getCurrentBlocktime()
//         stateUpdate1.eventRoot = hexify(eventLeaf.toBuffer())
//         stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate1.stateRoot = hexify(stateProof.root)
//         await stateUpdate1.save()

//         // Insert another event in between
//         await chainEvent.insert([
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("e")),
//                 chain: chain2
//             },
//         ])

//         // Insert another state root in the meanwhile
//         let { proof: stateProof2, leaf: eventLeaf2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)
//         let stateUpdate2 = new InterchainStateUpdate
//         stateUpdate2.chain = chain2
//         stateUpdate2.blockTime = getCurrentBlocktime()
//         stateUpdate2.eventRoot = hexify(eventLeaf2.toBuffer())
//         stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate2.stateRoot = hexify(stateProof2.root)
//         await stateUpdate2.save()


//         // Now attempt to prove using that state root, on another chain
//         const chainId = chain2.chainId
//         const exchainId = chain1.chainId

//         expect(
//             await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
//         ).to.deep.eq(stateUpdate1)

//         expect(
//             (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[2].eventHash
//         ).to.equal(
//             event1.eventHash
//         )

//         let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
        
//         expect(crosschainStateService.proveEvent(chainId, exchainId, "123")).to.be.rejectedWith(Error);
//         expect(crosschainStateService.proveEvent(exchainId, chainId, event1.eventHash)).to.be.rejectedWith("found event but it is from a different chain");
//     })

//     it("behaves correctly with multiple event hashes", async () => {
//         // Setup chains
//         let chain1 = new Chain()
//         chain1.chainId = 4
        
//         let chain2 = new Chain()
//         chain2.chainId = 42

//         await chain.insert([
//             chain1,
//             chain2
//         ])

//         // Setup initial state updates
//         let stateUpdate_initial = {
//             blockTime: 1554070986,
//             blockHash:
//              '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
//             stateRoot:
//              '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
//             eventRoot:
//              '0x0000000000000000000000000000000000000000000000000000000000000000', 
//         };

//         await stateUpdate.insert([
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),    
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),            
//                 chain: chain1
//             },
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),  
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),              
//                 chain: chain2
//             }
//         ])

//         // Now insert an event
//         const DUPLICATE_EVENT_HASH = hexify(MOCK_EVENT("a"))
//         const mockEvents = [
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("a")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("b")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("c")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("d")),
//                 chain: chain2
//             }
//         ]
//         await chainEvent.insert(mockEvents)
        

//         // Update the state root
//         let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

//         let eventTree = EventTree(<ChainEvent[]> [
//             mockEvents[0],
//             mockEvents[1],
//             mockEvents[2]
//         ])

//         const event1 = mockEvents[2]


//         expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
        
//         expect(stateProof.leaf.equals(
//             eventTree.hashLeaf( eventLeaf.toBuffer()) )
//         ).to.be.true;

//         // Insert the new state root
//         let stateUpdate1 = new InterchainStateUpdate
//         stateUpdate1.chain = chain1
//         stateUpdate1.blockTime = getCurrentBlocktime()
//         stateUpdate1.eventRoot = hexify(eventLeaf.toBuffer())
//         stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate1.stateRoot = hexify(stateProof.root)
//         await stateUpdate1.save()

//         // Insert another event in between
//         await chainEvent.insert([
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("e")),
//                 chain: chain2
//             },
//         ])

//         // Insert another state root in the meanwhile
//         let { proof: stateProof2, leaf: eventLeaf2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)
//         let stateUpdate2 = new InterchainStateUpdate
//         stateUpdate2.chain = chain2
//         stateUpdate2.blockTime = getCurrentBlocktime()
//         stateUpdate2.eventRoot = hexify(eventLeaf2.toBuffer())
//         stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
//         stateUpdate2.stateRoot = hexify(stateProof2.root)
//         await stateUpdate2.save()


//         // Now attempt to prove using that state root, on another chain
//         const chainId = chain2.chainId
//         const exchainId = chain1.chainId

//         expect(
//             await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
//         ).to.deep.eq(stateUpdate1)

//         expect(
//             (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[2].eventHash
//         ).to.equal(
//             event1.eventHash
//         )

//         let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
        
//         expect(crosschainStateService.proveEvent(chainId, exchainId, "123")).to.be.rejectedWith(Error);
//         expect(crosschainStateService.proveEvent(exchainId, chainId, event1.eventHash)).to.be.rejectedWith("found event but it is from a different chain");


//     })

//     // TODO test that events are in the correct order in the tree
//     it('sorts events by their time', async () => {
//         // Setup chains
//         let chain1 = new Chain()        
//         chain1.chainId = 4
        
//         let chain2 = new Chain()
//         chain2.chainId = 42

//         await chain.insert([
//             chain1,
//             chain2
//         ])

//         // Setup initial state updates
//         let stateUpdate_initial = {
//             blockTime: 1554070986,
//             blockHash:
//             '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
//             stateRoot:
//             '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
//             eventRoot:
//             '0x0000000000000000000000000000000000000000000000000000000000000000', 
//         };

//         await stateUpdate.insert([
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),    
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),            
//                 chain: chain1
//             },
//             {
//                 ...stateUpdate_initial,
//                 stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),
//                 eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
//                 chain: chain2
//             }
//         ])

//         // Now insert an event
//         const mockEvents = [
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("a")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime() - 10,
//                 eventHash: hexify(MOCK_EVENT("b")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("c")),
//                 chain: chain1
//             },
//             {
//                 blockTime: getCurrentBlocktime(),
//                 eventHash: hexify(MOCK_EVENT("d")),
//                 chain: chain2
//             }
//         ]
//         await chainEvent.insert(mockEvents)
        

//         // Update the state root
//         let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

//         let eventTree = EventTree(<ChainEvent[]> [
//             mockEvents[1],
//             mockEvents[0],
//             mockEvents[2]
//         ])

//         const event1 = mockEvents[2]

//         expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
//         expect(stateProof.leaf.equals(
//             eventTree.hashLeaf( eventLeaf.toBuffer()) )
//         ).to.be.true;
//     })
// })

// // only prove events which haven't already been acknowledged
// // but we can predicate if an event has been acknowledged
// // by whether an event ahead of it has been

// // you also have to look for events in the other chain's tree
// // but they have to be 
