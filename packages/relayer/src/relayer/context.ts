import { Context } from '@loopback/context'
import { EthereumChainTracker } from '../chain/ethereum';
import { ChainTrackerFactory } from '../chain/factory';
import { options } from '../db';
import { DbConnProvider, ChainRepoProvider, ChainEventRepoProvider, InterchainStateUpdateRepoProvider, SnapshotRepoProvider } from '../db/provider';
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
    ctx.bind('repositories.Snapshot').toProvider(SnapshotRepoProvider)
    
    ctx.bind('interchain.CrosschainStateService').toClass(CrosschainStateService)
    
    ctx.bind('trackers.EthereumChainTracker').to(EthereumChainTracker)
    
    ctx.bind('trackers.Factory').toClass(ChainTrackerFactory)

    ctx.bind('logging.default').toProvider(LoggerProvider)
    
    return ctx
}
