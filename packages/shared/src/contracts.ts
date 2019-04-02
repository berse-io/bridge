
import { BridgedTokenContract } from "@ohdex/contracts/lib/build/wrappers/bridged_token";
import { EscrowContract } from '@ohdex/contracts/lib/build/wrappers/escrow';
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

export const _salt = new BigNumber(0);
export const generateSalt = () => BigNumber.random();
export const _chainId = new BigNumber(0);

export class ContractWrappers { 
    EventEmitter: EventEmitterContract;
    Escrow: EscrowContract;

    static from(networkConf: any, pe: Web3ProviderEngine) {
        const EventEmitter = new EventEmitterContract(
            getContractAbi('EventEmitter'),
            networkConf.eventEmitterAddress,
            pe
        )

        const Escrow = new EscrowContract(
            getContractAbi('Escrow'),
            networkConf.escrowAddress,
            pe
        )
        
        return {
            EventEmitter,
            Escrow,
        } as ContractWrappers
    }
}
