import { Web3Wrapper } from "@0x/web3-wrapper";
import { Web3ProviderEngine, RPCSubprovider } from "0x.js";

export interface MultichainInfo {
    pe: Web3ProviderEngine;
    web3: Web3Wrapper;
    snapshotId: number;
    config: any;
}
export class MultichainProviderFactory {
    things: MultichainInfo[] = [];

    constructor() {

    }

    async connect() {
        const config = require('@ohdex/config/test_networks.json');

        await this.connect_(config['kovan'])
        await this.connect_(config['rinkeby'])
    }

    async connect_(config: any) {
        let pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(config.rpcUrl))
        pe.start()

        let web3 = new Web3Wrapper(pe);
        let snapshotId = await web3.takeSnapshotAsync()
        this.things.push({
            pe,
            web3,
            snapshotId,
            config,
        })
        console.log(`snapshot ${config.rpcUrl} at ${snapshotId}`)
        
        // accounts = await web3.getAvailableAddressesAsync();
        // user = accounts[0]
    }

    async restore() {
        return Promise.all(this.things.map((thing) => {
            let { web3, snapshotId } = thing;
            return web3.revertSnapshotAsync(snapshotId)
        }))
    }
}

export function get0xArtifact(name: string) {
    return require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
}
export function getContractAbi(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json.compilerOutput.abi;
}