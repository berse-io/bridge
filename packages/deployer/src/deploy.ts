import { RPCSubprovider, Web3ProviderEngine } from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { logUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BridgeContract } from '@ohdex/contracts/lib/build/wrappers/bridge';
import { EventEmitterContract } from '@ohdex/contracts/lib/build/wrappers/event_emitter';
import { EventListenerContract } from '@ohdex/contracts/lib/build/wrappers/event_listener';
import { WETH9Contract } from '@ohdex/contracts/lib/build/wrappers/weth9';
import { WhitelistContract } from '@ohdex/contracts/lib/build/wrappers/whitelist';
import { fromWei, toWei } from "web3-utils";
import { ConfigManager } from "./config";
import { deployLibraries, getDeployArgs } from "./deploy_utils";

const winston = require('winston'); 
const { format } = winston;
const { label } = format;


async function deploy(configMgr: ConfigManager) {
    let networks = [];

    if(process.env.NETWORK === 'all') {
        networks = Object.keys(configMgr.config)
    } else if(process.env.NETWORK.indexOf(',') > -1) {
        let parsed = process.env.NETWORK.split(',');
        networks = Object.keys(configMgr.config).filter(net => parsed.includes(net))
    } else {
        networks = [process.env.NETWORK]
    }

    console.log(`Deploying to ${networks.length} networks`)

    for(let net of networks) {
        await _deploy(configMgr, net)
    }

    configMgr.save()
}


async function _deploy(configMgr: ConfigManager, network: string) {
    const config = configMgr.config[network];
    
    let logger = winston.loggers.add(
        `deployer-${network}`, 
        {
            format: require('./logger').logFormat([
                label({ label: network })
            ]),
            transports: [
                new winston.transports.Console()
            ]
        }
    );

    logUtils.log = (args) => {
        logger.info(args)
    }

    logger.info(`Deploying to network (rpcUrl=${config.rpcUrl})`)

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let accounts;
    let account;

    let deploymentAccount = require("@ohdex/config").accounts.deployment;

    pe = new Web3ProviderEngine();
    pe.addProvider(new PrivateKeyWalletSubprovider(deploymentAccount.privateKey))
    pe.addProvider(new RPCSubprovider(config.rpcUrl));
    pe.start()
    
    web3 = new Web3Wrapper(pe);
    accounts = await web3.getAvailableAddressesAsync();
    account = accounts[0];


    // check the available balance
    let balance = await web3.getBalanceInWeiAsync(account)
    logger.info(`Using account ${account} (${fromWei(balance.toString(), 'ether')} ETH)`)

    if(balance.lessThan(toWei('1', 'ether'))) {
        try {
            throw new Error(`Balance may be insufficent`)
        } catch(ex) {
            logger.warn(""+ex)
            // throw ex;
            // It will fail anyways below. This is to support Ganache, where tx's are free.
        }
    }

    // 0 Deploy libraries
    await deployLibraries(pe, account)

    // 1 Deploy whitelist
    let whitelist = await WhitelistContract.deployAsync(
        ...getDeployArgs('Whitelist', pe, account)
    );

    // 2 Deploy eventEmitter
    // @ts-ignore
    let eventEmitter = await EventEmitterContract.deployAsync(
        ...getDeployArgs('EventEmitter', pe, account, true),
        // @ts-ignore
        whitelist.address,
        config.chainId,
        network
    );


    // 3 Deploy eventListener
    
    // @ts-ignore
    let eventListener = await EventListenerContract.deployAsync(
        ...getDeployArgs('EventListener', pe, account, true),
        // @ts-ignore
        eventEmitter.address
    )


    // 4 Deploy Bridge

    // @ts-ignore
    let bridge = await BridgeContract.deployAsync(
        ...getDeployArgs('Bridge', pe, account),
        // @ts-ignore
        eventListener.address,
        eventEmitter.address,
    )

    config.eventEmitterAddress = eventEmitter.address.toLowerCase();
    config.eventListenerAddress = eventListener.address.toLowerCase();
    config.bridgeAddress = bridge.address.toLowerCase();


    // @ts-ignore
    let weth = await WETH9Contract.deployAsync(
        ...getDeployArgs('WETH9', pe, account)
    );
    config.wethToken = weth.address.toLowerCase();
    

    pe.stop();
}

export { _deploy, deploy };
