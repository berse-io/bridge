import { Context } from '@loopback/context'
import { Chain } from '../db/entity/chain';
import { getRepository } from 'typeorm';
import { ChainEvent } from '../db/entity/chain_event';
import { InterchainStateUpdate } from '../db/entity/interchain_state_update';
import { CrosschainState } from '../interchain/crosschain_state';
import { EthereumChainTracker } from '../chain/ethereum';
import { ChainTrackerFactory } from '../chain/factory';
import { options } from '../db';
import { DbConnProvider, ChainRepoProvider, ChainEventRepoProvider, InterchainStateUpdateRepoProvider } from '../db/provider';
import { CrosschainStateService } from '../interchain/xchain_state_service';


export function createContext(): Context {
    let ctx = new Context();

    // Establish DB connection.
    // let dbService = await this.ctx.getSync<DbService>('database')
    // await dbService.value()
    // let dbService = new DbService(options)
    // let conn = await dbService.value()
    ctx.bind('db.conn.opts').to(options)
    ctx.bind('db.conn').toProvider(DbConnProvider)
    

    // ctx.bind('repositories.Chain').toProvider(getRepository(Chain))
    ctx.bind('repositories.Chain').toProvider(ChainRepoProvider);
    ctx.bind('repositories.ChainEvent').toProvider(ChainEventRepoProvider)
    ctx.bind('repositories.InterchainStateUpdate').toProvider(InterchainStateUpdateRepoProvider)

    // ctx.bind('repositories.ChainEvent').to(getRepository(ChainEvent))
    // ctx.bind('repositories.InterchainStateUpdate').to(getRepository(InterchainStateUpdate))
    
    ctx.bind('interchain.CrosschainStateService').toClass(CrosschainStateService)
    
    // Class
    ctx.bind('trackers.EthereumChainTracker').to(EthereumChainTracker)
    
    ctx.bind('trackers.Factory').toClass(ChainTrackerFactory)
    
    return ctx
}
