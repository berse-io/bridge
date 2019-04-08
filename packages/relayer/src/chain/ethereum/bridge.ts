import { BridgeContract, BridgeEvents } from "@ohdex/contracts/lib/build/wrappers/bridge";
import { ethers } from "ethers";
import { Web3ProviderEngine, BigNumber } from "0x.js";
import { EventEmitter } from "events";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { CrosschainEventProof } from "../../interchain/crosschain_state";
import { hexify } from "@ohdex/shared";
import { CrosschainEvent } from ".";

export interface TokensBridgedEvent {
    eventHash: string 
    targetBridge: string, 
    chainId: any
    receiver: string
    token: string
    amount: any
    salt: any
}

export class BridgeAdapter {
    bridgeContract: BridgeContract;
    bridgeContract_sub: ethers.Contract;
    events = new EventEmitter()

    constructor(
        private ethersProvider: ethers.providers.Provider,
        private logger: any,
        bridgeAddress: string,
        pe: Web3ProviderEngine,
        private txDefaults: any,
        private web3Wrapper: Web3Wrapper
    ) {
        this.bridgeContract = new BridgeContract(
            require('@ohdex/contracts/build/artifacts/Bridge.json').compilerOutput.abi,
            bridgeAddress,
            pe,
            txDefaults
        )

        this.bridgeContract_sub = new ethers.Contract(
            bridgeAddress,
            require('@ohdex/contracts/build/artifacts/Bridge.json').compilerOutput.abi,
            this.ethersProvider
        )
    }

    async loadPreviousBridgeEvents(): Promise<TokensBridgedEvent[]> {
        let previous = [];

        const TokensBridged = this.bridgeContract_sub.filters.TokensBridged();
        const logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.bridgeContract_sub.address,
            topics: TokensBridged.topics
        });

        for (const log of logs) {
            let decoded = this.bridgeContract_sub.interface.events.TokensBridged.decode(log.data, log.topics)
            
            let data = decoded;
    
            let tokensBridgedEv: TokensBridgedEvent = {
                // fromChain: this.stateGadget.getId(),
                // fromChainId: this.conf.chainId,
                ...data,
                // toBridge: data.targetBridge,
                // eventHash: data.eventHash
            };
            previous.push(tokensBridgedEv)
        }

        return previous;
    }

    listen() {
        let self = this;

        // 3) Listen to the original events of the bridge/escrow contracts
        // So we can relay them later
        this.bridgeContract_sub.on(
            BridgeEvents.TokensBridged, 
            async function(eventHash, targetBridge, chainId, receiver, token, amount, salt, ev: ethers.Event) {
                let tokensBridgedEv: TokensBridgedEvent = {
                    eventHash, targetBridge, chainId, receiver, token, amount, salt
                }
                self.events.emit('tokensBridged', tokensBridgedEv)
            }
        )
    }

    async stop() {
        await this.bridgeContract_sub.removeAllListeners(BridgeEvents.TokensBridged)
    }

    async bridge(
        ev: CrosschainEvent,
        proof: CrosschainEventProof
    ) {
        let { rootProof, eventProof } = proof;
        
        let _proof = rootProof.proofs.map(hexify)
        let _proofPaths = rootProof.paths
        let _interchainStateRoot = hexify(rootProof.root)
        let _eventsProof = eventProof.proofs.map(hexify)
        let _eventsPaths = eventProof.paths
        let _eventsRoot = hexify(eventProof.root)

        let originChainId = ev.from.chainId;

        let gas = await this.bridgeContract.claim.estimateGasAsync(
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
            _eventsRoot
        )
        this.logger.info(`Bridge.claim: estimateGas=${gas}`)

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
                { ...this.txDefaults, gas: 5000000 }
            )
        );
        this.logger.info(`bridged ev: ${ev.data.eventHash} for bridge ${ev.to}`)
    }
}