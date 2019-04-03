import { ITokenBridgeEventArgs } from "@ohdex/contracts/lib/build/wrappers/i_token_bridge";
import { EthereumChainTracker } from "../chain/ethereum";
import { EventEmittedEvent, MessageSentEvent } from "../chain/tracker";
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
interface CrosschainEventEvent {
    from: chainId;
    to: chainId;
    data: ITokenBridgeEventArgs;
}
require('asynctrace')
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
            chain.events.on('EventEmitter.EventEmitted', async (ev: EventEmittedEvent) => {
                await self.updateChains(chain.id)
            })

            chain.events.on('ITokenBridge.TokensBridgedEvent', async (msg: MessageSentEvent) => {
                let found: boolean = false;

                for(let chain2 of Object.values(this.chains)) {
                    if(await chain2.receiveCrosschainMessage(msg)) found = true;
                }

                if(!found) {
                    this.logger.error(`Couldn't find a bridge ${msg.toBridge} for cross-chain message`)
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
                // chain.events.once('StateRootUpdated', async () => {
                //     await chain.processBridgeEvents(null)
                // })
                await chain.updateStateRoot(null, null);
            } catch(ex) {
                throw ex;
            }
        }
        await wait(1500)
        
        for(let chain of Object.values(this.chains)) {
            try {
                await chain.processBridgeEvents(null)
            } catch(ex) {
                throw ex;
            }
        }
        // await Promise.all(
        //     Object.values(this.chains).map(async chain => {
        //         try {
        //             // chain.events.once('StateRootUpdated', async () => {
        //             //     await chain.processBridgeEvents(null)
        //             // })
        //             await chain.updateStateRoot(null, null);
        //         } catch(ex) {
        //             throw ex;
        //         }
        //     })
        // )


        // It cannot process the bridge event
        // until it has the state root of the other chain
        // 

        // chain.events.once('StateRootUpdated', async () => {
        //     await chain.processBridgeEvents(null)
        // })
    }

    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop()));
    }
}



