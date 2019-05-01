import { ethers } from "ethers";

export class PastEvents {
    static async load(provider: ethers.providers.Provider, contract: ethers.Contract, name: string): Promise<Array<any>> {
        let previous = [];

        const TokensBridged = contract.filters[name]();
        const logs = await provider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: contract.address,
            topics: TokensBridged.topics
        });

        for (const log of logs) {
            let decoded = contract.interface.events[name].decode(log.data, log.topics)
            
            let data = decoded;
    
            previous.push(data)
        }

        return previous;
    }
}