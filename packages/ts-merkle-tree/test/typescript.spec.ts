
const chai = require('chai')
import { expect, assert } from 'chai';
import { describe, it, before, teardown, Test } from 'mocha';
chai.use(require('chai-as-promised')).use(require('chai-bytes'));
require('mocha')

import {
    MerkleTree,
    hashBranch,
    hashLeaf,
    getBalancedLayer,
    EMPTY_BYTE32,
} from "../src";


import { MerkleTreeVerifierContract } from '../build/wrappers/merkle_tree_verifier';

import { 
    TestTreeFactory, hexify, keccak256, waitUntilConnected, prefix0x, getDeployArgs
} from './helpers'

import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { TruffleArtifactAdapter, RevertTraceSubprovider } from '@0x/sol-trace';

let $web3 = require('web3')
const AbiCoder = require('web3-eth-abi').AbiCoder();



function dehexify(str: string): Buffer {
    // begins with 0x
    if(str[1] == 'x') str = str.slice(2);
    return Buffer.from(str, 'hex')
}

function toItems(items: any[]) {
    return items.map(keccak256)
}

describe('keccak256', () => {
    it('returns Buffer', () => {
        expect(keccak256('123')).to.be.instanceof(Buffer);
    })
})

describe('Typescript Merkle tree', function() {
    describe('#getBalancedLayer', () => {
        it('0 items', () => {
            let layer = getBalancedLayer([])
            expect(layer).to.have.members([])
        })

        it('1 items', () => {
            let items = toItems([ 1 ])
            let layer = getBalancedLayer(items)
            expect(layer).to.have.members([ items[0], EMPTY_BYTE32 ])
        })

        it('2 items', () => {
            let items = toItems([ 1, 2 ])
            let layer = getBalancedLayer(items)
            expect(layer).to.have.members([ items[0], items[1] ])
        })

        it('3 items', () => {
            let items = toItems([ 1, 2, 3 ])
            let layer = getBalancedLayer(items)
            expect(layer).to.have.members([ items[0], items[1], items[2], EMPTY_BYTE32 ])
        })
    })

    it('runs example', async () => {
        let items = [
            Buffer.from('123', 'hex'),
            Buffer.from('foobar')
        ];
        
        let tree = new MerkleTree(items, keccak256);
        
        let proof = tree.generateProof(1);
        expect(
            tree.verifyProof({
                ...proof,
                leaf: tree.findLeaf(items[1])
            })
        ).to.be.true;
        
        expect(
            tree.verifyProof({
                ...proof,
                leaf: tree.findLeaf(items[0])
            })
        ).to.be.false;
    })

    it('handles two duplicate elements', async () => {
        let items = [
            Buffer.from('12', 'hex'),
            Buffer.from('15', 'hex'),
            Buffer.from('20', 'hex'),
            Buffer.from('25', 'hex')
        ];
        
        let tree = new MerkleTree(items, keccak256);
        let leaves = tree.layers[0];

        // console.log(tree.toString())
        
        function verify(item, i) {
            let proof = tree.generateProof(i)
            expect(tree.verifyProof(proof)).to.be.true;
        } 

        items.map(verify)
    })

    it('computes on n=1 items', async () => {
        let items = [
            Buffer.from('123', 'hex'),
        ];
        
        let tree = new MerkleTree(items, keccak256);
        console.log(tree.toString())

        expect(tree.nLayers).to.eq(2)

        function expectArraysEqual(a, b: Buffer) {
            expect(hexify(a)).to.eq(hexify(b))
        }
        
        expectArraysEqual(tree.layers[0][0], hashLeaf(keccak256, items[0]))
        expectArraysEqual(tree.layers[0][1], hashLeaf(keccak256, EMPTY_BYTE32))
        expectArraysEqual(tree.layers[1][0], hashBranch(keccak256, tree.layers[0][0], tree.layers[0][1]))
        expectArraysEqual(tree.root(), tree.layers[1][0])
        
        let proof = tree.generateProof(1);
        expect(
            tree.verifyProof(
                proof
            )
        ).to.be.true;
    })

    it('throws on 0 items', async () => {
        let items = [
        ];
        
        let tree = new MerkleTree(items, keccak256);
        expect(() => tree.root()).to.throw('no leaves in tree')
    })


    it('throws early on an unknown leaf in a proof', async() => {
        let items = [
            ['1','2'],
            ['3','0']
        ]
        let itemsBuffed = TestTreeFactory.itemsToBuffer(items);
        // let itemToProve = itemsBuffed[0];
        
        let tree = TestTreeFactory.newTree(items)
        let i = 0
        let leafToProve = tree.leaves[i];

        // give it the item, not the leaf (hashed)
        let proof = tree.generateProof(i);
        proof.leaf = tree.leaves[i];
        expect(tree.verifyProof(proof)).to.throw;
    })
})