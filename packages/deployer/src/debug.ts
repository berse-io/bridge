import '@ohdex/config';
import { Web3ProviderEngine } from "0x.js";
import { PrivateKeyWalletSubprovider, RPCSubprovider } from "@0x/subproviders";
import { ConfigManager } from "./config";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { fromWei } from "web3-utils";
import {
    zxWeb3Connected
} from '@ohdex/shared';


// checks balances on all networks




(async () => {
    let configMgr = await ConfigManager.load();
    let networks = Object.keys(configMgr.config)
    let deploymentAccount = require("@ohdex/config").accounts.deployment;

    await Promise.all(networks.map(async network => {
        let config = configMgr.config[network];
        
        let pe = new Web3ProviderEngine();
        pe.addProvider(new PrivateKeyWalletSubprovider(deploymentAccount.privateKey))
        pe.addProvider(new RPCSubprovider(config.rpcUrl, 3000));
        pe.start()

        let web3 = new Web3Wrapper(pe);

        let account = deploymentAccount.address;
        try {
            await zxWeb3Connected(pe)
        } catch(ex) {
            console.error(`${network}\t\t couldn't connect`)
        }

        let balance = await web3.getBalanceInWeiAsync(account)

        console.log(`${network}\t\t ${account} (${fromWei(balance.toString(), 'ether')} ETH)`)

        pe.stop()
    }))
})().catch(ex => console.error(ex))