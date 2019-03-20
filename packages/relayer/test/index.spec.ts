import { EthereumChainTracker } from "../src/chain/ethereum";

describe('EthereumChainTracker', async () => {
    let tracker: EthereumChainTracker;
    let conf = require('@ohdex/config').networks['ropsten'];

    before(async () => {
        tracker = new EthereumChainTracker(conf)
    })

    it('loads past events from event emitter', async () => {
        // get event emitter
        // emit some events
        // check that those events are included in the state gadget
    })

    it('loads past events from token bridge contracts', async () => {

    })

    it('routes events to other chains', async () => {
        // TokensBridgedEvent
    })
})