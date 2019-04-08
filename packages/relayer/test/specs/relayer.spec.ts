import { BigNumber } from "@0x/utils";
import { BridgedTokenContract } from "@ohdex/contracts/lib/build/wrappers/bridged_token";
import { ContractWrappers, _chainId, _salt, generateSalt, wait } from '@ohdex/shared';
import { consoleOpts } from '../../src/logger';
import { Relayer } from '../../src/relayer';
import { get0xArtifact, loadWeb3, Testchain, TestchainFactory, givenEmptyDatabase } from '../helper';
import { expect } from 'chai'
import { Web3Wrapper } from "@0x/web3-wrapper";
import { Connection } from "typeorm";

import { BlockchainLifecycle } from '@0x/dev-utils'
import { Web3ProviderEngine } from "0x.js";


describe('Relayer', function() {
    this.timeout(30000);

    it(`shouldn't throw if event is not notarised yet`, async () => {
        
    })

    // it('processes bridge events after a state root update', async () => {

    // })

    // it('processes bridge events from a previous checkpoint', async () => {

    //     // chain1 is at checkpoint X for chain2
    //     // chain3 is at checkpoint X+2 for chain1
        
    // })

    // try break it
    // observe and learn

    // it('establishes DB connection', async () => {
    //     // expect(conn.isConnected).to.be.true;
    // })

    

    describe('interchain state', function() {
        let testchain1: Testchain, testchain2: Testchain;
        let chain1 = require('@ohdex/config').networks.kovan;
        let chain2 = require('@ohdex/config').networks.rinkeby;

        let web31: Web3Wrapper;
        let web32: Web3Wrapper;
        let pe1: Web3ProviderEngine, 
            pe2: Web3ProviderEngine;
        let account1, account2;
        let txDefaults1, txDefaults2;


        let relayer: Relayer;
        let dbConn: Connection;

        let bchain1: BlockchainLifecycle, 
            bchain2: BlockchainLifecycle;

        before(async () => {
            // setup testchains
            // testchain1 = await TestchainFactory.fork(chain1.rpcUrl, '11000')
            // testchain2 = await TestchainFactory.fork(chain2.rpcUrl, '11001')
            // chain1.rpcUrl = testchain1.rpcUrl;
            // chain2.rpcUrl = testchain2.rpcUrl;

            // await chainlog({ config: require.resolve('@ohdex/relayer/test/test2.yml') })
            // await chainlog({ config: require.resolve('@ohdex/relayer/test/test.yml') })

            // add test funds to the relayer wallet
            ({ 
                pe: pe1,
                account: account1,
                txDefaults: txDefaults1,
                web3: web31
            } = await loadWeb3(chain1));

            ({
                pe: pe2,
                account: account2,
                txDefaults: txDefaults2,
                web3: web32
            } = await loadWeb3(chain2));
            
            bchain1 = new BlockchainLifecycle(web31)
            bchain2 = new BlockchainLifecycle(web32)
        })

        before(async () => {
            await Promise.all([
                bchain1.startAsync(),
                bchain2.startAsync()
            ])

            // console.log(2)
            // await web31.revertSnapshotAsync(chain1.deploymentInfo.blockNumber)
            // await web32.revertSnapshotAsync(chain2.deploymentInfo.blockNumber)
            // await web31.sendRawPayloadAsync({"method": "miner_stop", "params": []})            
            // await web32.sendRawPayloadAsync({"method": "miner_stop", "params": []})            

            // await web31.setHeadAsync(chain1.deploymentInfo.blockNumber)
            // await web32.setHeadAsync(chain2.deploymentInfo.blockNumber)

            // await web31.sendRawPayloadAsync({"method": "miner_start", "params": [1]})
            // await web32.sendRawPayloadAsync({"method": "miner_start", "params": [1]})
        })

        beforeEach(async () => {

            // await web31.awaitTransactionMinedAsync(
            //     await web31.sendTransactionAsync({
            //         from: account1,
            //         to: account1,
            //         value: '0',
            //     }),
            //     0,
            // );
            // await web32.awaitTransactionMinedAsync(
            //     await web32.sendTransactionAsync({
            //         from: account2,
            //         to: account2,
            //         value: '0',
            //     }),
            //     0,
            // );

            // await web31.setHeadAsync(chain1.deploymentInfo.blockNumber)
            // await web32.setHeadAsync(chain2.deploymentInfo.blockNumber)

            // await Promise.all([
            //     bchain1.startAsync(),
            //     bchain2.startAsync()
            // ])
            
            // dbConn = await relayer.ctx.get<Connection>('db.conn');
            // await givenEmptyDatabase(dbConn)
        })

        afterEach(async () => {
            await Promise.all([
                bchain1.revertAsync(),
                bchain2.revertAsync()
            ])
        })

        after(async () => {
            await relayer.stop()
            pe1.stop()
            pe2.stop()

            // await Promise.all([
            //     bchain1.revertAsync(),
            //     bchain2.revertAsync()
            // ])
        })

        it.only('should ack events', async() => {
            consoleOpts.silent = false;
            relayer = new Relayer({
                chain1,
                chain2
            })

            await relayer.start()

            console.log(1)

            
            let wrappers1 = ContractWrappers.from(chain1, pe1)
            let wrappers2 = ContractWrappers.from(chain2, pe2)

            const bridgedToken1 = await BridgedTokenContract.deployFrom0xArtifactAsync(
                get0xArtifact('BridgedToken'),
                pe1, txDefaults1
            )
            

            console.log(2)
            const bridgedToken2 = await BridgedTokenContract.deployFrom0xArtifactAsync(
                get0xArtifact('BridgedToken'),
                pe2, txDefaults2
            )

            // @ts-ignore
            const bridgeAmt = new BigNumber('10000');
            
            await bridgedToken1.mint.sendTransactionAsync(account1, bridgeAmt, txDefaults1);
            await bridgedToken1.approve.sendTransactionAsync(wrappers1.Bridge.address, bridgeAmt, txDefaults1);
            
            await bridgedToken2.mint.sendTransactionAsync(account2, bridgeAmt, txDefaults2);
            await bridgedToken2.approve.sendTransactionAsync(wrappers2.Bridge.address, bridgeAmt, txDefaults2);


            await Promise.all([
                wrappers1.Bridge.bridge.sendTransactionAsync( 
                    bridgedToken1.address, 
                    account1, new BigNumber('300'), 
                    generateSalt(),
                    chain2.chainId,
                    chain2.bridgeAddress,
                    txDefaults1
                ),
                wrappers1.Bridge.bridge.sendTransactionAsync(
                    bridgedToken1.address, 
                    account1, new BigNumber('301'), 
                    generateSalt(),
                    chain2.chainId,
                    chain2.bridgeAddress,
                    txDefaults1
                ),
                // wrappers2.Bridge.bridge.sendTransactionAsync(
                //     bridgedToken2.address, 
                //     account2, new BigNumber('300'), 
                //     generateSalt(), 
                //     chain1.chainId, 
                //     chain1.bridgeAddress, 
                //     txDefaults2
                // )
            ])

            
            
            await wait(20000)
            
        })


    })
})