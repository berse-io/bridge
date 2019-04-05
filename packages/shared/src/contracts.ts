
import { BridgeContract } from "@ohdex/contracts/lib/build/wrappers/bridge";
import { EventEmitterContract } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { Web3ProviderEngine, RPCSubprovider, BigNumber } from '0x.js';

export function getContractArtifact(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json
}

export function getContractAbi(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json.compilerOutput.abi;
}

export function get0xArtifact(name: string) {
    return require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
}



import { randomHex } from "web3-utils";

export const _salt = new BigNumber(0);
export const bnify = (hex) => {
    return new BigNumber(hex.slice(2), 16)
}
export const generateSalt = () => {
    return bnify(randomHex(32))
}
export const _chainId = new BigNumber(0);

export class ContractWrappers { 
    EventEmitter: EventEmitterContract;
    Bridge: BridgeContract;

    static from(networkConf: any, pe: Web3ProviderEngine) {
        const EventEmitter = new EventEmitterContract(
            getContractAbi('EventEmitter'),
            networkConf.eventEmitterAddress,
            pe
        )

        const Bridge = new BridgeContract(
            getContractAbi('Bridge'),
            networkConf.bridgeAddress,
            pe
        )
        
        return {
            EventEmitter,
            Bridge
        } as ContractWrappers
    }
}
