import { RPCSubprovider, Web3ProviderEngine, BigNumber } from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { EventListenerContract, EventListenerEvents } from '@ohdex/contracts/lib//build/wrappers/event_listener';
import { BridgeContract, BridgeEvents } from '@ohdex/contracts/lib/build/wrappers/bridge';
import { EventEmitterEvents } from '@ohdex/contracts/lib/build/wrappers/event_emitter';
import { ITokenBridgeEventArgs } from '@ohdex/contracts/lib/build/wrappers/i_token_bridge';
import { zxWeb3Connected } from '@ohdex/shared';
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { ethers } from 'ethers';
import { fromWei, toWei } from 'web3-utils';
import { ChainStateLeaf, CrosschainState } from "../../interchain/crosschain_state";
import { dehexify, hexify, shortToLongBridgeId } from "../../utils";
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "../tracker";
import { EthereumStateGadget, EthereumStateLeaf } from "./state_gadget";
import { Repository } from "typeorm";
import { Chain } from "../../db/entity/chain";
import { ChainEvent } from "../../db/entity/chain_event";
import { InterchainStateUpdate } from "../../db/entity/interchain_state_update";
const AbiCoder = require('web3-eth-abi').AbiCoder();

import { inject } from '@loopback/context'
import { CrosschainStateService } from "../../interchain/xchain_state_service";
import { getCurrentBlocktime } from "../../interchain/helpers";
const locks = require('locks');


export class EthereumChainTracker extends ChainTracker {
    conf: any;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;
    ethersProvider: ethers.providers.Provider;

    eventEmitter_web3: any;
    eventEmitter_sub: ethers.Contract;

    eventListener: EventListenerContract;
    eventListener_sub: ethers.Contract;
    interchainStateRoot: Buffer;
    lastUpdated: Buffer;


    bridgeContract: BridgeContract;
    bridgeContract_sub: ethers.Contract;
    escrowContract_sub: ethers.Contract;
    pendingTokenBridgingEvs: MessageSentEvent[] = [];

    
    account: string;

    stateGadget: EthereumStateGadget;

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

        this.pe = new Web3ProviderEngine();
        // if(process.env.NODE_ENV !== 'test') {
        // }
        // this.pe.addProvider(new PrivateKeyWalletSubprovider("13d14e5f958796529e84827f6a62d8e19375019f8cf0110484bcef39c023edcc"));
        this.pe.addProvider(new RPCSubprovider(this.conf.rpcUrl));
        this.pe.start()

        this.pe.on('error', () => {
            this.logger.error(`Can't connect to endpoint`)
        })

        const CONNECT_TIMEOUT = 7000;
        
        try {
            await zxWeb3Connected(this.pe, CONNECT_TIMEOUT);
        } catch(ex) {
            this.logger.error(`couldn't connect - `, ex)
            throw ex;
        }

        this.web3Wrapper = new Web3Wrapper(this.pe);
        let accounts = await this.web3Wrapper.getAvailableAddressesAsync();
        let account = accounts[0];
        this.account = account;

        // check the available balance
        let balance = await this.web3Wrapper.getBalanceInWeiAsync(account)
        this.logger.info(`Using account ${account} (${fromWei(balance.toString(), 'ether')} ETH)`)

        if(balance.lessThan(toWei('1', 'ether'))) {
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

        this.eventListener = new EventListenerContract(
            require('@ohdex/contracts/build/artifacts/EventListener.json').compilerOutput.abi,
            this.conf.eventListenerAddress,
            this.pe,
            { from: this.account }
        );
        this.eventListener_sub = new ethers.Contract(
            this.conf.eventListenerAddress,
            require('@ohdex/contracts/build/artifacts/EventListener.json').compilerOutput.abi,
            this.ethersProvider
        )

        this.stateGadget = new EthereumStateGadget(`${this.conf.chainId}-${this.eventListener.address}`)

        this.eventEmitter_sub = new ethers.Contract(
            this.conf.eventEmitterAddress,
            require('@ohdex/contracts/build/artifacts/EventEmitter.json').compilerOutput.abi,
            this.ethersProvider
        )


        this.bridgeContract = new BridgeContract(
            require('@ohdex/contracts/build/artifacts/Bridge.json').compilerOutput.abi,
            this.conf.bridgeAddress,
            this.pe,
            { from: account }
        )

        this.bridgeContract_sub = new ethers.Contract(
            this.conf.bridgeAddress,
            require('@ohdex/contracts/build/artifacts/Bridge.json').compilerOutput.abi,
            this.ethersProvider
        )
        this.escrowContract_sub = new ethers.Contract(
            this.conf.escrowAddress,
            require('@ohdex/contracts/build/artifacts/Escrow.json').compilerOutput.abi,
            this.ethersProvider
        )


        await this.loadStateAndEvents()

        this.logger.info(`Sync'd to block #${blockNum}, ${this.stateGadget.events.length} events`)
        this.logger.info(``)
        
        let update = await InterchainStateUpdate.getLatestStaterootAtTime(this.conf.chainId, getCurrentBlocktime())
        this.logger.info(`stateRoot = ${update.stateRoot}`)
        this.logger.info(`eventsRoot = ${update.eventRoot}`)

        
        
        this.logger.info("Bridges:")
        this.logger.info(`\t${this.bridgeContract.address}`)

        return;
    }
    
    private async loadStateAndEvents() {
        // 1. Load chain's state root
        // 
        const StateRootUpdated = this.eventListener_sub.filters.StateRootUpdated();
        const StateRootUpdated_logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.eventListener_sub.address,
            topics: StateRootUpdated.topics
        });

        for (const log of StateRootUpdated_logs) {
            let blockTime = (await this.ethersProvider.getBlock(log.blockHash)).timestamp
            // let stateRoot = log.data;
            
            let { root: stateRoot, eventRoot } = this.eventListener_sub.interface.events.StateRootUpdated.decode(log.data, log.topics)

            // let eventHash = log.data;
            // this.stateGadget.addEvent(eventHash)
            await this.stateUpdate.insert({
                blockHash: log.blockHash,
                blockTime,
                stateRoot,
                eventRoot,
                chain: this.conf.chainId
            })

            this.interchainStateRoot = dehexify(stateRoot);
            
        }




        this.lastUpdated = dehexify(await this.eventListener.lastUpdated.callAsync())

        // 2. Load all previously emitted events (including those that may not be ack'd on other chains yet)
        // 
        const EventEmitted = this.eventEmitter_sub.filters.EventEmitted(null);
        const EventEmitted_logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.eventEmitter_sub.address,
            topics: EventEmitted.topics
        });

        for (const log of EventEmitted_logs) {
            let eventHash = log.data;
            // this.stateGadget.addEvent(eventHash)
            
            await this.chainEvent.insert({
                blockTime: (await this.ethersProvider.getBlock(log.blockHash)).timestamp,
                chain: this.conf.chainId,
                eventHash
            })
        }



        this.logger.info(`pastEvents=${EventEmitted_logs.length} pastStateUpdates=${StateRootUpdated_logs.length}`)
        
        // Ack any pending events
        if(this.stateGadget.events.length) {
            // then get all the previous token bridge events
            const getPreviousBridgeEvents = async (contract_sub) => {
                const TokensBridged = contract_sub.filters.TokensBridged();
                const logs = await this.ethersProvider.getLogs({
                    fromBlock: 0,
                    toBlock: "latest",
                    address: contract_sub.address,
                    topics: TokensBridged.topics
                });
        
                for (const log of logs) {
                    let decoded = contract_sub.interface.events.TokensBridged.decode(log.data, log.topics)
                    
                    // let data: ITokenBridgeEventArgs = {
                    //     eventHash, targetBridge, chainId, receiver, token, amount, _salt
                    // }
                    let data = decoded;
            
                    let tokensBridgedEv: MessageSentEvent = {
                        fromChain: this.stateGadget.getId(),
                        fromChainId: this.conf.chainId,
                        data,
                        toBridge: data.targetBridge,
                        eventHash: data.eventHash
                    };
                    this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);
                }

            }

            await getPreviousBridgeEvents(this.bridgeContract_sub)
            await getPreviousBridgeEvents(this.escrowContract_sub)
        }
        
    }

    listen() {
        this.logger.info(`listening to events on ${this.conf.eventEmitterAddress}`)

        let self = this;

        // 1) Listen to any events emitted from this chain
        this.eventEmitter_sub.on(EventEmitterEvents.EventEmitted, function() {
            self.onEventEmitted.apply(self, arguments)
        })

        // 2) Listen to any state root updates that happen
        this.eventListener_sub.on(EventListenerEvents.StateRootUpdated, this.onStateRootUpdated.bind(this))

        // 3) Listen to the original events of the bridge/escrow contracts
        // So we can relay them later
        this.bridgeContract_sub.on(BridgeEvents.TokensBridged, function() {
            self.onTokensBridgedEvent.apply(self, arguments)
        })
    }

    processBridgeEvents_mutex = locks.createMutex();

    async processBridgeEvents(
        _: CrosschainState
    ) {
        await new Promise((res,rej) => this.processBridgeEvents_mutex.lock(res))

        // process all events
        try {
            // Now process any events on this bridge for the user
            
            for(let ev of this.pendingTokenBridgingEvs) {
                let { rootProof, eventProof } = await this.crosschainStateService.proveEvent(
                    this.conf.chainId, 
                    ev.fromChainId, 
                    ev.eventHash
                )
                let _proof = rootProof.proofs.map(hexify)
                let _proofPaths = rootProof.paths
                let _interchainStateRoot = hexify(rootProof.root)
                let _eventsProof = eventProof.proofs.map(hexify)
                let _eventsPaths = eventProof.paths
                let _eventsRoot = hexify(eventProof.root)

                let originChainId = ev.fromChainId;
                if(ev.toBridge == shortToLongBridgeId(this.bridgeContract.address)) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.bridgeContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data._salt, 
                            ev.data.triggerAddress,
                            new BigNumber(originChainId),
                            false, //need to fix this for bridging back
                            _proof, 
                            _proofPaths, 
                            _interchainStateRoot, 
                            _eventsProof, 
                            _eventsPaths, 
                            _eventsRoot,
                            { from: this.account }
                        )
                    );
                    this.logger.info(`bridged ev: ${ev.eventHash} for bridge ${ev.toBridge}`)
                    this.pendingTokenBridgingEvs.shift()
                } else {
                    this.logger.error(`couldn't find bridge ${ev.toBridge} for event ${ev.eventHash}`)
                }
            }
        } catch(ex) {
            this.logger.error(`processBridgeEvents failed`)
            this.logger.error(ex)
            this.processBridgeEvents_mutex.unlock()
            throw ex;
        }
        this.processBridgeEvents_mutex.unlock()
    }

    private async onStateRootUpdated(root: string, eventRoot: string, ev: ethers.Event) {
        this.logger.info(`StateRootUpdated root=${root}`)
        this.interchainStateRoot = dehexify(root);

        await this.stateUpdate.insert({
            blockHash: ev.blockHash,
            blockTime: (await ev.getBlock()).timestamp,
            stateRoot: root,
            eventRoot,
            chain: this.conf.chainId
        })
        this.events.emit('StateRootUpdated');
    }

    onEventEmitted = async (eventHash: string, ev: ethers.Event) => {
        this.logger.info(`EventEmitted, block=#${ev.blockNumber} eventHash=${eventHash}`)
        this.stateGadget.addEvent(eventHash);

        let eventEmittedEvent: EventEmittedEvent = { 
            eventHash,
            newChainRoot: ev.blockHash,
            newChainIndex: ''+ev.blockNumber
        }
        await this.chainEvent.insert({
            blockTime: (await ev.getBlock()).timestamp,
            chain: this.conf.chainId,
            eventHash
        })
        this.events.emit('EventEmitter.EventEmitted', eventEmittedEvent);
    }

    onTokensBridgedEvent = (eventHash, targetBridge, chainId, receiver, token, amount, _salt, ev: ethers.Event) => {
        let data: ITokenBridgeEventArgs = {
            eventHash, targetBridge, chainId, receiver, token, amount, _salt
        }
        data.triggerAddress = ev.address;
        // data.from = {
        //     chainId: this.conf.chainId,
        // }
        // data.to = {
        //     chainId: 
        // }

        let tokensBridgedEv: MessageSentEvent = {
            data,
            fromChain: this.stateGadget.getId(),
            fromChainId: this.conf.chainId,
            toBridge: shortToLongBridgeId(data.targetBridge),
            eventHash
        };
        this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);
    }
    
    get bridgeIds(): string[] {
        return [
            shortToLongBridgeId(this.bridgeContract.address)
        ]
    }

    // Listen for the original events from other chains
    // and add them to our pending queue here
    async receiveCrosschainMessage(tokensBridgedEv: MessageSentEvent): Promise<boolean> {
        this.logger.debug(JSON.stringify(tokensBridgedEv))

        if(tokensBridgedEv.fromChain == this.stateGadget.id) {
            this.logger.warn('receiveCrosschainMessage: ignoring event from own chain')
            return;
        }

        if(this.bridgeIds.includes(tokensBridgedEv.toBridge))
        {
            this.logger.info(`receiveCrosschainMessage fromChain=${tokensBridgedEv.fromChain} eventHash=${tokensBridgedEv.eventHash}`)
            this.pendingTokenBridgingEvs.push(tokensBridgedEv)
            return true;
        }

        return false;
    }
    

    async updateStateRoot(
        proof2: MerkleTreeProof, leaf2: ChainStateLeaf
    ): Promise<any> 
    {

        try {
            // compute the state root first
            let { proof, leaf } = await this.crosschainStateService.computeUpdatedStateRoot(this.conf.chainId);
            this.logger.info(`computeUpdatedStateRoot: ${hexify(proof.root)}`)

            await EventListenerWrapper.updateStateRoot(this.eventListener, proof, leaf as EthereumStateLeaf)
        } catch(err) {
            // console.log(err.data.stack)
            // if(err.code == -32000) {
            //     this.logger.error(err.data.stack)
            // }
            this.logger.error(err)
            throw err;
        }

        return;
    }

    async stop() {
        this.pe.stop();
        this.ethersProvider = null;
        await this.eventEmitter_sub.removeAllListeners(EventEmitterEvents.EventEmitted)
        await this.eventListener_sub.removeAllListeners(EventListenerEvents.StateRootUpdated)
        await this.bridgeContract_sub.removeAllListeners(BridgeEvents.TokensBridged)
    }
}


export class EventListenerWrapper {
    static updateStateRoot(eventListener: EventListenerContract, proof: MerkleTreeProof, leaf: EthereumStateLeaf) {
        return eventListener.updateStateRoot.sendTransactionAsync(
            proof.proofs.map(hexify),
            proof.paths,
            hexify(proof.root),
            hexify(leaf.eventsRoot)
        )
    }
}

