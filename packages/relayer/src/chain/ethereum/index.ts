import { RPCSubprovider, Web3ProviderEngine } from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { EventListenerContract, EventListenerEvents } from '@ohdex/contracts/lib//build/wrappers/event_listener';
import { BridgeContract, BridgeEvents } from '@ohdex/contracts/lib/build/wrappers/bridge';
import { EscrowContract, EscrowEvents } from '@ohdex/contracts/lib/build/wrappers/escrow';
import { EventEmitterEvents } from '@ohdex/contracts/lib/build/wrappers/event_emitter';
import { ITokenBridgeEventArgs } from '@ohdex/contracts/lib/build/wrappers/i_token_bridge';
import { zxWeb3Connected } from '@ohdex/shared';
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { ethers } from 'ethers';
import { fromWei, toWei } from 'web3-utils';
import { ChainStateLeaf, CrosschainState } from "../../interchain";
import { dehexify, hexify, shortToLongBridgeId } from "../../utils";
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "../tracker";
import { EthereumStateGadget, EthereumStateLeaf } from "./state";
const AbiCoder = require('web3-eth-abi').AbiCoder();


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


    bridgeContract: BridgeContract;
    bridgeContract_sub: ethers.Contract;
    escrowContract: EscrowContract;
    escrowContract_sub: ethers.Contract;
    pendingTokenBridgingEvs: MessageSentEvent[] = [];

    
    account: string;


    state: EthereumStateGadget;

    constructor(conf: any) {
        super(`Ethereum (chainId=${conf.chainId})`);
        this.conf = conf;
    }

    async start() {
        this.logger.info(`Connecting to ${this.conf.rpcUrl}`)

        this.pe = new Web3ProviderEngine();
        this.pe.addProvider(new PrivateKeyWalletSubprovider("13d14e5f958796529e84827f6a62d8e19375019f8cf0110484bcef39c023edcc"));
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
        ethersProvider.pollingInterval = 1000;
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

        this.state = new EthereumStateGadget(`${this.conf.chainId}-${this.eventListener.address}`)

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
        this.escrowContract = new EscrowContract(
            require('@ohdex/contracts/build/artifacts/Escrow.json').compilerOutput.abi,
            this.conf.escrowAddress,
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

        this.logger.info(`Sync'd to block #${blockNum}, ${this.state.events.length} pending events`)
        this.logger.info(`stateRoot = ${this.interchainStateRoot.toString('hex')}`)
        this.logger.info(`eventsRoot = ${this.state.root.toString('hex')}`)

        
        
        this.logger.info("Bridges:")
        this.logger.info(`\t${this.bridgeContract.address}`)
        this.logger.info(`\t${this.escrowContract.address}`)


        return;
    }
    
    private async loadStateAndEvents() {
        // 1. Load chain's state root
        // 
        let interchainStateRoot = dehexify(
            (await this.eventListener.interchainStateRoot.callAsync())
        )

        
        // 2. Load all previously emitted events (including those that may not be ack'd on other chains yet)
        // 
        const EventEmitted = this.eventEmitter_sub.filters.EventEmitted(null);
        const logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.eventEmitter_sub.address,
            topics: EventEmitted.topics
        });
        console.log(logs)

        for (const log of logs) {
            let eventHash = log.data;
            this.state.addEvent(eventHash)
        }

        this.interchainStateRoot = interchainStateRoot;
        
        // Ack any pending events
        if(this.state.events.length) {
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
                        fromChain: this.state.getId(),
                        data,
                        toBridge: data.targetBridge,
                        eventHash: data.eventHash
                    };
                    this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);

                    // this.onTokensBridgedEvent.call(this, decoded.push(fakeEthersEvent))
                }

            }

            await getPreviousBridgeEvents(this.bridgeContract_sub)
            await getPreviousBridgeEvents(this.escrowContract_sub)
            // TODO

            // let eventEmittedEvent: EventEmittedEvent = {
            //     eventHash: '',
            //     newChainRoot: '',
            //     newChainIndex: ''
            // }
            // this.events.emit('EventEmitter.EventEmitted', eventEmittedEvent);
        }
        
    }

    listen() {
        this.logger.info(`listening to events on ${this.conf.eventEmitterAddress}`)

        // 1) Listen to any events emitted from this chain
        this.eventEmitter_sub.on(EventEmitterEvents.EventEmitted, this.onEventEmitted.bind(this))

        // 2) Listen to any state root updates that happen
        this.eventListener_sub.on(EventListenerEvents.StateRootUpdated, this.onStateRootUpdated.bind(this))

        // 3) Listen to the original events of the bridge/escrow contracts
        // So we can relay them later
        this.bridgeContract_sub.on(BridgeEvents.TokensBridged, this.onTokensBridgedEvent.bind(this))
        this.escrowContract_sub.on(EscrowEvents.TokensBridged, this.onTokensBridgedEvent.bind(this)) 
    }

    private async onStateRootUpdated(root: string, ev: ethers.Event) {
        this.events.emit('StateRootUpdated');
        this.logger.info(`state root updated - ${root}`)
        this.interchainStateRoot = dehexify(root);
    }

    async processBridgeEvents(
        crosschainState: CrosschainState
    ) {
        // process all events
        try {
            // Now process any events on this bridge for the user
            for(let ev of this.pendingTokenBridgingEvs) {
                let { rootProof, eventProof} = crosschainState.proveEvent(ev.fromChain, ev.eventHash)
                let _proof = rootProof.proofs.map(hexify)
                let _proofPaths = rootProof.paths
                let _interchainStateRoot = hexify(rootProof.root)
                let _eventsProof = eventProof.proofs.map(hexify)
                let _eventsPaths = eventProof.paths
                let _eventsRoot = hexify(eventProof.root)


                // if(ev.toBridge == await this.escrowContract.tokenBridgeId.callAsync()) {
                if(ev.toBridge == shortToLongBridgeId(this.escrowContract.address)) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.escrowContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data.chainId, 
                            ev.data._salt, 
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
                    this.pendingTokenBridgingEvs.pop()
                }
                else if(ev.toBridge == shortToLongBridgeId(this.bridgeContract.address)) {
                // else if(ev.toBridge == await this.bridgeContract.tokenBridgeId.callAsync()) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.bridgeContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data.chainId, 
                            ev.data._salt, 
                            _proof, 
                            _proofPaths, 
                            _interchainStateRoot, 
                            _eventsProof, 
                            _eventsPaths, 
                            _eventsRoot,
                            ev.eventHash,
                            { from: this.account }
                        )
                    );
                    this.logger.info(`bridged ev: ${ev.eventHash} for bridge ${ev.toBridge}`)
                    this.pendingTokenBridgingEvs.pop()
                } else {
                    this.logger.error(`couldn't find bridge ${ev.toBridge} for event ${ev.eventHash}`)
                }
            }
        } catch(ex) {
            this.logger.error(`failed to do bridging`)
            this.logger.error(ex)
        }
    }

    private async onEventEmitted(eventHash: string, ev: ethers.Event) {
        this.logger.info(`block #${ev.blockNumber}, event emitted - ${eventHash}`)
        this.state.addEvent(eventHash)

        let eventEmittedEvent: EventEmittedEvent = { 
            eventHash,
            newChainRoot: ev.blockHash,
            newChainIndex: ''+ev.blockNumber
        }
        this.events.emit('EventEmitter.EventEmitted', eventEmittedEvent);
    }

    private onTokensBridgedEvent() {
        let args = Array.from(arguments)
        let ev = Array.from(arguments).pop() as ethers.Event;
        
        let [ eventHash, targetBridge, chainId, receiver, token, amount, _salt ] = args;
        let data: ITokenBridgeEventArgs = {
            eventHash, targetBridge, chainId, receiver, token, amount, _salt
        }

        let tokensBridgedEv: MessageSentEvent = {
            data,
            fromChain: this.state.getId(),
            toBridge: shortToLongBridgeId(data.targetBridge),
            eventHash
        };
        this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);
    }
    
    get bridgeIds(): string[] {
        return [
            shortToLongBridgeId(this.escrowContract.address),
            shortToLongBridgeId(this.bridgeContract.address)
        ]
    }

    // Listen for the original events from other chains
    // and add them to our pending queue here
    async receiveCrosschainMessage(tokensBridgedEv: MessageSentEvent): Promise<boolean> {
        this.logger.debug(JSON.stringify(tokensBridgedEv))

        if(this.bridgeIds.includes(tokensBridgedEv.toBridge))
        {
            this.logger.info(`Received ${tokensBridgedEv.eventHash} from chain ${tokensBridgedEv.fromChain}`)
            this.pendingTokenBridgingEvs.push(tokensBridgedEv)
            return true;
        }

        return false;
    }
    

    async updateStateRoot(
        proof: MerkleTreeProof, leaf: ChainStateLeaf
    ): Promise<any> 
    {
        try {
            await EventListenerWrapper.updateStateRoot(this.eventListener, proof, leaf as EthereumStateLeaf)
        } catch(err) {
            // console.log(ex)
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
    }
}


class EventListenerWrapper {
    static updateStateRoot(eventListener: EventListenerContract, proof: MerkleTreeProof, leaf: EthereumStateLeaf) {
        return eventListener.updateStateRoot.sendTransactionAsync(
            proof.proofs.map(hexify),
            proof.paths,
            hexify(proof.root),
            hexify(leaf.eventsRoot)
        )
    }
}

