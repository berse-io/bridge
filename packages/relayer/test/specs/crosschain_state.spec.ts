import { expect, assert } from 'chai';
import { givenEmptyDatabase } from '../helper';
import { Connection, Repository, createConnection } from 'typeorm';
import { options } from '../../src/db';
import { Chain } from '../../src/db/entity/chain';
import { InterchainStateUpdate } from '../../src/db/entity/interchain_state_update';
import { ChainEvent } from '../../src/db/entity/chain_event';
import { keccak256 } from '../../src/utils';
import { hexify, dehexify } from '@ohdex/shared';
import { getCurrentBlocktime } from '../../src/interchain/helpers';
import { CrosschainStateService } from '../../src/interchain/xchain_state_service';
import { MerkleTree } from '@ohdex/typescript-solidity-merkle-tree';
import { EventTree, StateTree } from '../../src/interchain/trees';
import { Snapshot } from '../../src/db/entity/snapshot';

const chai = require("chai");
const sinonChai = require("sinon-chai");
const chaiAsPromised = require('chai-as-promised')
chai.use(sinonChai);
chai.use(chaiAsPromised)

const testDbOpts = {
    ...options,
    name: 'default'
}



describe.only('CrosschainStateService', function() {
    this.timeout(10000);


    let conn: Connection;
    let chain: Repository<Chain>;
    let stateUpdate: Repository<InterchainStateUpdate>
    let chainEvent: Repository<ChainEvent>
    let crosschainStateService: CrosschainStateService;

    async function givenMockChain(chainId: number, ) {
        let chain1 = new Chain()        
        chain1.chainId = chainId
        await chain.insert([
            chain1
        ])
    
        const T = getCurrentBlocktime() - 10000;
    
        let stateUpdate_initial = {
            blockTime: T,
            blockHash:
            '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9'
        };
    
        await stateUpdate.insert([
            {
                ...stateUpdate_initial,
                stateRoot: hexify(keccak256('1')),
                eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
                chain: chain1
            }
        ])

        return { chain1, T, stateUpdate_initial }
    }

    async function givenMockEvent(chain, eventHashData, T) {
        // Now insert an event
        let event1 = new ChainEvent()
        event1.blockTime = T
        event1.chain = chain
        event1.eventHash = hexify(MOCK_EVENT(eventHashData))
        await ChainEvent.insert(event1)
        return event1
    }

    async function givenStateUpdate(chain: Chain, T: number, stateTree: StateTree) {
        let stateRootUpdate = new InterchainStateUpdate
        stateRootUpdate.chain = chain;
        stateRootUpdate.blockHash = hexify(MOCK_BLOCKHASH())
        stateRootUpdate.blockTime = T + 2
        stateRootUpdate.eventRoot = hexify(stateTree.state[chain.chainId].eventsRoot)
        stateRootUpdate.stateRoot = stateTree.root
        await InterchainStateUpdate.insert([
            stateRootUpdate
        ])
        return stateRootUpdate
    }

    async function givenSnapshot(chain: Chain, stateTree: StateTree, update?: InterchainStateUpdate) {
        let snapshot = new Snapshot
        snapshot.stateTree = stateTree;
        snapshot.stateRoot = stateTree.root;
        snapshot.chain = chain
        snapshot.update = update
        await Snapshot.insert(
            snapshot
        )

        
    }



    before(async () => {
        conn = await createConnection(testDbOpts)
    })

    beforeEach(async () => {
        await givenEmptyDatabase(conn)

        chain = conn.getRepository(Chain)
        chainEvent = conn.getRepository(ChainEvent)
        stateUpdate = conn.getRepository(InterchainStateUpdate)

        crosschainStateService = new CrosschainStateService()
        crosschainStateService.chain = chain
        crosschainStateService.chainEvent = chainEvent
        crosschainStateService.stateUpdate = stateUpdate
        crosschainStateService.logger = {
            log: function(){}
        }
    })

    afterEach(async () => {
        // await conn.close()
    })

    const MOCK_INITIAL_STATEROOT = (x) => hexify(keccak256("STATEROOT"+x))
    const MOCK_INITIAL_EVENTROOT = (x) => hexify(keccak256("EVENTROOT"+x))
    const MOCK_BLOCKHASH = () => keccak256(""+new Date)
    const MOCK_EVENT = (x) => keccak256(""+x)

    describe('#getStateTree', async () => {
        it('works with 1 chain', async () => {
            let { chain1, T } = await givenMockChain(4)

            // Now insert an event
            let event1 = new ChainEvent()
            event1.blockTime = T + 10
            event1.chain = chain1
            event1.eventHash = hexify(MOCK_EVENT("a"))
            await ChainEvent.insert(event1)

            let tree = await crosschainStateService.getStateTree()
        })

        it('works with 2 chains', async () => {
            let { chain1, T } = await givenMockChain(4)
            let { chain1: chain2 } = await givenMockChain(42)

            let event11 = await givenMockEvent(chain1, '1', T)
            let event12 = await givenMockEvent(chain2, '1', T)

            let eventTree1 = await crosschainStateService.getEventsTree(chain1.chainId, T)
            let eventTree2 = await crosschainStateService.getEventsTree(chain2.chainId, T)

            let tree = await crosschainStateService.getStateTree()
            expect(tree.state).to.deep.equal({
                [chain1.chainId]: {
                    eventsRoot: eventTree1.root()
                },
                [chain2.chainId]: {
                    eventsRoot: eventTree2.root()
                }
            })
        })
        
    })

    describe('#getEventsTree', async () => {
        it('fails on no events', async () => {
            let { chain1, T } = await givenMockChain(4)
            expect(
                crosschainStateService.getEventsTree(chain1.chainId, T)
            ).to.eventually.be.rejectedWith('No events')
        })
        
        it('gets events, including those on T', async () => {
            let { chain1, T } = await givenMockChain(4)
            let event1 = await givenMockEvent(chain1, '1', T)
            let event2 = await givenMockEvent(chain1, '1', T + 5)

            let eventTree = await crosschainStateService.getEventsTree(chain1.chainId, T)
            
            let items = eventTree.items.map(hexify)
            expect(items).to.have.deep.members([
                event1.eventHash
            ])
        })

        it('gets events, before T', async () => {
            let { chain1, T } = await givenMockChain(4)
            let event1 = await givenMockEvent(chain1, '1', T - 1)
            let event2 = await givenMockEvent(chain1, '1', T + 5)

            let eventTree = await crosschainStateService.getEventsTree(chain1.chainId, T)
            
            let items = eventTree.items.map(hexify)
            expect(items).to.have.deep.members([
                event1.eventHash
            ])
        })
    })

    describe.only('#proveEvent', () => {
        it('gets the correct Snapshot', async () => {
            let { chain1, T } = await givenMockChain(4)
            let { chain1: chain2 } = await givenMockChain(42)

            let event1 = await givenMockEvent(chain1, '1', T + 1)
            let event2 = await givenMockEvent(chain1, '2', T + 1)
            let event3 = await givenMockEvent(chain2, '3', T + 1)
            let event4 = await givenMockEvent(chain1, '4', T + 2)

            let stateTree = await crosschainStateService.getStateTree()

            let stateUpdate1 = await givenStateUpdate(chain2, T + 2, stateTree)
            await givenSnapshot(chain2, stateTree, stateUpdate1)
            let stateUpdate2 = await givenStateUpdate(chain1, T + 2, stateTree)
            await givenSnapshot(chain1, stateTree, stateUpdate2)
            let stateUpdate3 = await givenStateUpdate(chain2, T + 3, stateTree)
            await givenSnapshot(chain2, stateTree, stateUpdate3)


            let event5 = await givenMockEvent(chain1, '5', T + 4)
            let stateTree2 = await crosschainStateService.getStateTree()

            let stateUpdate4 = await givenStateUpdate(chain1, T + 4, stateTree2)
            await givenSnapshot(chain1, stateTree2, stateUpdate4)

            console.log(
                await InterchainStateUpdate.find({ loadRelationIds: true })
            )
            console.log(
                await Snapshot.find({ loadRelationIds: true })
            )
            let proof = await crosschainStateService.proveEvent(
                chain2.chainId, 
                chain1.chainId, 
                event2.eventHash
            );

            // let snapshot = await stateUpdate1.getSnapshot()
            // snapshot.stateTree
        })


        // it('proves using current state root', async () => {
        //     let { chain1, T } = await givenMockChain(4)
        //     let { chain1: chain2 } = await givenMockChain(42)

        //     let event1 = await givenMockEvent(chain1, '1', T + 1)
        //     // event2 we are going to prove
        //     let event2 = await givenMockEvent(chain1, '2', T + 1)
        //     let event3 = await givenMockEvent(chain2, '3', T + 1)
        //     let event4 = await givenMockEvent(chain1, '4', T + 2)

        //     let stateTree = await crosschainStateService.getStateTree(T + 2)

        //     await givenStateUpdate(chain2, T + 2, stateTree)
        //     // we acknowledge event2 here at T+2
        //     await givenStateUpdate(chain1, T + 2, stateTree)
        //     await givenStateUpdate(chain2, T + 3, stateTree)


        //     let event5 = await givenMockEvent(chain1, '5', T + 4)

        //     let stateTree2 = await crosschainStateService.getStateTree(T + 4)

        //     await givenStateUpdate(chain1, T + 4, stateTree2)

            
        //     let proof = await crosschainStateService.proveEvent(
        //         chain2.chainId, 
        //         chain1.chainId, 
        //         event2.eventHash
        //     );

        //     // [
        //     //     stateTree,
        //     //     stateTree2
        //     // ].map(tree => {
        //     //     console.log(
        //     //         hexify(tree.state[chain2.chainId].eventsRoot)
        //     //     )
        //     // })

        //     // console.log(
        //     //     await InterchainStateUpdate.find({ relations: ['chain']})
        //     // )

        //     // liamz: the problem atm is that the below is failing
        //     // apparently because the eventLeafProof.root is referring to stateTree2
        //     // instead of stateTree (the 1st)
        //     // 
        //     // actually wait that makes complete sense

        //     expect(
        //         hexify(proof.eventLeafProof.root)
        //     ).to.eq(
        //         hexify(stateTree2.state[chain1.chainId].eventsRoot)
        //     )
        // })

    })

    // describe.only('Snapshot', async () => {

    // })



    it('events have canonical ordering', async () => {
        // TODO(liamz)
        assert(true)
    })

    // it("works in a simple case", async () => {
    //     // Setup chains
        // let chain1 = new Chain()        
        // chain1.chainId = 4
        
    //     let chain2 = new Chain()
    //     chain2.chainId = 42

    //     await chain.insert([
    //         chain1,
    //         chain2
    //     ])

    //     // Setup initial state updates
        // const T = getCurrentBlocktime() - 10000;

        // let stateUpdate_initial = {
        //     blockTime: T,
        //     blockHash:
        //      '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9'
        // };

        // await stateUpdate.insert([
        //     {
        //         ...stateUpdate_initial,
        //         stateRoot: hexify(keccak256('1')),
        //         eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
        //         chain: chain1
        //     },
        //     {
        //         ...stateUpdate_initial,
        //         stateRoot: hexify(keccak256('2')),
        //         eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
        //         chain: chain2
        //     }
        // ])

        // // Now insert an event
        // let event1 = new ChainEvent()
        // event1.blockTime = T + 10
        // event1.chain = chain1
        // event1.eventHash = hexify(MOCK_EVENT("a"))
        // await event1.save()

        // let event2 = new ChainEvent()
        // event2.blockTime = T + 10
        // event2.chain = chain2
        // event2.eventHash = hexify(MOCK_EVENT("a"))
        // await event2.save()

    //     // Update the state root
    //     let { proof: stateProof, eventRoot: eventLeaf, root: stateRoot1 } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)
    //     let { proof: stateProof2, eventRoot: eventLeaf2, root: stateRoot2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)

    //     let eventTree = await EventTree([ event1 ])

        
    //     expect(
    //         hexify(eventTree.root())
    //     ).to.equal(eventLeaf);
        
    //     // expect(stateProof.leaf.equals(
    //     //     eventTree.hashLeaf( eventLeaf.toBuffer()) )
    //     // ).to.be.true;

    //     // Insert the new state roots
    //     let stateUpdate1 = new InterchainStateUpdate
    //     stateUpdate1.chain = chain1
    //     stateUpdate1.blockTime = T + 20
    //     stateUpdate1.eventRoot = eventLeaf;
    //     stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate1.stateRoot = stateRoot1
    //     await stateUpdate1.save()

    //     let stateUpdate2 = new InterchainStateUpdate
    //     stateUpdate2.chain = chain2
    //     stateUpdate2.blockTime = T + 20
    //     stateUpdate2.eventRoot = eventLeaf2
    //     stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate2.stateRoot = stateRoot2
    //     await stateUpdate2.save()

    //     // Now attempt to prove using that state root, on another chain
    //     const chainId = chain2.chainId
    //     const exchainId = chain1.chainId

    //     expect(
    //         await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
    //     ).to.deep.eq(stateUpdate1)

    //     expect(
    //         (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[0].eventHash
    //     ).to.equal(
    //         event1.eventHash
    //     )

    //     let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
    // })

    // it("works in a complex case, when another state root update occurs", async () => {
    //     // Setup chains
    //     let chain1 = new Chain()        
    //     chain1.chainId = 4
        
    //     let chain2 = new Chain()
    //     chain2.chainId = 42

    //     await chain.insert([
    //         chain1,
    //         chain2
    //     ])

    //     // Setup initial state updates
    //     let stateUpdate_initial = {
    //         blockTime: 1554070986,
    //         blockHash:
    //          '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
    //         stateRoot:
    //          '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
    //         eventRoot:
    //          '0x0000000000000000000000000000000000000000000000000000000000000000', 
    //     };

    //     await stateUpdate.insert([
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
    //             chain: chain1
    //         },
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
    //             chain: chain2
    //         }
    //     ])

    //     // Now insert an event
    //     let event1 = new ChainEvent()
    //     event1.blockTime = getCurrentBlocktime() - 10
    //     event1.chain = chain1
    //     event1.eventHash = hexify(MOCK_EVENT("a"))
    //     await event1.save()

    //     // Update the state root
    //     let { proof: stateProof, eventRoot: eventLeaf, root: stateRoot1 }  = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

    //     let eventTree = await EventTree([ event1 ])

    //     expect(
    //         hexify(eventTree.root())
    //     ).to.equal(eventLeaf);
    //     // expect(stateProof.leaf.equals(
    //     //     eventTree.hashLeaf( eventLeaf.toBuffer()) )
    //     // ).to.be.true;

    //     // Insert the new state root
    //     let stateUpdate1 = new InterchainStateUpdate
    //     stateUpdate1.chain = chain1
    //     stateUpdate1.blockTime = getCurrentBlocktime()
    //     stateUpdate1.eventRoot = eventLeaf
    //     stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate1.stateRoot = stateRoot1
    //     await stateUpdate1.save()

    //     // Insert another state root in the meanwhile
    //     let { proof: stateProof2, eventRoot: eventLeaf2, root: stateRoot2  } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)
    //     let stateUpdate2 = new InterchainStateUpdate
    //     stateUpdate2.chain = chain2
    //     stateUpdate2.blockTime = getCurrentBlocktime()
    //     stateUpdate2.eventRoot = eventLeaf2
    //     stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate2.stateRoot = stateRoot2
    //     await stateUpdate2.save()



    //     // Now attempt to prove using that state root, on another chain
    //     const chainId = chain2.chainId
    //     const exchainId = chain1.chainId

    //     expect(
    //         await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
    //     ).to.deep.eq(stateUpdate1)

    //     expect(
    //         (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[0].eventHash
    //     ).to.equal(
    //         event1.eventHash
    //     )

    //     let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
        
        
    // })

    // it("works with multiple unacknowleded events", async () => {
    //     // Setup chains
    //     let chain1 = new Chain()        
    //     chain1.chainId = 4
        
    //     let chain2 = new Chain()
    //     chain2.chainId = 42

    //     await chain.insert([
    //         chain1,
    //         chain2
    //     ])

    //     // Setup initial state updates
    //     let stateUpdate_initial = {
    //         blockTime: 1554070986,
    //         blockHash:
    //          '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
    //         stateRoot:
    //          '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
    //         eventRoot:
    //          '0x0000000000000000000000000000000000000000000000000000000000000000', 
    //     };

    //     await stateUpdate.insert([
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),
    //             chain: chain1
    //         },
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
    //             chain: chain2
    //         }
    //     ])

    //     // Now insert an event
    //     const mockEvents = [
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("a")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("b")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("c")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("d")),
    //             chain: chain2
    //         }
    //     ]
    //     await chainEvent.insert(mockEvents)
        

    //     // Update the state root
    //     let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

    //     let eventTree = await EventTree(<ChainEvent[]> [
    //         mockEvents[0],
    //         mockEvents[1],
    //         mockEvents[2]
    //     ])

    //     const event1 = mockEvents[2]

    //     expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
    //     expect(stateProof.leaf.equals(
    //         eventTree.hashLeaf( eventLeaf.toBuffer()) )
    //     ).to.be.true;

    //     // Insert the new state root
    //     let stateUpdate1 = new InterchainStateUpdate
    //     stateUpdate1.chain = chain1
    //     stateUpdate1.blockTime = getCurrentBlocktime()
    //     stateUpdate1.eventRoot = hexify(eventLeaf.toBuffer())
    //     stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate1.stateRoot = hexify(stateProof.root)
    //     await stateUpdate1.save()

    //     // Insert another event in between
    //     await chainEvent.insert([
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("e")),
    //             chain: chain2
    //         },
    //     ])

    //     // Insert another state root in the meanwhile
    //     let { proof: stateProof2, leaf: eventLeaf2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)
    //     let stateUpdate2 = new InterchainStateUpdate
    //     stateUpdate2.chain = chain2
    //     stateUpdate2.blockTime = getCurrentBlocktime()
    //     stateUpdate2.eventRoot = hexify(eventLeaf2.toBuffer())
    //     stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate2.stateRoot = hexify(stateProof2.root)
    //     await stateUpdate2.save()


    //     // Now attempt to prove using that state root, on another chain
    //     const chainId = chain2.chainId
    //     const exchainId = chain1.chainId

    //     expect(
    //         await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
    //     ).to.deep.eq(stateUpdate1)

    //     expect(
    //         (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[2].eventHash
    //     ).to.equal(
    //         event1.eventHash
    //     )

    //     let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
        
    //     expect(crosschainStateService.proveEvent(chainId, exchainId, "123")).to.be.rejectedWith(Error);
    //     expect(crosschainStateService.proveEvent(exchainId, chainId, event1.eventHash)).to.be.rejectedWith("found event but it is from a different chain");
    // })

    // it("behaves correctly with multiple event hashes", async () => {
    //     // Setup chains
    //     let chain1 = new Chain()
    //     chain1.chainId = 4
        
    //     let chain2 = new Chain()
    //     chain2.chainId = 42

    //     await chain.insert([
    //         chain1,
    //         chain2
    //     ])

    //     // Setup initial state updates
    //     let stateUpdate_initial = {
    //         blockTime: 1554070986,
    //         blockHash:
    //          '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
    //         stateRoot:
    //          '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
    //         eventRoot:
    //          '0x0000000000000000000000000000000000000000000000000000000000000000', 
    //     };

    //     await stateUpdate.insert([
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),    
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),            
    //             chain: chain1
    //         },
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),  
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),              
    //             chain: chain2
    //         }
    //     ])

    //     // Now insert an event
    //     const DUPLICATE_EVENT_HASH = hexify(MOCK_EVENT("a"))
    //     const mockEvents = [
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("a")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("b")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("c")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("d")),
    //             chain: chain2
    //         }
    //     ]
    //     await chainEvent.insert(mockEvents)
        

    //     // Update the state root
    //     let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

    //     let eventTree = await EventTree(<ChainEvent[]> [
    //         mockEvents[0],
    //         mockEvents[1],
    //         mockEvents[2]
    //     ])

    //     const event1 = mockEvents[2]


    //     expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
        
    //     expect(stateProof.leaf.equals(
    //         eventTree.hashLeaf( eventLeaf.toBuffer()) )
    //     ).to.be.true;

    //     // Insert the new state root
    //     let stateUpdate1 = new InterchainStateUpdate
    //     stateUpdate1.chain = chain1
    //     stateUpdate1.blockTime = getCurrentBlocktime()
    //     stateUpdate1.eventRoot = hexify(eventLeaf.toBuffer())
    //     stateUpdate1.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate1.stateRoot = hexify(stateProof.root)
    //     await stateUpdate1.save()

    //     // Insert another event in between
    //     await chainEvent.insert([
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("e")),
    //             chain: chain2
    //         },
    //     ])

    //     // Insert another state root in the meanwhile
    //     let { proof: stateProof2, leaf: eventLeaf2 } = await crosschainStateService.computeUpdatedStateRoot(chain2.chainId)
    //     let stateUpdate2 = new InterchainStateUpdate
    //     stateUpdate2.chain = chain2
    //     stateUpdate2.blockTime = getCurrentBlocktime()
    //     stateUpdate2.eventRoot = hexify(eventLeaf2.toBuffer())
    //     stateUpdate2.blockHash = hexify(MOCK_BLOCKHASH())
    //     stateUpdate2.stateRoot = hexify(stateProof2.root)
    //     await stateUpdate2.save()


    //     // Now attempt to prove using that state root, on another chain
    //     const chainId = chain2.chainId
    //     const exchainId = chain1.chainId

    //     expect(
    //         await InterchainStateUpdate.getLatestStaterootAtTime(exchainId, getCurrentBlocktime())
    //     ).to.deep.eq(stateUpdate1)

    //     expect(
    //         (await ChainEvent.getEventsBeforeTime(exchainId, stateUpdate1.blockTime))[2].eventHash
    //     ).to.equal(
    //         event1.eventHash
    //     )

    //     let eventProof = await crosschainStateService.proveEvent(chainId, exchainId, event1.eventHash)
        
    //     expect(crosschainStateService.proveEvent(chainId, exchainId, "123")).to.be.rejectedWith(Error);
    //     expect(crosschainStateService.proveEvent(exchainId, chainId, event1.eventHash)).to.be.rejectedWith("found event but it is from a different chain");


    // })

    // // TODO test that events are in the correct order in the tree
    // it('sorts events by their time', async () => {
    //     // Setup chains
    //     let chain1 = new Chain()        
    //     chain1.chainId = 4
        
    //     let chain2 = new Chain()
    //     chain2.chainId = 42

    //     await chain.insert([
    //         chain1,
    //         chain2
    //     ])

    //     // Setup initial state updates
    //     let stateUpdate_initial = {
    //         blockTime: 1554070986,
    //         blockHash:
    //         '0x892f3fde98784ab5a7804c4eea415ad9b3e6f182eb010023341e166b15e354d9',
    //         stateRoot:
    //         '0x6b8721ab3cc7858deb2ace0243122683fdfab443919155e6b55628626e41cb30',
    //         eventRoot:
    //         '0x0000000000000000000000000000000000000000000000000000000000000000', 
    //     };

    //     await stateUpdate.insert([
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain1.chainId),    
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain1.chainId),            
    //             chain: chain1
    //         },
    //         {
    //             ...stateUpdate_initial,
    //             stateRoot: MOCK_INITIAL_STATEROOT(chain2.chainId),
    //             eventRoot: MOCK_INITIAL_EVENTROOT(chain2.chainId),
    //             chain: chain2
    //         }
    //     ])

    //     // Now insert an event
    //     const mockEvents = [
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("a")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime() - 10,
    //             eventHash: hexify(MOCK_EVENT("b")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("c")),
    //             chain: chain1
    //         },
    //         {
    //             blockTime: getCurrentBlocktime(),
    //             eventHash: hexify(MOCK_EVENT("d")),
    //             chain: chain2
    //         }
    //     ]
    //     await chainEvent.insert(mockEvents)
        

    //     // Update the state root
    //     let { proof: stateProof, leaf: eventLeaf } = await crosschainStateService.computeUpdatedStateRoot(chain1.chainId)

    //     let eventTree = await EventTree(<ChainEvent[]> [
    //         mockEvents[1],
    //         mockEvents[0],
    //         mockEvents[2]
    //     ])

    //     const event1 = mockEvents[2]

    //     expect(eventTree.root().equals(eventLeaf.toBuffer())).to.be.true;
    //     // expect(stateProof.leaf.equals(
    //     //     eventTree.hashLeaf( eventLeaf.toBuffer()) )
    //     // ).to.be.true;
    // })
})

// only prove events which haven't already been acknowledged
// but we can predicate if an event has been acknowledged
// by whether an event ahead of it has been

// you also have to look for events in the other chain's tree
// but they have to be 
