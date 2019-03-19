import { Web3ProviderEngine } from "0x.js";
import { PrivateKeyWalletSubprovider, RPCSubprovider } from "@0x/subproviders";
import { ConfigManager } from "./config";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { fromWei } from "web3-utils";

// checks balances on all networks

(async () => {
    let configMgr = await ConfigManager.load();
    let networks = Object.keys(configMgr.config)
    let deploymentAccount = require("@ohdex/config").accounts.deployment;

    for(let network of networks) {
        let config = configMgr.config[network];
        
        let pe = new Web3ProviderEngine();
        pe.addProvider(new PrivateKeyWalletSubprovider(deploymentAccount.privateKey))
        pe.addProvider(new RPCSubprovider(config.rpcUrl));
        pe.start()

        let web3 = new Web3Wrapper(pe);
        let accounts = await web3.getAvailableAddressesAsync();
        let account = accounts[0];

        let balance = await web3.getBalanceInWeiAsync(account)

        console.log(`${network}\t ${account} (${fromWei(balance.toString(), 'ether')} ETH)`)

        pe.stop()
    }
    

})()