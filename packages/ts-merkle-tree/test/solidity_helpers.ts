const ganache = require("ganache-core");
import { Web3Wrapper } from '@0x/web3-wrapper';

class GanacheTestchain {
    static async start(port: string) {
        const server = ganache.server();

        let blockchainState = await new Promise<any>((res, rej) => {
            server.listen(port, (err, state) => {
                if(err) rej(err);
                else res(state)
            })
        });
        
        return blockchainState;
    }
}

// class InMemoryGanacheFactory {
//     async create() {
//         // '0' is a random free port, no race conditions
//         // https://stackoverflow.com/questions/28050171/nodejs-random-free-tcp-ports
//         let chain = await GanacheTestchain.start('0')
//         return new InMemoryGanache(chain)
//     }
// }

import { BaseContract } from '@0x/base-contract';
import { Web3ProviderEngine } from '0x.js';
import { GanacheSubprovider } from '@0x/subproviders';
import { ContractArtifact, Provider, TxData } from '@0x/types/node_modules/ethereum-types';
import { SimpleContractArtifact } from '@0x/types';

interface DeployableContract {
    deployFrom0xArtifactAsync(
        artifact: any,
        provider: Provider,
        txDefaults: Partial<TxData>,
    ): Promise<DeployableContract>;
}

export class InMemoryChain {
    pe: Web3ProviderEngine;
    constructor(
    ) {
        let pe = new Web3ProviderEngine();
        pe.addProvider(new GanacheSubprovider({ 
            logger: {
                log: () => false
            }
        }))
        pe.start()
        this.pe = pe;

        let web3 = new Web3Wrapper(pe);
    }

    async deploy<T>(contract: DeployableContract, artifact: any, txDefaults: any = {}): Promise<T> {
        return await contract.deployFrom0xArtifactAsync(
            artifact, 
            this.pe, 
            txDefaults
        ) as unknown as T;
    }
}