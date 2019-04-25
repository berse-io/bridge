import { 
    BridgeContract, 
    BridgeEvents,
    BridgeDepositEventArgs as DepositEvent,
    BridgeBridgedBurnEventArgs as BridgedBurnEvent
} from "@ohdex/contracts/lib/build/wrappers/bridge";
import { ethers } from "ethers";
import { Web3ProviderEngine, BigNumber } from "0x.js";
import { EventEmitter } from "events";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { hexify } from "@ohdex/shared";
import { CrosschainEvent } from ".";
import { EventProof } from "../../interchain/xchain_state_service";
import { PastEvents } from "./ethers_helper";

interface BridgeEvent {
    type: BridgeEvents.Deposit | BridgeEvents.BridgedBurn;
}

export type TokensBridgedEvent = BridgeEvent & (
    DepositEvent | 
    BridgedBurnEvent
);

// export { 
//     BridgeDepositEventArgs as DepositEvent,
//     BridgeBridgedBurnEventArgs as BridgedBurnEvent
// } from "@ohdex/contracts/lib/build/wrappers/bridge";

export class BridgeAdapter {
    bridgeContract: BridgeContract;
    bridgeContract_sub: ethers.Contract;
    events = new EventEmitter()
    chainId: number;

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
        let depositEvents = await this.loadDepositEvents()
        let bridgeBurnEvents = await this.loadBridgedBurnEvents()

        return [].concat(
            depositEvents, 
            bridgeBurnEvents
        );
    }

    async loadDepositEvents() {
        let previous = await PastEvents.load(this.ethersProvider, this.bridgeContract_sub, BridgeEvents.Deposit)

        return previous.map(ev => {
            return {
                ...ev,
                type: BridgeEvents.Deposit
            } as TokensBridgedEvent;
        })
    }

    async loadBridgedBurnEvents() {
        let previous = await PastEvents.load(this.ethersProvider, this.bridgeContract_sub, BridgeEvents.BridgedBurn)

        return previous.map(ev => {
            return {
                ...ev,
                type: BridgeEvents.BridgedBurn
            } as TokensBridgedEvent;
        })
    }    

    listen() {
        let self = this;

        // 3) Listen to the original events of the bridge/escrow contracts
        // So we can relay them later
        this.bridgeContract_sub.on(
            BridgeEvents.Deposit, 
            async function(
                token: string,
                receiver: string,
                amount: BigNumber,
                salt: BigNumber,
                targetChainId: BigNumber,
                targetBridge: string,
                eventHash: string, 
                ev: ethers.Event
            ) {
                let tokensBridgedEv: TokensBridgedEvent = {
                    type: BridgeEvents.Deposit,
                    token,
                    receiver,
                    amount,
                    salt,
                    targetChainId,
                    targetBridge,
                    eventHash
                }
                self.events.emit('tokensBridged', tokensBridgedEv)
            }
        )

        this.bridgeContract_sub.on(
            BridgeEvents.BridgedBurn, 
            async function(
                bridgedToken: string,
                token: string,
                receiver: string,
                amount: BigNumber,
                salt: BigNumber,
                targetChainId: BigNumber,
                targetBridge: string,
                eventHash: string, 
                ev: ethers.Event
            ) {
                let tokensBridgedEv: TokensBridgedEvent = {
                    type: BridgeEvents.BridgedBurn,
                    bridgedToken,
                    token,
                    receiver,
                    amount,
                    salt,
                    targetChainId,
                    targetBridge,
                    eventHash
                }
                self.events.emit('tokensBridged', tokensBridgedEv)
            }
        )
    }

    async stop() {
        await this.bridgeContract_sub.removeAllListeners(BridgeEvents.Deposit)
        await this.bridgeContract_sub.removeAllListeners(BridgeEvents.BridgedBurn)
    }

    async bridge(
        ev: CrosschainEvent<TokensBridgedEvent>,
        proof: EventProof
    ) {
        // this.logger.info(`Bridge.claim: estimateGas=${gas}`)

        try {
            if(ev.data.type == BridgeEvents.BridgedBurn) {
                await this.web3Wrapper.awaitTransactionSuccessAsync(
                    await this.bridgeContract.withdraw.sendTransactionAsync(
                        ev.data.token,
                        ev.data.receiver,
                        ev.data.amount,
                        ev.data.salt,
                        new BigNumber(ev.from.chainId),
                        ev.from.bridge,


                        proof.eventLeafProof.proofs.map(hexify),
                        proof.eventLeafProof.paths,
                        proof.stateProof.proofBitmap,
                        proof.stateProof.proofNodes,
                        { ...this.txDefaults, gas: 5000000 }
                    )
                );
            } else if(ev.data.type == BridgeEvents.Deposit) {
                await this.web3Wrapper.awaitTransactionSuccessAsync(
                    await this.bridgeContract.issueBridged.sendTransactionAsync(
                        ev.data.token,
                        ev.data.receiver,
                        ev.data.amount,
                        ev.data.salt,
                        new BigNumber(ev.from.chainId),
                        ev.from.bridge,

                        ev.eventHash,
                        
                        proof.eventLeafProof.proofs.map(hexify),
                        proof.eventLeafProof.paths,
                        proof.stateProof.proofBitmap,
                        proof.stateProof.proofNodes,
                        { ...this.txDefaults, gas: 5000000 }
                    )
                );
            }
            
            this.logger.info(`bridged ev: ${ev.data.eventHash} for bridge ${ev.to.targetBridge}`)
        } catch(ex) {
            throw ex;
        }
    }
}