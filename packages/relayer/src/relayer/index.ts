import { ITokenBridgeEventArgs } from "@ohdex/contracts/lib/build/wrappers/i_token_bridge";
import { EthereumChainTracker } from "../chain/ethereum";
import { EventEmittedEvent, MessageSentEvent } from "../chain/tracker";
import { CrosschainState } from "../interchain/crosschain_state";
import { defaultLogger } from "../logger";

import { ctx } from './context';
import { ChainTrackerFactory } from "../chain/factory";


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

export class Relayer {
    chains: { [k: string]: EthereumChainTracker };

    crosschainState: CrosschainState;

    logger;
    config: any;

    constructor(config: any) {
        this.chains = {};
        this.config = config;
        
        this.logger = defaultLogger;

        this.crosschainState = new CrosschainState();
    }

    async start() {
        let networks: ChainConfig[] = Object.values(this.config);

        this.logger.info('Loading chains...')

        let factory = await ctx.get<ChainTrackerFactory>('trackers.ProviderFactory');

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
        Object.values(this.chains).map(chain => {
            chain.events.on('EventEmitter.EventEmitted', async (ev: EventEmittedEvent) => {
                await this.updateChains()
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

    async updateChains() {
        this.crosschainState.compute()

        this.logger.info(`Computed new interchain state root: ${this.crosschainState.root}`)
        
        await Promise.all(
            Object.values(this.chains).map(async chain => {
                try {
                    let { proof, leaf } = this.crosschainState.proveUpdate(chain.stateGadget.getId())
                    await chain.updateStateRoot(
                        proof,
                        leaf
                    );

                    chain.events.once('StateRootUpdated', async () => {
                        await chain.processBridgeEvents(
                            this.crosschainState
                        )
                    })
                    
                } catch(ex) {
                    this.logger.error(ex)
                }
            })
        )
    }

    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop()));
    }
}



