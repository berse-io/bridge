import { MerkleTree } from "../src";
const AbiCoder = require('web3-eth-abi').AbiCoder();

// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { Web3ProviderEngine } from "0x.js";
import { AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';

declare module 'ethereumjs-util' {
    function keccak256(x: any): Buffer;
}

function getDeployArgs(name: string, pe: Provider, from: string): [ string, AbiDefinition[], Provider, Partial<TxData>] {
    let json = require(`../../build/artifacts/${name}.json`);
    let bytecode = json.compilerOutput.evm.bytecode.object;
    let abi = json.compilerOutput.abi;
    let provider = pe;
    console.log(from)

    return [
        bytecode,
        abi,
        provider,
        { from }
    ]
}

class TestTreeFactory {
    static itemsToBuffer(items: string[][]): Buffer[] {
        let itemsBuf: Buffer[] = [
            ...items.map(item => AbiCoder.encodeParameter('uint256', item))
        ].map(item => item.slice(2)).map(item => Buffer.from(item, 'hex'))
        return itemsBuf;
    }

    static newTree(items: string[][]): MerkleTree {
        let tree = new MerkleTree(
            this.itemsToBuffer(items),
            keccak256
        );
        return tree;
    }
}

function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

function prefix0x(x: string): string {
    return `0x${x}`;
}


function waitUntilConnected(pe: Web3ProviderEngine): Promise<any> {
    return new Promise((res, rej) => {
        pe.on('block', res)
        setTimeout(rej, 2000)
    });
}

export {
    getDeployArgs,
    TestTreeFactory,
    hexify,
    prefix0x,
    keccak256,
    waitUntilConnected
}