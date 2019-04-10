declare module 'merkle-patricia-tree/secure' {
    type key = Buffer | string;
    type TrieNode = any;

    class Trie extends MerkleProof {
        constructor(db: any, root: Buffer | string);
        public root: Buffer;

        get(key: key, cb: (err: Error, val: Buffer | null) => void);
        put(key: key, val: Buffer | string, cb: (err: Error) => void);
    }

    class MerkleProof {
        static prove(trie: Trie, key: string | Buffer, cb: (err: Error, proof: Array<TrieNode>) => void);
        static verifyProof(rootHash: Buffer, key: string | Buffer, proof: Array<TrieNode>, cb: (err: Error, val: string) => void);
    }

    export = Trie;
}


