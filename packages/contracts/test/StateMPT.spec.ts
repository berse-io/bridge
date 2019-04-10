import { describe } from "mocha";
import { assert, expect } from 'chai'

import EthMerklePatriciaTrie = require('merkle-patricia-tree/secure');
import { promisify } from "util";
import { keccak256 } from "ethereumjs-util";
import { MerklePatriciaProofContract } from "../build/wrappers/merkle_patricia_proof";
import { TrieProofsContract } from "../build/wrappers/trie_proofs"
import { loadWeb3, hexify } from "./helpers";
import { RLPContract } from "../build/wrappers/rlp";

import { BigNumber } from '0x.js'
import { SparseMerkleTree, toBN, deconstructProof } from "./sparse";
import { SparseMerkleTreeContract } from "../build/wrappers/sparse_merkle_tree"
import { soliditySha3 } from "web3-utils";
const memdown = require('memdown')

const utils = require('web3-utils');

const BN = require('bn.js')
function toBigNum(x: string) {
    return new BN(x);
}





// Promise-ified version of the merkle-patricia-tree
class MerklePatriciaTrie {
    public trie: EthMerklePatriciaTrie;
    // get root() {
    //     return this.root
    // }

    constructor(db: any, root: Buffer | string) {
        // super(db, root);
        this.trie = new EthMerklePatriciaTrie(db, root);
    }

    get(key: Buffer | string): Promise<Buffer | null> {
        return new Promise((res, rej) => {
            this.trie.get(key, (err, val) => {
                if(err) rej(err);
                else res(val);
            })
        })
    }

    put(key: Buffer | string, val: Buffer | string): Promise<void> {
        if(!val) throw new Error("val undefined");
        return new Promise((res, rej) => {
            this.trie.put(key, val, (err) => {
                if(err) rej(err);
                else res();
            })
        })
    }

    static prove(trie: MerklePatriciaTrie, key: string): Promise<Array<any>> {
        return new Promise((res, rej) => {
            EthMerklePatriciaTrie.prove(trie.trie, keccak256(key), (err, proof) => {
                if(err) rej(err);
                else res(proof);
            })
        })
    }

    static verifyProof(rootHash: Buffer, key: string, proof: Array<any>): Promise<string> {
        return new Promise((res, rej) => {
            EthMerklePatriciaTrie.verifyProof(rootHash, keccak256(key), proof, (err, val) => {
                if(err) rej(err);
                else res(val);
            })
        })
    }
}

describe.only("sparse merkle tree", async () => {
    const toKey = (x) => toBN(soliditySha3(x)).toString()

    const toInsecureKey = (x) => toBN(x).toString()

    const makeLeaves = (obj, keyFn=toInsecureKey) => {
        let x = {};

        Object.entries(obj).map( ([k, v]) => {
            let k_num = keyFn(k)
            x[k_num] = soliditySha3(v as any);
        })

        return x;
    }

    it('works', async () => {
        

        let state = makeLeaves({
            '123': 'abc',
            '124': 'cdf',
            '127': 'woah'
        })

        console.log(state)


        function checkProof(k, v, tree) {
            k = toInsecureKey(k)
            let leaf = soliditySha3(v as any);
            let proof = tree.createMerkleProof(k)
            tree.verify(proof, k, leaf);
        }

        let tree = new SparseMerkleTree(256, state)


        checkProof('123', 'abc', tree)
        checkProof('124', 'cdf', tree)
        checkProof('127', 'woah', tree)

        expect(() => {
            checkProof('127', 'abc', tree)
        }).to.throw()

        expect(() => {
            checkProof('123', 'unknown val', tree)
        }).to.throw()
    })

    it.only('validates with solidity', async () => {
        let chain1 = require("@ohdex/config").networks.kovan;
        let { pe, account } = await loadWeb3(chain1)

        let sparseMerkleTree = await SparseMerkleTreeContract.deployFrom0xArtifactAsync(
            require("@ohdex/contracts/build/artifacts/SparseMerkleTree.json"),
            pe,
            { from: account }
        )

        let state = makeLeaves({
            '123': 'abc',
            '124': 'cdf',
            '127': 'woah'
        }, toKey)
        let tree = new SparseMerkleTree(256, state)

        async function checkProof(contract: SparseMerkleTreeContract, k, v, tree, shouldSucceed) {
            let key = toKey(k)
            let leaf = soliditySha3(v as any);

            let proof = tree.createMerkleProof(key)
            let {
                proofBitmap,
                proofNodes
            } = deconstructProof(proof)
    
            // tree.verify(proof, key, leaf)

            let res = await contract.verify.callAsync(
                leaf,
                tree.root,
                toBN(key),
                proofBitmap,
                proofNodes
            )
            assert(res == shouldSucceed);
        }

        
        await checkProof(sparseMerkleTree, '123', 'abc', tree, true)
        await checkProof(sparseMerkleTree, '123', 'xxx', tree, false)
        await checkProof(sparseMerkleTree, '124', 'cdf', tree, true)
        
    })
})

// describe('Merkle Patricia State tree', async () => {
//     return;

//     it('does orig', async () => {

//         // @ts-ignore
//         let trie = new EthMerklePatriciaTrie()

//         const k = Buffer.from('foo')
//         const v = Buffer.from('bar')

//         trie.put('key1aa', '01234', function(err) {
//             if(err) throw err;

//             EthMerklePatriciaTrie.prove(trie, keccak256('key1aa'), function (err, prove) {

//                 if(err) throw err;
//             })
//         })

        

//     })

//     it.only('does', async () => {
//         let db = memdown() 
//         db = null;

//         let trie = new MerklePatriciaTrie(db, null);
//         await trie.put('123', 'abc')
//         await trie.put('123', 'ab2c')
//         await trie.put('124', 'abc')
//         await trie.put('424', 'abc')
//         let v = await trie.get('123')
//         console.log(v)

//         let proof = await MerklePatriciaTrie.prove(trie, '123')
//         let proofVal = await MerklePatriciaTrie.verifyProof(trie.trie.root, '123', proof)
//         console.log(`proofVal ${proofVal}`)

//         let chain1 = require("@ohdex/config").networks.rinkeby;

        // let { pe, account } = await loadWeb3(chain1)
        // let merklePatriciaProof = await MerklePatriciaProofContract.deployFrom0xArtifactAsync(
        //     require("@ohdex/contracts/build/artifacts/MerklePatriciaProof.json"),
        //     pe,
        //     { from: account }
        // );
//         let trieProofs = await TrieProofsContract.deployFrom0xArtifactAsync(
//             require("@ohdex/contracts/build/artifacts/TrieProofs.json"),
//             pe,
//             { from: account }
//         );
        

//         let adapter = new MerklePatriciaProofContractAdapter(merklePatriciaProof, trieProofs)
//         let verified = await adapter.prove(trie.trie.root, '123', proof, v)
//         console.log(`verified = ${verified}`)
//         assert(verified);
//     })
// })

// const RLP = require('rlp')

// class MerklePatriciaProofContractAdapter {
//     constructor(
//         private contract: MerklePatriciaProofContract,
//         private trieProofs: TrieProofsContract
//         ) {}

//     async prove(root: Buffer, key: string | Buffer, proof: Array<any>, value: Buffer) {
//         console.log(proof)
//         let proofRlp = RLP.encode(proof)
//         console.log('l', RLP.decode(proofRlp))
//         console.log(proofRlp.length)
//         let hashedKey = keccak256(key);
//         // let hashedKey = key;
        
//         // this.rlp.

//         console.log('key ',hashedKey.length)
//         console.log('root ',root.length)

//         /*
//         bytes32 rootHash,
//         bytes proofRLP,
//         bytes32 path32
//         */
//         console.log(
//             hexify(root),
//             hexify(proofRlp),
//             hexify(hashedKey)
//         )
//         let res = await this.trieProofs.verify.callAsync(
//             hexify(root),
//             hexify(proofRlp),
//             hexify(hashedKey)
//         )

//         // let res = await this.contract.verify.callAsync(
//         //     hexify(value), 
//         //     hexify(hashedKey),
//         //     hexify(proofRlp), 
//         //     hexify(root)
//         // )
//         return res;
//     }
// }