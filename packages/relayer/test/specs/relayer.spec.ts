import { RPCSubprovider, Web3ProviderEngine } from '0x.js';
import { RevertTraceSubprovider, SolCompilerArtifactAdapter } from '@0x/sol-trace';
import { BigNumber } from "@0x/utils";
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BridgedTokenContract } from "@ohdex/contracts/lib/build/wrappers/bridged_token";
import { EscrowContract } from '@ohdex/contracts/lib/build/wrappers/escrow';
import { EventEmitterContract } from "@ohdex/contracts/lib/build/wrappers/event_emitter";
import { expect } from 'chai';
import { suiteTeardown } from 'mocha';
import sinon from 'sinon';
import { EthereumChainTracker } from "../../src/chain/ethereum";
import { MessageSentEvent } from '../../src/chain/tracker';
import { hexify, keccak256 } from '../../src/utils';
import { get0xArtifact, getContractAbi, sinonBignumEq, sinonStrEqual } from '../helper';
import { CrosschainState } from '../../src/interchain/crosschain_state';
import { StateGadget } from '../../src/chain/abstract_state_gadget';
import { EthereumStateGadget } from '../../src/chain/ethereum/state_gadget';

    // it('updates crosschain state on new events', async() => {
        // let chain1 = require('@ohdex/config').networks.kovan;
        // let chain2 = require('@ohdex/config').networks.rinkeby;

        // create two events
        // update one chain
        // update another chain
        // wait for the bridge event to be processed
            // event routed from one tracker to another tracker
            // on the state root update, the tracker proves the event correctly
        

        // another chain update
        // the tracker 
    // })