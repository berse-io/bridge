import { inject, Provider } from "@loopback/context";
import { EthereumChainTracker } from "./ethereum";
import { ctx } from "../relayer/context";

export class ChainTrackerFactory {
    constructor(
    ) {
    }

    async create(conf: any): Promise<EthereumChainTracker> {
        let t = await ctx.get<typeof EthereumChainTracker>('trackers.EthereumChainTracker')
        return new t(conf);
    }
}