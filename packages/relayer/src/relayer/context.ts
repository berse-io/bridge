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
import { LoggerProvider } from '../logger';


export function createContext(): Context {
    let ctx = new Context();

    // Establish DB connection.
    ctx.bind('db.conn.opts').to(options)
    ctx.bind('db.conn').toProvider(DbConnProvider)
    

    ctx.bind('repositories.Chain').toProvider(ChainRepoProvider);
    ctx.bind('repositories.ChainEvent').toProvider(ChainEventRepoProvider)
    ctx.bind('repositories.InterchainStateUpdate').toProvider(InterchainStateUpdateRepoProvider)
    
    ctx.bind('interchain.CrosschainStateService').toClass(CrosschainStateService)
    
    ctx.bind('trackers.EthereumChainTracker').to(EthereumChainTracker)
    
    ctx.bind('trackers.Factory').toClass(ChainTrackerFactory)

    ctx.bind('logging.default').toProvider(LoggerProvider)
    
    return ctx
}
