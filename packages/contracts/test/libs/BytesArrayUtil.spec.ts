import { Web3ProviderEngine, BigNumber } from "0x.js";
import { waitUntilConnected, get0xArtifact } from "../helpers";
import { getDeployArgs, deployLibraries } from '@ohdex/deployer'
// let getDeployArgs;
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { GanacheSubprovider } from "@0x/subproviders";


import chai, { expect, should, assert } from 'chai';
import { describe, it, setup, teardown } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';
import { BytesArrayUtilContract } from "../../build/wrappers/bytes_array_util";

const AbiCoder = require('web3-eth-abi').AbiCoder();

describe('BytesArrayUtil', function () {
    this.timeout(15000)

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let accounts: string[];

    let contract: BytesArrayUtilContract;


    before(async () => {
        let provider = new GanacheSubprovider({ })
        
        
        let pe2 = new Web3ProviderEngine();
        pe2.addProvider(provider)
        pe2.start()

        web3 = new Web3Wrapper(pe2);
        expect(waitUntilConnected(pe2), "didn't connect to chain").to.eventually.be.fulfilled;
        
        accounts = await web3.getAvailableAddressesAsync();


        pe = new Web3ProviderEngine();
        pe.addProvider(provider)
        pe.start()
        expect(waitUntilConnected(pe), "didn't connect to chain").to.eventually.be.fulfilled;
        
        web3 = new Web3Wrapper(pe);
    });

    beforeEach(async () => { 
        let txDefaults = { from: accounts[0] }


        contract = await BytesArrayUtilContract.deployFrom0xArtifactAsync(
            get0xArtifact('BytesArrayUtil'),
            pe, txDefaults,
        );
    })

    describe('#sliceTo', async () => {
        it('1 items', async () => {
            let arr = [
                '0x01'
            ].map(item => AbiCoder.encodeParameter('uint256', item))

            let res;

            res = await contract.sliceTo.callAsync(arr, new BigNumber(0))
            expect(res).to.have.same.members(arr)
        })

        it('2 items', async () => {
            let arr = [
                '0x01',
                '0x02'
            ].map(item => AbiCoder.encodeParameter('uint256', item))

            let res;

            res = await contract.sliceTo.callAsync(arr, new BigNumber(1))
            expect(res).to.have.same.members(arr)
        })

        it('3 items', async () => {
            let arr = [
                '0x01',
                '0x02',
                '0x03',
                '0x04'
            ].map(item => AbiCoder.encodeParameter('uint256', item))

            let res;

            res = await contract.sliceTo.callAsync(arr, new BigNumber(3))
            expect(res).to.have.same.members(arr)

            res = await contract.sliceTo.callAsync(arr, new BigNumber(2))

            expect(res).to.have.same.members(arr.slice(0, 3))
        })
    })
})