import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { SparseMerkleTreeContract } from '@ohdex/contracts/lib/build/wrappers/sparse_merkle_tree';
import { MerkleTreeVerifierContract } from '@ohdex/contracts/lib/build/wrappers/merkle_tree_verifier';

import {
    WhitelistContract
} from '@ohdex/contracts/lib/build/wrappers/whitelist';

import {
    EventListenerContract
} from '@ohdex/contracts/lib/build/wrappers/event_listener';

import {
    EventEmitterContract,
} from '@ohdex/contracts/lib/build/wrappers/event_emitter';

import {
    BridgeContract
}   from '@ohdex/contracts/lib/build/wrappers/bridge';

import {
    WETH9Contract
}   from '@ohdex/contracts/lib/build/wrappers/weth9';

import { ConfigManager } from "./config";
import { toWei, fromWei } from "web3-utils";

import { logUtils } from '@0x/utils';

import { AccountsConfig } from '@ohdex/multichain';
import { getDeployArgs, addLibrary } from "./deploy_utils";

const assert = require('assert');

const winston = require('winston'); 
const { format } = winston;
const { combine, label, json, simple } = format;







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
    // await Promise.all(networks.map(net => {
    //     return _deploy(configMgr, net)
    // }));

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
    
    // Deploy libraries
    let sparseMerkleTree = await SparseMerkleTreeContract.deployAsync(
        ...getDeployArgs('SparseMerkleTree', pe, account)
    )

    let merkleTreeVerifier = await MerkleTreeVerifierContract.deployAsync(
        ...getDeployArgs('MerkleTreeVerifier', pe, account)
    )

    addLibrary('SparseMerkleTree', sparseMerkleTree.address)
    addLibrary('MerkleTreeVerifier', merkleTreeVerifier.address)


    // 0 Deploy whitelist

    let whitelist = await WhitelistContract.deployAsync(
        ...getDeployArgs('Whitelist', pe, account)
    );

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


    // 5 Deploy Bridge

    // @ts-ignore
    let bridge = await BridgeContract.deployAsync(
        ...getDeployArgs('Bridge', pe, account),
        // @ts-ignore
        eventListener.address,
        eventEmitter.address,
    )

    config.eventEmitterAddress = eventEmitter.address.toLowerCase();
    config.eventListenerAddress = eventListener.address.toLowerCase();
    // config.escrowAddress = escrow.address.toLowerCase();
    config.bridgeAddress = bridge.address.toLowerCase();


    // @ts-ignore
    let weth = await WETH9Contract.deployAsync(
        ...getDeployArgs('WETH9', pe, account)
    );
    config.wethToken = weth.address.toLowerCase();
    

    pe.stop();
}

export {
    _deploy,
    deploy
}