import { describe } from "mocha";

import EthMerklePatriciaTrie = require('merkle-patricia-tree/secure');
import { promisify } from "util";
import { keccak256 } from "ethereumjs-util";


const memdown = require('memdown')

// Promise-ified version of the merkle-patricia-tree
class MerklePatriciaTrie extends EthMerklePatriciaTrie {
    // get root() {
    //     return this.root
    // }

    constructor(db: any, root: Buffer | string) {
        super(db, root);
    }

    get(key: Buffer | string): Promise<Buffer | null> {
        return new Promise((res, rej) => {
            super.get(key, (err, val) => {
                if(err) rej(err);
                else res(val);
            })
        })
    }

    put(key: Buffer | string, val: Buffer | string): Promise<void> {
        
        if(!val) throw new Error("val undefined");
        return new Promise((res, rej) => {
            super.put(key, val, (err) => {
                if(err) rej(err);
                else res();
            })
        })
    }

    static prove(trie: EthMerklePatriciaTrie, key: string): Promise<Array<any>> {
        return new Promise((res, rej) => {
            EthMerklePatriciaTrie.prove(trie, key, (err, proof) => {
                if(err) rej(err);
                else res(proof);
            })
        })
    }

    static verifyProof(rootHash: Buffer, key: string, proof: Array<any>): Promise<string> {
        return new Promise((res, rej) => {
            EthMerklePatriciaTrie.verifyProof(rootHash, key, proof, (err, val) => {
                if(err) rej(err);
                else res(val);
            })
        })
    }
}


describe('Merkle Patricia State tree', async () => {
    it('does orig', async () => {

        // @ts-ignore
        let trie = new EthMerklePatriciaTrie()

        let k = '1';
        let v = '123123';

        trie.put(k, v, function () {
            trie.get(k, function (err, res) {
                console.log(err, res)
            })
        })

    })
    it('does', async () => {

        // level = require('level'),
        let db = memdown()
        db = null
        let trie = new MerklePatriciaTrie(db, null);
        

        
        
        // trie.put('test', 'one', function () {
        //     trie.get('test', function (err, value) {
        //         if(value) console.log(value.toString())
        //     });
        // });   
        // trie.put('test', '123');
        // trie.put('test', '123'); 
        
        // MerklePatriciaTrie.prove(trie, 'test', (err, proof) => {
        //     if(err) throw err;
        //     console.log(proof)
        //     MerklePatriciaTrie.verifyProof(trie.root, 'test', proof, (err, value) => {
        //         if(value) console.log(value.toString())
        //     })
        // })

        let keys = [];

        for(let x of [0,1,2]) {
            let k = Buffer.from(`${x}`)
            keys = [...keys, k]

            await trie.put(
                k,
                Buffer.from(`${x}`),
            )
            
        }

        console.log(keys)
        
        // await trie.put('test1', 'one')
        // await trie.put('test2', 'one')
        // await trie.put('test3', 'one')

        console.log((await trie.get(keys[0])))
        
        let proof = await MerklePatriciaTrie.prove(trie, 'test1')
        console.log(proof)
        await MerklePatriciaTrie.verifyProof(trie.root, 'test1', proof)
    })
})