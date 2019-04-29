import { expect } from 'chai';
import { getRepository, createConnection, Connection } from "typeorm";
import { options } from "../../src/db";
import { Chain } from "../../src/db/entity/chain";
import { ChainEvent } from "../../src/db/entity/chain_event";
import { InterchainStateUpdate } from "../../src/db/entity/interchain_state_update";
import { clearDb } from '../helper';
import { Snapshot } from '../../src/db/entity/snapshot';
import { EventTree, StateTree } from '../../src/interchain/trees';
import { keccak256 } from '../../src/utils';

const testDbOpts = {
    ...options,
    name: 'default'
}

describe('Query helpers', function() {
    let conn: Connection;
    
    before(async () => {
    })

    beforeEach(async () => {
        conn = await createConnection(testDbOpts)
    })

    afterEach(async () => {
        await conn.close()
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
                eventRoot: "0x0000000000000000000000000000000000000000000000000000000000000000"
            },
            {
                "blockTime": 1553695776 + 5,
                "blockHash": "0x021fa0398570971415a4166cb9284f595f81524767e3637082f2a6f5924803ff",
                chain,
                "stateRoot": "0xe8b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
                eventRoot: "0x0000000000000000000000000000000000000000000000000000000000000000"
            },
            {
                "blockTime": 1553695776 + 10,
                "blockHash": "0xa21fa0398570971415a4166cb9284f595f81524767e3637082f2a6f5924803ff",
                chain,
                "stateRoot": "0x38b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
                eventRoot: "0x0000000000000000000000000000000000000000000000000000000000000000"
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

    it('ChainEvent.getEventsBeforeTime', async () => {
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
            { chainId: 5 },
            { chainId: 42 }
        ])
        .execute()

        let chain = await getRepository(Chain).findOne({ chainId: 42 })
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
            },
            {
                "blockTime": 1553695776 + 10,
                chain: { chainId: 5 },
                "eventHash": "0x38b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
            },
            {
                "blockTime": 1553695776 + 15,
                chain,
                "eventHash": "0x38b363bc579954571ec3cdd892e0056399381bf69a62d02bf64a99ca822504fb",
            }
        ];

        await repo.save(fixtures, {});

        let latest = await ChainEvent.getEventsBeforeTime(chain.chainId, 1553695776)
        expect(latest).to.have.length(0);

        latest = await ChainEvent.getEventsBeforeTime(chain.chainId, 1553695776 + 10)
        expect(latest).to.have.length(2)
        expect(fixtures[0]).to.deep.include(latest[0])
        expect(fixtures[1]).to.deep.include(latest[1])

        latest = await ChainEvent.getEventsBeforeTime(chain.chainId, 1553695776 + 11)
        expect(latest).to.have.length(2)
        expect(fixtures[0]).to.deep.include(latest[0])
        expect(fixtures[1]).to.deep.include(latest[1])
    })

    async function givenEventTree(items: any[]) {
        let tree = new EventTree(items.map(keccak256), keccak256)
        return tree;
    }

    async function givenStateTree(chainIds: number[], eventTrees: EventTree[]) {
        let state = Object.assign(
            {},
            ...chainIds.map((id, i) => {
                return {
                    [id]: eventTrees[i].root()
                }
            })
        )
        let tree = new StateTree(state)
        return tree;
    }

    it('loads Snapshot', async () => {
        let snapshot = new Snapshot()

        // snapshot.eventTree = await givenEventTree([ 1,2,3,4,5 ])
        
    })
})
