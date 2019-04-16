function firstIndexOf(buf: Buffer, arr: Buffer[]) {
	for (let i = 0; i < arr.length; i++) {
		if (buf.equals(arr[i])) {
			return i;
		}
	}

	return -1;
}

let debug = false;

// Protection against second preimage attacks
// See https://flawed.net.nz/2018/02/21/attacking-merkle-trees-with-a-second-preimage-attack/
const LEAF_PREFIX = Buffer.from('00', 'hex');
const BRANCH_PREFIX = Buffer.from('01', 'hex');
export const EMPTY_BYTE32 = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
// export const EMPTY_BYTES32 = Buffer.alloc(32);

type HashFunction = (buf: Buffer) => Buffer;
type MerkleTreeProof = {
	root: Buffer;
	leaf: Buffer;
	proofs: Buffer[];
	paths: boolean[];
}


import { keccak256 } from 'ethereumjs-util';

class MerkleTree {
	items: Buffer[];
	layers: Buffer[][];
	nLayers: number;
	hashFn: (buf: Buffer) => Buffer;
	hashSizeBytes: number;

	constructor(items: Buffer[], hashFn: HashFunction = keccak256) {
		this.hashFn = hashFn;
		this.hashSizeBytes = hashFn(BRANCH_PREFIX).byteLength;

		items.map((x,i) => {
			if(i !== firstIndexOf(x, items)) throw new Error(`duplicate at ${i}`)
		})
		this.items = items;
		
		// And compute tree
		this.computeTree(items);
	}

	get leaves(): Buffer[] {
		return this.layers[0];
	}

	root(): Buffer {
		if (this.leaves.length == 0) throw new Error("no leaves in tree");
		return this.layers[this.nLayers - 1][0];
	}

	hashLeaf(leaf: Buffer): Buffer {
		return hashLeaf(this.hashFn, leaf);
	}

	hashBranch(left, right: Buffer): Buffer {
		if (left.byteLength != this.hashSizeBytes || right.byteLength != this.hashSizeBytes) {
			throw new Error("branches should be of hash size already");
		}
		return hashBranch(this.hashFn, left, right)
	}

	// Finds the index of a leaf from an item
	findLeafIndex(item: Buffer): number {
		let idx = firstIndexOf(this.hashLeaf(item), this.layers[0]);
		if(idx == -1) throw new Error('item not found');
		return idx
	}

	// Finds the leaf from an item
	findLeaf(item: Buffer): Buffer {
		return this.layers[0][this.findLeafIndex(item)]
	}

	generateProof(idx: number): MerkleTreeProof {
		let proofs: Buffer[] = new Array(this.nLayers - 1);
		let paths = [];
		let leaf = this.layers[0][idx]

		for (let i = 0; i < proofs.length; i++) {
			let isLeftNode = idx % 2 === 0;
			paths.push(!isLeftNode);

			const pairIdx = isLeftNode ? idx + 1 : idx - 1;
			proofs[i] = this.layers[i][pairIdx];
			idx = Math.floor(idx / 2);
		}

		return { proofs, paths, leaf, root: this.root() }
	}

	verifyProof(proof: MerkleTreeProof) {
		if (proof.proofs.length != this.nLayers - 1) {
			throw new Error(`${proof.proofs.length} proof nodes, but only ${this.nLayers} layers in tree`)
		}
		if(firstIndexOf(proof.leaf, this.layers[0]) == -1) {
			throw new Error(`Leaf doesn't exist in original tree`);
		}
		return verifyProof(this.hashFn, proof, this.root(), proof.leaf);
	}

	private computeLayer(layer: Buffer[]): Buffer[] {
		if(layer.length == 1) throw new Error("Layer too small, redundant call")

		let nextLayer: Buffer[] = new Array<Buffer>(layer.length / 2);

		for(let i = 0; i < nextLayer.length; i++) {
            let left = i * 2;
            let right = left + 1;
            nextLayer[i] = this.hashBranch(layer[left], layer[right]);
        }

        return nextLayer;
	}
	
	private computeTree(items: Buffer[]): Buffer[][] {
		// let layers: Buffer[][] = new Array<Buffer[]>(this.nLayers);
		let leaves = getBalancedLayer(items).map(item => this.hashLeaf(item))

		let layer = leaves;
		let layers = [ layer ];

        while(layer.length > 1) {
			layer = this.computeLayer(layer);
			layers.push(layer)
        }

		this.layers = layers;
		this.nLayers = this.layers.length;
		
		return layers;
	}

	toString() {
		let str = "";
		
		let j = 0;

		this.layers.map((layer, i) => {
			str += `Layer ${i} - \n`;
			
			for (let node of layer) {
				str += '\t ' + node.toString('hex');
				if(i == 0) {
					if(j < this.items.length)
						str += '\t' + this.items[j++].toString('hex')
				}
				str += '\n';
			}
		})
		return str;
	}
}


function hashLeaf(hashFn: HashFunction, leaf: Buffer): Buffer {
	return hashFn(Buffer.concat([LEAF_PREFIX, leaf]))
}

function hashBranch(hashFn: HashFunction, left: Buffer, right: Buffer): Buffer {
	return hashFn(Buffer.concat([BRANCH_PREFIX, left, right]))
}

export function getBalancedLayer(items: Buffer[]) {
	// Edge case:
	// When there is only one item, we return a layer of 2 nodes
	// This is a deliberate design decision:
	// - we want second-preimage resistance (ie different prefixes for leaves and branches)
	// - so we return two nodes here, so the logic later can do both hashes
	// - otherwise we'd have to complexify the design in worse ways

	
	// compute the balanced layer
	// powerOf2Size =  2^log2(items.length)          n > 1
	//    			   2                             n = 1
	let powerOf2Size = Math.pow(2, Math.ceil(Math.log2(
		items.length
	)));
	if(items.length === 1) powerOf2Size = 2;

	let layer = new Array<Buffer>(powerOf2Size);

	for(let i = 0; i < layer.length; i++) {
		if(i < items.length) {
			layer[i] = items[i];
		} else {
			// The rest of the leaves are empty.
			layer[i] = EMPTY_BYTE32;
		}
	}

	return layer;
}

function verifyProof(hashFn: HashFunction, proof: MerkleTreeProof, root: Buffer, leaf: Buffer) {
	let node = leaf;

	// node > proof
	// node.compare(proof[0]) == 1
	let { proofs, paths } = proof;

	for (let i = 0; i < proofs.length; i++) {
		let pairNode = proofs[i];

		if(debug) {
			console.log(`Verifying layer ${i}`)
			console.log(`\t`, node)
			console.log(`\t`, pairNode)
		}

		if(paths[i]) {
			node = hashBranch(hashFn, pairNode, node)
		} else {
			node = hashBranch(hashFn, node, pairNode)
		}
	}

	if(debug) {
		console.log(`Verify root`)
		console.log('\t', root)
		console.log('\t', node)
	}

	return root.equals(node);
}

export {
	MerkleTree,
	MerkleTreeProof,
	hashLeaf,
	hashBranch,
	verifyProof,
	LEAF_PREFIX,
	BRANCH_PREFIX,
	HashFunction
};