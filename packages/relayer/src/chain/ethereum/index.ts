import { RPCSubprovider, Web3ProviderEngine } from "0x.js";
import { NonceTrackerSubprovider, PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { inject } from '@loopback/context';
import { EventListenerContract } from '@ohdex/contracts/lib//build/wrappers/event_listener';
import { zxWeb3Connected } from '@ohdex/shared';
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { ethers } from 'ethers';
import { Repository } from "typeorm";
import { fromWei, toWei } from 'web3-utils';
import { addRevertTraces } from "../../../test/helper";
import { Chain } from "../../db/entity/chain";
import { ChainEvent } from "../../db/entity/chain_event";
import { InterchainStateUpdate } from "../../db/entity/interchain_state_update";
import { ChainStateLeaf, CrosschainState } from "../../interchain/crosschain_state";
import { getCurrentBlocktime } from "../../interchain/helpers";
import { CrosschainStateService } from "../../interchain/xchain_state_service";
import { hexify, shortToLongBridgeId } from "../../utils";
import { ChainTracker } from "../tracker";
import { BridgeAdapter, TokensBridgedEvent } from "./bridge";
import { EventEmitterAdapter } from "./event_emitter";
import { EventListenerAdapter } from "./event_listener";
import { EthereumStateGadget, EthereumStateLeaf } from "./state_gadget";
const AbiCoder = require('web3-eth-abi').AbiCoder();

const locks = require('locks');


const Queue = require('queue')

type CrosschainEventTypes = TokensBridgedEvent;

export interface CrosschainEvent<CrosschainEventTypes> {
    data: CrosschainEventTypes;
    
    // Might be different in future.
    from: {
        chainId: number;
    }
    to: {
        targetBridge: string;
    }
}

export class EthereumChainTracker extends ChainTracker {
    conf: any;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;
    ethersProvider: ethers.providers.Provider;

    eventEmitter: EventEmitterAdapter;
    eventListener: EventListenerAdapter;
    bridge: BridgeAdapter;


    pendingCrosschainEvs: CrosschainEvent<any>[] = [];

    
    account: string;
    stateGadget: EthereumStateGadget;

    txQueue = Queue({
        autostart: true,
        concurrency: 1
    })

    @inject('repositories.Chain') chain: Repository<Chain>
    @inject('repositories.ChainEvent') chainEvent: Repository<ChainEvent>
    @inject('repositories.InterchainStateUpdate') stateUpdate: Repository<InterchainStateUpdate>
    @inject('interchain.CrosschainStateService') crosschainStateService: CrosschainStateService;
    
    constructor(
        conf: any
    ) {
        super(`Ethereum (chainId=${conf.chainId})`);
        this.conf = conf;
    }

    async start() {
        this.logger.info(`Connecting to ${this.conf.rpcUrl}`)

        await this.chain.createQueryBuilder()
        .insert()
        .values({
            chainId: this.conf.chainId
        })
        .onConflict(`("chainId") DO NOTHING`)
        .execute();

        let relayerAccount = require("@ohdex/config").accounts.relayer;
    
        this.pe = new Web3ProviderEngine();
        this.pe.addProvider(new NonceTrackerSubprovider())
        let key = new PrivateKeyWalletSubprovider(relayerAccount.privateKey);
        let accounts = await key.getAccountsAsync()
        let account = accounts[0];
        this.account = account;
        this.pe.addProvider(key)
        this.pe.addProvider(new RPCSubprovider(this.conf.rpcUrl));
        // addRevertTraces(this.pe, account)
        this.pe.start()

        this.pe.on('error', () => {
            this.logger.error(`Can't connect to endpoint`)
        })

        const CONNECT_TIMEOUT = 1000;
        
        try {
            await zxWeb3Connected(this.pe, CONNECT_TIMEOUT);
        } catch(ex) {
            this.logger.error(`couldn't connect - `, ex)
            throw ex;
        }


        this.web3Wrapper = new Web3Wrapper(this.pe, {
            from: this.account
        });
        // let accounts = await this.web3Wrapper.getAvailableAddressesAsync();


        // do some hacky stuff
        if(process.env.NODE_ENV === 'development') {
            // addRevertTraces(this.pe, account);
        }


        // check the available balance
        let balance = await this.web3Wrapper.getBalanceInWeiAsync(account)
        this.logger.info(`Using account ${account} (${fromWei(balance.toString(), 'ether')} ETH)`)

        if(balance.isLessThan(toWei('1', 'ether'))) {
            try {
                throw new Error(`Balance may be insufficent`)
            } catch(ex) {
                this.logger.warn(""+ex)
                // throw ex;
                // It will fail anyways below. This is to support Ganache, where tx's are free.
            }
        }
        
        
        let ethersProvider = new ethers.providers.JsonRpcProvider(this.conf.rpcUrl);
        
        
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 200;
        await new Promise((res, rej) => {
            ethersProvider.on('block', res);
            // ethersProvider.getBlockNumber().then(res)

            setTimeout(
                _ => {
                    rej(new Error(`Ethers.js couldn't connect after ${CONNECT_TIMEOUT}ms`))
                }, 
                CONNECT_TIMEOUT
            )
        })
        this.ethersProvider = ethersProvider;
        
        
        let blockNum = await ethersProvider.getBlockNumber()

        if(!this.conf.eventListenerAddress) {
            this.logger.error("Not deployed");
            throw new Error("Not deployed");
        }

        let txDefaults = { from: this.account }

        this.eventEmitter = new EventEmitterAdapter(
            this.ethersProvider,
            this.logger,
            this.conf.eventEmitterAddress
        )

        this.eventListener = new EventListenerAdapter(
            this.ethersProvider,
            this.logger,
            this.conf.eventListenerAddress,
            this.pe,
            txDefaults
        )

        this.bridge = new BridgeAdapter(
            this.ethersProvider,
            this.logger,
            this.conf.bridgeAddress,
            this.pe,
            txDefaults,
            this.web3Wrapper,
        )

        this.stateGadget = new EthereumStateGadget(`${this.conf.chainId}-${this.conf.eventListenerAddress}`)


        await this.loadStateAndEvents()

        this.logger.info(`Sync'd to block #${blockNum}, ${this.stateGadget.events.length} events`)
        this.logger.info(``)
        
        let update = await InterchainStateUpdate.getLatestStaterootAtTime(this.conf.chainId, getCurrentBlocktime())
        this.logger.info(`stateRoot = ${update.stateRoot}`)
        this.logger.info(`eventsRoot = ${update.eventRoot}`)

        
        
        this.logger.info("Bridges:")
        this.logger.info(`\t${this.bridge.bridgeContract.address}`)

        return;
    }
    
    private async loadStateAndEvents() {
        let previousEvents = await this.eventEmitter.loadPreviousEvents()
        for(let ev of previousEvents) {
            await this.chainEvent.insert({
                ...ev,
                chain: this.conf.chainId
            })
        }

        let previousUpdates = await this.eventListener.loadPreviousStateRootUpdates()
        for(let update of previousUpdates) {
            console.log(update)
            await this.stateUpdate.insert({
                ...update,
                chain: this.conf.chainId
            })
        }

        this.logger.info(`pastEvents=${previousEvents.length} pastStateUpdates=${previousUpdates.length}`)

        // TODO 
        // this.bridge.loadPreviousBridgeEvents()
    }

    listen() {
        this.logger.info(`listening to events on ${this.conf.eventEmitterAddress}`)

        this.eventEmitter.events.on('eventEmitted', async (event) => {
            await this.chainEvent.insert({
                ...event,
                chain: this.conf.chainId,
            })

            this.events.emit('eventEmitted', event)
        })

        this.eventListener.events.on('stateRootUpdated', async (update) => {
            await this.stateUpdate.insert({ 
                ...update,
                chain: this.conf.chainId
            })

            // Also try process acknowledged events
            await this.processBridgeEvents(null)
            // await wait(1500)
        
            // for(let chain of Object.values(this.chains)) {
            //     try {
            //         await chain.processBridgeEvents(null)
            //     } catch(ex) {
            //         throw ex;
            //     }
            // }
        })

        this.bridge.events.on('tokensBridged', async (tokensBridgedEv: TokensBridgedEvent) => {
            let crosschainEvent: CrosschainEvent<any> = {
                data: tokensBridgedEv,
                from: {
                    chainId: this.conf.chainId,
                },
                to: {
                    targetBridge: shortToLongBridgeId(tokensBridgedEv.targetBridge)
                }
            }

            this.events.emit('crosschainEvent', crosschainEvent)
        })

        this.eventEmitter.listen()
        this.eventListener.listen()
        this.bridge.listen()

        let self = this;

        this.txQueue.start(function (err) {
            if (err) {
                this.logger.error(err);
            }
        })

        this.txQueue.on('error', err => {
            this.logger.error(err);
            throw err;
        })
    }

    async updateStateRoot(
        proof2: MerkleTreeProof, leaf2: ChainStateLeaf
    ): Promise<any> 
    {
        try {
            // compute the state root first
            let stateRootUpdate = await this.crosschainStateService.computeUpdatedStateRoot(this.conf.chainId);
            this.logger.info(`computeUpdatedStateRoot: ${stateRootUpdate.root}`)

            this.txQueue.push(async _ => {
                await this.web3Wrapper.awaitTransactionSuccessAsync(
                    await this.eventListener.updateStateRoot(stateRootUpdate)
                );
            })
        } catch(err) {
            this.logger.error(err)
            throw err;
        }
    }

    processBridgeEvents_mutex = locks.createMutex();

    async processBridgeEvents(
        _: CrosschainState
    ) {
        await new Promise((res,rej) => this.processBridgeEvents_mutex.lock(res))


        // process all events
        try {
            // Now process any events on this bridge for the user
            for(let ev of this.pendingCrosschainEvs) {
                let proof = await this.crosschainStateService.proveEvent(
                    this.conf.chainId, 
                    ev.from.chainId, 
                    ev.data.eventHash
                )
                
                this.txQueue.push(async _ => {
                    await this.bridge.bridge(ev, proof)
                    this.pendingCrosschainEvs.shift()
                })
            }
            
        } catch(ex) {
            this.logger.error(`processBridgeEvents failed`)
            this.logger.error(ex)
            this.processBridgeEvents_mutex.unlock()
            throw ex;
        } finally {
            this.processBridgeEvents_mutex.unlock()
        }
    }
    
    get bridgeIds(): string[] {
        return [
            shortToLongBridgeId(this.bridge.bridgeContract.address)
        ]
    }

    // Listen for the original events from other chains
    // and add them to our pending queue here
    async receiveCrosschainEvent(ev: CrosschainEvent<any>): Promise<boolean> {
        this.logger.debug(JSON.stringify(ev))

        if(ev.from == this.conf.chainId) {
            this.logger.warn('receiveCrosschainMessage: ignoring event from own chain')
            return;
        }

        if(this.bridgeIds.includes(ev.to.targetBridge))
        {
            this.logger.info(`receiveCrosschainMessage fromChain=${ev.from.chainId} eventHash=${ev.data.eventHash}`)
            this.pendingCrosschainEvs.push(ev)
            return true;
        }

        return false;
    }

    async stop() {
        this.pe.stop();
        this.ethersProvider = null;
        await this.eventEmitter.stop()
        await this.eventListener.stop()
        await this.bridge.stop()
    }
}


// export class EventListenerWrapper {
//     static updateStateRoot(eventListener: EventListenerContract, proof: MerkleTreeProof, leaf: EthereumStateLeaf) {
//         return eventListener.updateStateRoot.sendTransactionAsync(
//             proof.proofs.map(hexify),
//             proof.paths,
//             hexify(proof.root),
//             hexify(leaf.eventsRoot)
//         )
//     }
// }

