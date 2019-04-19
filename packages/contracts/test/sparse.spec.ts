import { toBN, bincn, toBuf } from "./sparse";
import { BigNumber } from "@0x/utils";
import { expect } from 'chai';
import { soliditySha3 } from "web3-utils";

describe('sparse mt', async () => {
    it('correctly shifts bits', async () => {
        let num = '0000'; // 0
        let target = '1000'; // 8

        // we want to set the fourth bit
        let bn = toBN(num)
        let bn2 = bincn(bn, 3);

        let bin = bn2.toString(2)
        expect(bin).to.eq(target)
    })

    it('correctly hex encodes a BigNumber as 32 byte hex string', async () => {
        let bn = new BigNumber(123);
        let buf = toBuf(bn)
        expect(buf).to.eq('0x000000000000000000000000000000000000000000000000000000000000007b')
    })

    it('parses hex into BigNumber', async () => {
        let hex = '0x000000000000000000000000000000000000000000000000000000000000007b'
        let x = new BigNumber(hex)
        expect(x.eq(123)).to.be.true;
    })

    it('hashes with the 0x prefix', async () => {
        let hash = soliditySha3('123')
        expect(hash.slice(0,2)).to.eq('0x');
    })
})