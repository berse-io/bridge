const AbiCoder = require('web3-eth-abi').AbiCoder();

// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { Web3ProviderEngine } from "0x.js";
import { BigNumber } from "@0x/utils"
import { AbiDefinition, TxData } from '@0x/web3-wrapper';
import { NonceTrackerSubprovider, RPCSubprovider } from '@0x/subproviders';


function getDeployArgs(name: string, pe: Provider, from: string): [ string, AbiDefinition[], Provider, Partial<TxData>] {
    let json = require(`../../build/artifacts/${name}.json`);
    let bytecode = json.compilerOutput.evm.bytecode.object;
    let abi = json.compilerOutput.abi;
    let provider = pe;
    console.log(from)

    return [
        bytecode,
        abi,
        provider,
        { from }
    ]
}

function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

function prefix0x(x: string): string {
    return `0x${x}`;
}


const ganache = require("ganache-core");

class GanacheTestchain {
    static async start(port: string) {
        const server = ganache.server({ 
            ws: true,
            logger: {
                log: () => false // console.log
            },
            total_accounts: 100,
            s: "TestRPC is awesome!", // I didn't choose this
            gasPrice: 0,
            networkId: 420,
            debug: false,
            defaultBalanceEther: '100000000000000000000000000000',
            unlock: [0, 1],
        });

        let blockchainState = await new Promise<any>((res, rej) => {
            server.listen(port, (err, state) => {
                if(err) rej(err);
                else res(state)
            })
        });
        
        return blockchainState;
    }
}

function waitUntilConnected(pe: Web3ProviderEngine): Promise<any> {
    return new Promise((res, rej) => {
        pe.on('block', res)
        setTimeout(rej, 2000)
    });
}

function dehexify(str: string): Buffer {
    // begins with 0x
    if(str[1] == 'x') str = str.slice(2);
    return Buffer.from(str, 'hex')
}

export function getContractArtifact(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json
}

export function getContractAbi(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json.compilerOutput.abi;
}

export function get0xArtifact(name: string) {
    return require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
}

import { Web3Wrapper } from '@0x/web3-wrapper';
import { randomHex } from 'web3-utils';
import { Provider } from 'ethereum-types';


export async function loadWeb3(config: { rpcUrl: string }) {
    let pe = new Web3ProviderEngine();
    pe.addProvider(new NonceTrackerSubprovider())
    pe.addProvider(new RPCSubprovider(config.rpcUrl))
    pe.start()

    let web3 = new Web3Wrapper(pe);
    let accounts = await web3.getAvailableAddressesAsync()
    let account = accounts[2]

    let txDefaults = { from: account }
    // , gas: 10000000

    return {
        pe,
        web3,
        accounts,
        account,
        txDefaults
    }
}


export const generateSalt = () => {
    return new BigNumber(randomHex(32))
}

export {
    getDeployArgs,
    GanacheTestchain,
    hexify,
    prefix0x,
    keccak256,
    waitUntilConnected,
    dehexify
}