import { EventEmitterContract, EventEmitterEvents } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { Web3ProviderEngine, RPCSubprovider } from '0x.js';

export function getContractAbi(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json.compilerOutput.abi;
}


export class ContractWrappers { 
    static from(networkConf: any, pe: Web3ProviderEngine) {
        const EventEmitter = new EventEmitterContract(
            getContractAbi('EventEmitter'),
            networkConf.eventEmitterAddress,
            pe
        )
        
        return {
            EventEmitter
        }
    }
}

// class EventEmitterWrapper {
//     constructor(network: string) {

//     }
// }