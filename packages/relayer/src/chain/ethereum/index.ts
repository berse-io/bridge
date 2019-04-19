import { RPCSubprovider, Web3ProviderEngine } from "0x.js";
import { NonceTrackerSubprovider, PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { inject } from '@loopback/context';
import { EventListenerContract } from '@ohdex/contracts/lib//build/wrappers/event_listener';
import { zxWeb3Connected, wait } from '@ohdex/shared';
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { ethers } from 'ethers';
import { Repository } from "typeorm";
import { fromWei, toWei } from 'web3-utils';
import { addRevertTraces } from "../../../test/helper";
import { Chain } from "../../db/entity/chain";
import { ChainEvent } from "../../db/entity/chain_event";
import { InterchainStateUpdate } from "../../db/entity/interchain_state_update";
import { getCurrentBlocktime } from "../../interchain/helpers";
import { CrosschainStateService } from "../../interchain/xchain_state_service";
import { hexify, normaliseAddress } from "../../utils";
import { ChainTracker } from "../tracker";
import { BridgeAdapter, TokensBridgedEvent } from "./bridge";
import { EventEmitterAdapter } from "./event_emitter";
import { EventListenerAdapter, StateRootUpdated } from "./event_listener";
import { Snapshot } from "../../db/entity/snapshot";
const AbiCoder = require('web3-eth-abi').AbiCoder();

const locks = require('locks');


const Queue = require('queue')

type CrosschainEventTypes = TokensBridgedEvent;

export interface CrosschainEvent<CrosschainEventTypes> {
    data: CrosschainEventTypes;
    
    eventHash: string;

    // Might be different in future.
    from: {
        chainId: number;
        bridge: string;
    }
    to: {
        chainId: number;
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

    txQueue = Queue({
        autostart: true,
        concurrency: 1
    })

    @inject('repositories.Chain') chain: Repository<Chain>
    @inject('repositories.ChainEvent') chainEvent: Repository<ChainEvent>
    @inject('repositories.InterchainStateUpdate') stateUpdate: Repository<InterchainStateUpdate>
    @inject('repositories.Snapshot') snapshots: Repository<Snapshot>
    @inject('interchain.CrosschainStateService') crosschainStateService: CrosschainStateService;
    @inject('logging.default') logger2: any;
    
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
            txDefaults,
            this.web3Wrapper
        )

        this.bridge = new BridgeAdapter(
            this.ethersProvider,
            this.logger,
            this.conf.bridgeAddress,
            this.pe,
            txDefaults,
            this.web3Wrapper,
        )


        await this.loadStateAndEvents()

        this.logger.info(`Sync'd to block #${blockNum}`)
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

            this.logger2.info('debug', event)

            this.events.emit('eventEmitted', event)
        })

        this.eventListener.events.on('stateRootUpdated', async (update: StateRootUpdated) => {
            let stateUpdate = { 
                ...update,
                chain: this.conf.chainId
            }
            await this.stateUpdate.insert(stateUpdate)


            // Also link the state root update with the 
            // snapshot we inserted
            let snapshot = await this.snapshots.findOne({
                chain: this.conf.chainId,
                stateRoot: normaliseAddress(update.stateRoot)
            })
            if(!snapshot) {
                throw new Error("Couldn't find snapshot for corresponding state root update. UNEXPECTED!")
            }
            if(snapshot.update) {
                throw new Error("Snapshot already linked to update, which indicates race conditions. UNEXPECTED!")
            }
            
            let stateUpdate_inserted = await this.stateUpdate.findOne({
                chain: this.conf.chainId,
                stateRoot: update.stateRoot,
                blockHash: update.blockHash,
                eventRoot: update.eventRoot
            })
            if(!stateUpdate_inserted) {
                throw new Error("State update should have been inserted, UNEXPECTED!")
            }

            snapshot.update = stateUpdate_inserted
            await snapshot.save()



            this.logger2.info('debug', update)

            // Also try process acknowledged events
            // await wait(1500)
            await this.processBridgeEvents()
        
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
                eventHash: tokensBridgedEv.eventHash,
                from: {
                    chainId: this.conf.chainId,
                    bridge: normaliseAddress(this.bridge.bridgeContract.address)
                },
                to: {
                    // TODO(liamz): hazardous converting from bignum to number...
                    chainId: tokensBridgedEv.targetChainId.toNumber(),
                    targetBridge: normaliseAddress(tokensBridgedEv.targetBridge)
                }
            }

            this.logger2.info('debug', crosschainEvent)

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

    async updateStateRoot(): Promise<any> 
    {
        try {
            let eventsCount = await this.chainEvent.count({ chain: this.conf.chainId })

            // compute the state root first
            let stateRootUpdate = await this.crosschainStateService.proveStateRootUpdate(this.conf.chainId);
            
            this.logger.info(`computeUpdatedStateRoot: root=${stateRootUpdate.root} eventRoot=${stateRootUpdate.eventRoot} ackdEvent=${eventsCount - 1}`)

            this.txQueue.push(async _ => {
                try {
                    await this.eventListener.updateStateRoot(stateRootUpdate)
                } catch(ex) {
                    // we can't get revert messages back
                    // but we can try ascertain if the error was due to something we can understand
                    
                    // we can just count the number of events
                    let eventsCountNow = await this.chainEvent.count({ chain: this.conf.chainId })
                    this.logger.info(eventsCount, eventsCountNow)
                    if(eventsCountNow > eventsCount) {
                        this.logger.info(`State root update failed, newer events emitted`)
                        this.logger.info(`ChainEvent.count BEFORE=${eventsCount} NOW=${eventsCountNow}`)
                    } else {
                        throw ex;
                    }
                    
                }
            })
        } catch(err) {
            this.logger.error(err)
            throw err;
        }
    }

    processBridgeEvents_mutex = locks.createMutex();

    async processBridgeEvents() {
        await new Promise((res,rej) => this.processBridgeEvents_mutex.lock(res))


        // process all events
        try {
            // Now process any events on this bridge for the user
            for(let ev of this.pendingCrosschainEvs) {
                this.logger.info(`Proving event ${ev.data.eventHash} for bridging`)
                let proof = await this.crosschainStateService.proveEvent(
                    this.conf.chainId, 
                    ev.from.chainId, 
                    ev.eventHash
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
            normaliseAddress(this.bridge.bridgeContract.address)
        ]
    }

    // Listen for the original events from other chains
    // and add them to our pending queue here
    async receiveCrosschainEvent(ev: CrosschainEvent<any>): Promise<boolean> {
        // this.logger.debug(JSON.stringify(ev))

        if(ev.from.chainId == this.conf.chainId) {
            // this.logger.warn('receiveCrosschainMessage: ignoring event from own chain')
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
