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


describe('Relayer', async () => {
    it(`shouldn't throw if event is not notarised yet`, async () => {
        
    })

    // create event on one chain
    // update the state root of that chain
    // route the event to the second chain
    // update the second chain but not the state root of the first chain
    // the update to the first chain shouldn't be processed if it doesnt ack all the events
    // bridge event shouldn't be processed on the second chain if it hasnt been notarised


    // the problem
    // is that the crosschain state only stores one merkle root
    // whereas we need one for every chain
    // the events are always the same
    // but we need to 

    // update one 
    // update the other
    // we have to compute the event proof
    // we then have to compute the state root proof for THIS current state root
})