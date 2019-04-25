import { BridgeContract, BridgeDepositEventArgs, BridgeEvents } from '../build/wrappers/bridge'

import { waitUntilConnected, get0xArtifact } from "./helpers";
import { getDeployArgs, deployLibraries } from '@ohdex/deployer'
// let getDeployArgs;
import { Web3Wrapper, AbiDefinition, TxData, LogWithDecodedArgs } from '@0x/web3-wrapper';
import { Web3ProviderEngine, GanacheSubprovider } from "@0x/subproviders";


import chai, { expect, should, assert } from 'chai';
import { describe, it, setup, teardown } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';
import { BigNumber } from "@0x/utils";
import { randomHex } from 'web3-utils';

import { MockEventEmitterContract } from '../build/wrappers/mock_event_emitter';
import { MockEventListenerContract } from '../build/wrappers/mock_event_listener';
import { BridgedTokenContract } from '../build/wrappers/bridged_token';
import { EventEmitterEvents, EventEmitterEventEmittedEventArgs } from '../build/wrappers/event_emitter';


const AbiCoder = require('web3-eth-abi').AbiCoder();

describe('Bridge', function(){
    this.timeout(15000)

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let accounts: string[];

    let bridgeOrigin: BridgeContract;
    let bridgeTarget: BridgeContract;

    let bridgedToken: BridgedTokenContract;

    let originChainId: BigNumber;
    let targetChainId: BigNumber;


    let conf = require('@ohdex/config').networks;

    before(async () => {
        let provider = new GanacheSubprovider({})
        
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
        
        await deployLibraries(pe, accounts[0])

        originChainId = new BigNumber(conf.kovan.chainId);
        targetChainId = new BigNumber(conf.rinkeby.chainId);
    });

    beforeEach(async () => { 
        let txDefaults = { from: accounts[0] }

        
        let eventEmitter = await MockEventEmitterContract.deployFrom0xArtifactAsync(
            get0xArtifact('MockEventEmitter'), 
            pe, txDefaults,
            originChainId
        )
        let eventEmitter2 = await MockEventEmitterContract.deployFrom0xArtifactAsync(
            get0xArtifact('MockEventEmitter'), 
            pe, txDefaults,
            targetChainId
        )
        web3.abiDecoder.addABI(eventEmitter.abi);



        let eventListener = await MockEventListenerContract.deployFrom0xArtifactAsync(
            get0xArtifact('MockEventListener'), 
            pe, txDefaults
        )
        
        bridgedToken = await BridgedTokenContract.deployFrom0xArtifactAsync(
            get0xArtifact('BridgedToken'),
            pe, txDefaults
        )

        const mintAmount = new BigNumber(100000)
        await bridgedToken.mint.sendTransactionAsync(
            accounts[0], 
            mintAmount
        )

        
        bridgeOrigin = await BridgeContract.deployFrom0xArtifactAsync(
            get0xArtifact('Bridge'),
            pe, txDefaults,
            eventListener.address,
            eventEmitter.address
        );
        bridgeTarget = await BridgeContract.deployFrom0xArtifactAsync(
            get0xArtifact('Bridge'),
            pe, txDefaults,
            eventListener.address,
            eventEmitter2.address
        );

        web3.abiDecoder.addABI(bridgeOrigin.abi);

        await bridgedToken.approve.sendTransactionAsync(
            bridgeOrigin.address, mintAmount
        )
    })

    
    
    it('should generate correct hash', async () => {
        let _token = bridgedToken.address;
        let _receiver = randomHex(20)
        let _amount = new BigNumber(100);
        // let _salt = generateSalt()
        let _salt = new BigNumber(1)

        let originBridge = bridgeOrigin.address;
        let targetBridge = bridgeTarget.address;

        

        let eventDataHash = await bridgeOrigin.hashEventData_Deposit.callAsync(
            _token,
            _receiver,
            _amount,
            _salt,
            targetChainId,
            targetBridge
        );


        
        

        let transactionReceipt = await web3.awaitTransactionSuccessAsync(
            await bridgeOrigin.deposit.sendTransactionAsync(
                _token, 
                _receiver, 
                _amount, 
                _salt, 
                targetChainId, 
                targetBridge
            )
        );

        

        const depositEvent = transactionReceipt.logs.filter(
            log => (log as LogWithDecodedArgs<BridgeDepositEventArgs>).event === BridgeEvents.Deposit,
        )[0] as LogWithDecodedArgs<BridgeDepositEventArgs>;

        const eventEmittedEvent = transactionReceipt.logs.filter(
            log => (log as LogWithDecodedArgs<any>).event === EventEmitterEvents.EventEmitted,
        )[0] as LogWithDecodedArgs<EventEmitterEventEmittedEventArgs>;


        expect(depositEvent.args.eventHash).to.eq(eventEmittedEvent.args.eventHash)
        expect(depositEvent.args.targetBridge).to.eq(targetBridge)
        expect(depositEvent.args.targetChainId.eq(targetChainId)).to.be.true;


        // now try again
        let eventHash_check = depositEvent.args.eventHash

        transactionReceipt = await web3.awaitTransactionSuccessAsync(
            await bridgeTarget.issueBridged.sendTransactionAsync(
                _token, _receiver, _amount, _salt, 
                '42' as unknown as BigNumber, originBridge, 
                eventHash_check, 
                [], 
                [], 
                "0x00", 
                "0x00"
            )
        )


    })
})