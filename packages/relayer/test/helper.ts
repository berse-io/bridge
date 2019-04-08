import { Web3Wrapper } from "@0x/web3-wrapper";
import { Web3ProviderEngine, RPCSubprovider } from "0x.js";
import { SolCompilerArtifactAdapter } from '@0x/sol-trace';
export interface MultichainInfo {
    pe: Web3ProviderEngine;
    web3: Web3Wrapper;
    snapshotId: number;
    config: any;
}

const ganache = require("ganache-core");

export class Testchain {
    port: string;
    
    get rpcUrl() {
        return `http://localhost:${this.port}`
    }
}


export class TestchainFactory {
    static async fork(rpcUrl: string, port: string): Promise<Testchain> {
        let nonce = new Date;
        const server = ganache.server({ 
            // ws: true,
            // logger: {
            //     log: () => false // console.log
            // },

            total_accounts: 100,
            s: "TestRPC is awesome! " + nonce, // I didn't choose this
            // gasPrice: 0,
            // gas: 1,
            // networkId: 420,
            // debug: false,
            defaultBalanceEther: '1000000000',
            unlock: [0, 1],
            fork: rpcUrl,
            
        });

        return new Promise<any>((res, rej) => {
            server.listen(port, (err, state) => {
                if(err) rej(err);
                
                let chain = new Testchain()
                chain.port = port;
                res(chain)
            })
        });
        
    }
}
export class MultichainProviderFactory {
    things: MultichainInfo[] = [];

    constructor() {

    }

    async connect() {
        const config = require('@ohdex/config/test_networks.json');

        await this.connect_(config['kovan'])
        await this.connect_(config['rinkeby'])
    }

    async connect_(config: any) {
        let pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(config.rpcUrl))
        pe.start()

        let web3 = new Web3Wrapper(pe);
        let snapshotId = await web3.takeSnapshotAsync()
        this.things.push({
            pe,
            web3,
            snapshotId,
            config,
        })
        console.log(`snapshot ${config.rpcUrl} at ${snapshotId}`)
        
        // accounts = await web3.getAvailableAddressesAsync();
        // user = accounts[0]
    }

    async restore() {
        return Promise.all(this.things.map((thing) => {
            let { web3, snapshotId } = thing;
            return web3.revertSnapshotAsync(snapshotId)
        }))
    }
}

export function get0xArtifact(name: string) {
    return require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
}
export function getContractAbi(name: string) {
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`)
    return json.compilerOutput.abi;
}

export function caseInsensitiveEquals(str: string) {
    return function(v: string) {
        return v.toUpperCase() === str.toUpperCase();
    }
}

import sinon from 'sinon'
import { RevertTraceSubprovider } from "@0x/sol-trace";
import { options } from "../src/db";
import { getRepository, getConnection, Connection } from "typeorm";
import { Chain } from "../src/db/entity/chain";
import { ChainEvent } from "../src/db/entity/chain_event";
import { InterchainStateUpdate } from "../src/db/entity/interchain_state_update";
import { EthereumChainTracker } from "../src/chain/ethereum";
import { CrosschainStateService } from "../src/interchain/xchain_state_service";
import { DbConnProvider } from "../src/db/provider";
import { NonceTrackerSubprovider } from "@0x/subproviders";

export function sinonStrEqual(str: string) {
    return sinon.match(caseInsensitiveEquals(str), `${str}`)
}

export function sinonBignumEq(x: any) {
    return sinon.match(function(v: any) {
        return x.equals(v)
    })
}

export function getRevertTraceSubprovider(account: string) {
    const artifactAdapter = new SolCompilerArtifactAdapter(
        `${require("@ohdex/contracts")}/build/artifacts`,
        `${require("@ohdex/contracts")}/contracts`
    );
    const revertTraceSubprovider = new RevertTraceSubprovider(
        artifactAdapter, 
        account,
        false
    );
    return revertTraceSubprovider;
}

function prependSubprovider(provider: Web3ProviderEngine, subprovider: any): void {
    subprovider.setEngine(provider);
    // HACK: We use implementation details of provider engine here
    // https://github.com/MetaMask/provider-engine/blob/master/index.js#L68
    (provider as any)._providers = [subprovider, ...(provider as any)._providers];
}

export function addRevertTraces(pe, account) {
    // prependSubprovider(pe, getRevertTraceSubprovider(account))
    pe.addProvider(getRevertTraceSubprovider(account))
    return;
}

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

export async function clearDb() {
    // getConnection().query('drop * from')
    await getConnection().synchronize(true);
}

export async function givenDbService(): Promise<Connection> {
    const testConnOpts = options;
    let db = new DbConnProvider(testConnOpts)
    return await db.value()
}

export async function givenEmptyDatabase(conn: Connection) {
    // let conn = getConnection();
    await conn.synchronize(true)
    await conn.getRepository<InterchainStateUpdate>(InterchainStateUpdate).clear()
    await conn.getRepository<ChainEvent>(ChainEvent).clear()
    await conn.getRepository<Chain>(Chain).clear()
}

export async function givenEthereumChainTracker(conn: Connection, conf: any) {
    let tracker = new EthereumChainTracker(conf)
    tracker.chain = conn.getRepository(Chain)
    tracker.chainEvent = conn.getRepository(ChainEvent)
    tracker.stateUpdate = conn.getRepository(InterchainStateUpdate)
    tracker.crosschainStateService = {} as CrosschainStateService
    return tracker
}