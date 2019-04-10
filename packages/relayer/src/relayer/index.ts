import { ITokenBridgeEventArgs } from "@ohdex/contracts/lib/build/wrappers/i_token_bridge";
import { EthereumChainTracker, CrosschainEvent } from "../chain/ethereum";
import { CrosschainState } from "../interchain/crosschain_state";
import { defaultLogger } from "../logger";

import { createContext } from './context';
import { ChainTrackerFactory } from "../chain/factory";

import { Context } from "@loopback/context";
import { wait } from "@ohdex/shared";


const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;


interface ChainConfig {
    chainType: 'ethereum';
    chainId: string;
}

const eventEmitter = require("events");

type chainId = string;

// require('asynctrace')
export class Relayer {
    chains: { [k: string]: EthereumChainTracker };

    crosschainState: CrosschainState;

    logger;
    config: any;
    ctx: Context

    constructor(config: any) {
        this.chains = {};
        this.config = config;
        
        this.logger = defaultLogger();
        this.ctx = createContext()
        this.crosschainState = new CrosschainState();

    }

    async start() {
        

        // Load the chains.
        let networks: ChainConfig[] = Object.values(this.config);

        this.logger.info('Loading chains...')

        let factory = await this.ctx.get<ChainTrackerFactory>('trackers.Factory');

        for(let conf of networks) {
            // TODO(liamz): just for testing on public kovan/rinkeby
            // if(process.env.NODE_ENV == 'production') {
            //     if(![4,42].includes(parseInt(conf.chainId))) continue;
            // }

            // this.chains[conf.chainId] = (
            //     ctx.get<EthereumChainTracker>('trackers.EthereumChainTracker')
            //     // new EthereumChainTracker(conf)
            // );
            this.chains[conf.chainId] = await factory.create(conf)
        }

        // Start all chains.
        let started = [];
        for(let chain of Object.values(this.chains)) {
            started = [ ...started, chain.start() ]
        }
        
        await Promise.all(started)

        // Add their state gadgets
        Object.values(this.chains).map(chain => {
            this.crosschainState.put(chain.stateGadget)
        });

        // Start state update loop
        let self = this;
        
        Object.values(this.chains).map(chain => {
            chain.events.on('eventEmitted', async (ev) => {
                await self.updateChains(chain.id)
            })

            chain.events.on('crosschainEvent', async (ev: CrosschainEvent<any>) => {
                let found: boolean = false;

                for(let chain2 of Object.values(this.chains)) {
                    if(await chain2.receiveCrosschainEvent(ev)) found = true;
                }

                if(!found) {
                    this.logger.error(`Couldn't find a bridge ${ev.to.targetBridge} for cross-chain message`)
                }
            })

            chain.listen()
        });
    }

    async updateChains(exceptChain: string) {
        this.logger.info(`Computing new state root`)

        // Compute new state roots
        // And then we can process the new bridge events after they have been ack'd.
        for(let chain of Object.values(this.chains)) {
            try {
                await chain.updateStateRoot(null, null);
            } catch(ex) {
                throw ex;
            }
        }
    }

    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop()));
    }
}



