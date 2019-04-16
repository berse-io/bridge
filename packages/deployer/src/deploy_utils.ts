import { Web3ProviderEngine, AbiDefinition, Provider } from "0x.js";
import { TxData } from "ethereum-types";

const assert = require('assert');
const linker = require('solc/linker')

let libraries = {}

type DeployArgs = [ string, AbiDefinition[], Provider, Partial<TxData> ]

import { SparseMerkleTreeContract } from '@ohdex/contracts/lib/build/wrappers/sparse_merkle_tree';
import { MerkleTreeVerifierContract } from '@ohdex/contracts/lib/build/wrappers/merkle_tree_verifier';

export async function deployLibraries(pe: any, account: string) {
    // Deploy libraries
    let sparseMerkleTree = await SparseMerkleTreeContract.deployAsync(
        ...getDeployArgs('SparseMerkleTree', pe, account)
    )

    let merkleTreeVerifier = await MerkleTreeVerifierContract.deployAsync(
        ...getDeployArgs('MerkleTreeVerifier', pe, account)
    )

    let bytesArrayUtil = await MerkleTreeVerifierContract.deployAsync(
        ...getDeployArgs('BytesArrayUtil', pe, account)
    )

    addLibrary('SparseMerkleTree', sparseMerkleTree.address)
    addLibrary('MerkleTreeVerifier', merkleTreeVerifier.address)
    addLibrary('BytesArrayUtil', bytesArrayUtil.address)
}

// For some reason the 0x/solc-compiler uses a different linking format than we'd like
// So we have to parse some stuff
export function addLibrary(name: string, address: string) {
    let artifact = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`);
    let metadata = JSON.parse(artifact.compilerOutput.metadata)
    
    // eg. "/Users/liamz/Documents/open-source/0dex/packages/contracts/contracts/MerkleTreeVerifier.sol": "MerkleTreeVerifier"
    let [k,v] = Object.entries(metadata.settings.compilationTarget)[0];
    let key = `${k}:${v}`;

    // eg.
    // libraryHashPlaceholder('/Users/liamz/Documents/open-source/0dex/packages/contracts/contracts/MerkleTreeVerifier.sol:MerkleTreeVerifier')
    // '$1eb98b648b444978ea3820de6fcdeb48d6$'


    
    // get the full path of this source
    // eg. /Users/liamz/Documents/open-source/0dex/packages/contracts/contracts/MerkleTreeVerifier.sol
    // let paths = Object.keys(metadata.sources);
    // paths.filter(path => path.endsWith(artifact.name))

    // let linkReferences = compilerOutput.evm.deployedBytecode.linkReferences;

    // libraries[name] = address;
    console.log(`Registered library ${name} to ${key}`)

    libraries[key] = address;
}

export function getDeployArgs(
    name: string, pe: Web3ProviderEngine, from: string,
    link = false
) : DeployArgs {
    // let json = require(`@ohdex/contracts/lib/build/contracts/${name}.json`);
    let json = require(`@ohdex/contracts/lib/build/artifacts/${name}.json`);
    let bytecode = json.compilerOutput.evm.bytecode.object;

    if(link) {
        bytecode = linker.linkBytecode(bytecode, libraries)
    }

    let abi = json.compilerOutput.abi;
    let provider = pe;

    assert.ok(bytecode.length > 0)
    assert.ok(abi.length > 0)
    assert.ok(from != "")

    return [
        bytecode,
        abi,
        provider,
        { from }
        // gas: 100000
    ]
}