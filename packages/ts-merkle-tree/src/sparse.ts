import { BigNumber } from '0x.js';

import { soliditySha3, numberToHex } from 'web3-utils';
import { dehexify, hexify } from './helpers';


const AbiCoder = require('web3-eth-abi').AbiCoder();

export function toBN(num) {
    return new BigNumber(num)
}

export function bincn(bn: BigNumber, level: number) {
    let x = new BigNumber(2).pow(level)
    return bn.plus(x)
}

// returns hex string of bn
export function toBuf(bn: BigNumber): string {
    return AbiCoder.encodeParameter('uint256', bn.toString(10));
}

function createTree(orderedLeaves, depth, defaultNodes) {
    let tree = [orderedLeaves];
    let treeLevel = orderedLeaves;

    let nextLevel: { [k: string]: string } = {};
    let halfIndex: string;
    let value: string;

    for (let level = 0; level < depth; level++) {
        nextLevel = {};
        for(let index in treeLevel) {
            halfIndex = toBN(index).dividedToIntegerBy(2).toString();
            value = treeLevel[index];
            if (toBN(index).mod(2).isZero()) {
                let coIndex = toBN(index).plus(1).toString();
                nextLevel[halfIndex] =
                    soliditySha3(value, treeLevel[coIndex] || defaultNodes[level]);
            } else {
                let coIndex = toBN(index).minus(1).toString();
                if (treeLevel[coIndex] === undefined) {
                      nextLevel[halfIndex] =
                        soliditySha3(defaultNodes[level], value);
                }
            }
        }
        treeLevel = nextLevel;
        tree.push(treeLevel);
    }
    return tree;
}

type Nodes = { [k: string]: NodeVal };
type NodeKey = string;
type NodeVal = string;

export class SparseMerkleTree {
    depth: number;
    leaves: Nodes;
    tree: Nodes[];
    defaultNodes: string[];
    root: string;


    constructor(depth: number = 256, leaves: Nodes) {
        this.depth = depth;

        // Initialize defaults
        this.defaultNodes = this.setdefaultNodes(depth);

        // Leaves must be a dictionary with key as the leaf's slot and value the leaf's hash
        this.leaves = leaves;

        if (leaves && Object.keys(leaves).length !== 0) {
            this.tree = createTree(this.leaves, this.depth, this.defaultNodes);
            this.root = this.tree[this.depth]['0'];
        } else {
            this.tree = [];
            this.root = this.defaultNodes[this.depth];
        }
    }

    private setdefaultNodes(depth) {
        const DEFAULT = toBuf(new BigNumber(0));
        let defaultNodes = new Array(depth + 1);
        // defaultNodes[0] = soliditySha3(0);
        defaultNodes[0] = DEFAULT;
        for (let i = 1; i < depth + 1; i++) {
            // defaultNodes[i] = soliditySha3(defaultNodes[i-1], defaultNodes[i-1]);
            defaultNodes[i] = DEFAULT;
        }
        return defaultNodes;
    }

    createMerkleProof(key) {
        let index = toBN(key);
        let proof = '';

        // An index of subtrees that are precomputed.
        let proofbits = new BigNumber(0)

        let siblingIndex;
        let siblingHash;
        for (let level=0; level < this.depth; level++) {
            siblingIndex = index.mod(2).eq(0) ? index.plus(1) : index.minus(1);

            siblingHash = this.tree[level][siblingIndex.toString()];

            if (siblingHash) {
                proof += siblingHash.replace('0x', '');

                // a.bincn(b) - add 1 << b to the number
                proofbits = bincn(proofbits, level);
            }

            index = index.dividedToIntegerBy(2);
        }

        // console.log(proofbits.toString(2))
        let buf = dehexify(toBuf(proofbits));
        let total = Buffer.concat([buf, Buffer.from(proof, 'hex')]);
        return '0x' + total.toString('hex');
    }

    verify(proof: string, keyBuf: string, leaf: string) {
        if(!leaf) throw new Error('leaf is null');

        let proofBuf = dehexify(proof)
        let index = toBN(keyBuf)

        let proofBits = toBN(hexify(proofBuf.slice(0, 32)))
        let computedHash: string = leaf;
        
        let p = 0;
        let proofElement: string;

        for(let d = 0; d < this.depth; d++) {
            if (proofBits.mod(2).isZero()) { // check if last bit of proofBits is 0
                proofElement = this.defaultNodes[d];
            } else {
                p += 32;
                if(p >= proofBuf.byteLength) throw new Error("proofBuf too short");
                proofElement = hexify(proofBuf.slice(p, p+32))
            }
            if (index.mod(2).isZero()) {
                computedHash = soliditySha3(computedHash, proofElement);
            } else {
                computedHash = soliditySha3(proofElement, computedHash);
            }
            proofBits = proofBits.dividedToIntegerBy(2); // shift it right for next bit
            index = index.dividedToIntegerBy(2);
        }
        
        if(computedHash !== this.root) {
            throw new Error(`${computedHash} != ${this.root}`)
        }
    }
}

export interface SparseMerkleProof {
    proofBitmap: string;
    proofNodes: string;
}

export function deconstructProof(proof: string): SparseMerkleProof {
    let proofBuf = dehexify(proof)

    let proofBitmap = hexify(proofBuf.slice(0, 32))
    let proofNodes = hexify(proofBuf.slice(32))
    return {
        proofBitmap,
        proofNodes
    }
}
