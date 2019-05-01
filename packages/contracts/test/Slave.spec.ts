import chai, { expect, should, assert } from 'chai';
import { describe, it, setup, teardown } from 'mocha';

import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';

import {
    SlaveContract
} from '../build/wrappers/slave';

import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { BridgedTokenContract } from '../build/wrappers/bridged_token';
import { BaseContract } from '@0x/base-contract';
import { ethers } from 'ethers';

function getContractArtifact(name: string) {
    name = name.split('Contract')[0];

    // require('path').dirname(require.resolve('..')) + `/build/artifacts`,

    return require(`../../build/artifacts/${name}.json`)

}

import { GanacheTestchain, dehexify, hexify } from './helpers'
const toBN = (str) => new BigNumber(str);
const keccak256 = (x: any) => dehexify(require('web3-utils').keccak256(x));


describe('Bridge', function(){
    this.timeout(10000);
    let ethersProvider: ethers.providers.Provider;
    let pe, web3: Web3Wrapper;
    let accounts;
    let user;

    function getEthersContract(contract: BaseContract) {
        return new ethers.Contract(
            contract.address,
            contract.abi,
            ethersProvider
        )
    }

    beforeEach(async () => {
        const port = '9546';
        let chain = await GanacheTestchain.start(port);

        pe = new Web3ProviderEngine();
        // const artifactAdapter = new SolCompilerArtifactAdapter(
            // require('path').dirname(require.resolve('..')) + `/build/artifacts`,
            // require('path').dirname(require.resolve('..')) + `/contracts`,
            // require('path').dirname(require.resolve('..')), 
            // '0.5.0'
        // );
        // const revertTraceSubprovider = new RevertTraceSubprovider(
        //     artifactAdapter, 
        //     TRUFFLE_DEFAULT_ADDR,
        //     true
        // );
        // pe.addProvider(revertTraceSubprovider);
        pe.addProvider(new RPCSubprovider('http://127.0.0.1:9546'))
        pe.start()

        web3 = new Web3Wrapper(pe);
        // web3V = new Web3(pe);
        accounts = await web3.getAvailableAddressesAsync();
        user = accounts[0]

        const CONNECT_TIMEOUT = 1500;
        ethersProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:9546');
        // @ts-ignore
        ethersProvider.polling = true;
        // @ts-ignore
        ethersProvider.pollingInterval = 1000;
        await new Promise((res, rej) => {
            ethersProvider.on('block', res);
            setTimeout(
                _ => {
                    rej(new Error(`Ethers.js couldn't connect after ${CONNECT_TIMEOUT}ms`))
                }, 
                CONNECT_TIMEOUT
            )
        })
        
        const txDefaults = { from: user };

    });


    describe('Slave', async () => {

        

        it('Slave contract can respond to calls from master on different chain', async () => {
            

        })

    })

    
    teardown(() => {
        pe.stop();
    })
    
})