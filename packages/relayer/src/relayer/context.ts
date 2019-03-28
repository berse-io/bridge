import { Context } from '@loopback/context'
import { Chain } from '../db/entity/chain';
import { getRepository } from 'typeorm';
import { ChainEvent } from '../db/entity/chain_event';
import { InterchainStateUpdate } from '../db/entity/interchain_state_update';
import { CrosschainState } from '../interchain/crosschain_state';
import { EthereumChainTracker } from '../chain/ethereum';
import { ChainTrackerFactory } from '../chain/factory';
import { DbService } from '../db';

const ctx = new Context('application');

ctx.bind('database').toProvider(DbService)

// ctx.bind('x').to




ctx.bind('repositories.Chain').toDynamicValue(() => getRepository(Chain))
ctx.bind('repositories.ChainEvent').toDynamicValue(() => getRepository(ChainEvent))
ctx.bind('repositories.InterchainStateUpdate').toDynamicValue(() => getRepository(InterchainStateUpdate))

ctx.bind('interchain.CrosschainStateService').toClass(CrosschainState)

// Class
ctx.bind('trackers.EthereumChainTracker').to(EthereumChainTracker)

ctx.bind('trackers.ChainTrackerFactory').toClass(ChainTrackerFactory)

export {
    ctx
};