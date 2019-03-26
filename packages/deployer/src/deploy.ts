import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';


import {
    WhitelistContract
} from '../../contracts/build/wrappers/whitelist';

import {
    EventListenerContract
} from '@ohdex/contracts/lib/build/wrappers/event_listener';

import {
    EventEmitterContract,
} from '@ohdex/contracts/lib/build/wrappers/event_emitter';

import {
    EscrowContract
}  from '@ohdex/contracts/lib/build/wrappers/escrow'

import {
    BridgeContract
}   from '@ohdex/contracts/lib/build/wrappers/bridge';

import {
    WETH9Contract
}   from '@ohdex/contracts/lib/build/wrappers/weth9';

import {
    DemoERC20Contract
}   from '@ohdex/contracts/lib/build/wrappers/demo_erc20';
import { ConfigManager } from "./config";
import { toWei, fromWei } from "web3-utils";

import { logUtils } from '@0x/utils';

import { AccountsConfig } from '@ohdex/multichain';

const assert = require('assert');

const winston = require('winston'); 
const { format } = winston;
const { combine, label, json, simple } = format;

function getDeployArgs(name: string, pe: Web3ProviderEngine, from: string): [ string, AbiDefinition[], Provider, Partial<TxData>] {
    // let json = require(`@ohdex/contracts/lib/build/contracts/${name}.json`);
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`);
    let bytecode = json.compilerOutput.evm.bytecode.object;
    let abi = json.compilerOutput.abi;
    let provider = pe;

    assert.ok(bytecode.length > 0)
    assert.ok(abi.length > 0)
    assert.ok(from != "")

    return [
        bytecode,
        abi,
        provider,
        { from }
    ]
}


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

    await Promise.all(networks.map(net => {
        return _deploy(configMgr, net)
    }));

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
        ...getDeployArgs('EventEmitter', pe, account),
        whitelist.address
    );

    // 3 Deploy eventListener
    
    // @ts-ignore
    let eventListener = await EventListenerContract.deployAsync(
        ...getDeployArgs('EventListener', pe, account),
        eventEmitter.address
    )


    // 4 Deploy Escrow

    // @ts-ignore
    let escrow = await EscrowContract.deployAsync(
        ...getDeployArgs('Escrow', pe, account),
        config.chainId,
        eventListener.address,
        eventEmitter.address
    );

    // 4.1 add Escrow to whitelist

    await whitelist.addWhitelisted.sendTransactionAsync(
        escrow.address
    )

    console.log("whitelisted Escrow");

    // 5 Deploy Bridge

    // @ts-ignore
    let bridge = await BridgeContract.deployAsync(
        ...getDeployArgs('Bridge', pe, account),
        config.chainId,
        eventListener.address,
        eventEmitter.address,
    )

    config.eventEmitterAddress = eventEmitter.address.toLowerCase();
    config.eventListenerAddress = eventListener.address.toLowerCase();
    config.escrowAddress = escrow.address.toLowerCase();
    config.bridgeAddress = bridge.address.toLowerCase();

    // @ts-ignore
    let aliceToken = await DemoERC20Contract.deployAsync(
        ...getDeployArgs('DemoERC20', pe, account),
        "AliceToken",
        "ALI",
        "7",
        "1000000000"
    );
    // @ts-ignore
    let bobToken = await DemoERC20Contract.deployAsync(
        ...getDeployArgs('DemoERC20', pe, account),
        "BobToken",
        "BOB",
        "7",
        "1000000000"
    );

    // @ts-ignore
    let weth = await WETH9Contract.deployAsync(
        ...getDeployArgs('WETH9', pe, account)
    );
    config.wethToken = weth.address.toLowerCase();
    config.aliceToken = aliceToken.address.toLowerCase();
    config.bobToken = bobToken.address.toLowerCase();
    

    pe.stop();
}

export {
    _deploy,
    deploy
}