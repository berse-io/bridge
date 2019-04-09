import InterfaceBoilerPlate from './InterfaceBoilerPlate';
import { KeyPair } from './types';
import {mnemonicToSeedSync} from "bip39";
import hdkey from "hdkey";
import ethUtils from "ethereumjs-util";

class Web3Interface extends InterfaceBoilerPlate {

    generateKeyPairFromMnemonic(mnemonic: string) : KeyPair {
        // @ts-ignore
        const seed = mnemonicToSeedSync(mnemonic); //creates seed buffer
        // @ts-ignore
        const root = hdkey.fromMasterSeed(seed);
        // const masterPrivateKey = root.privateKey.toString('hex');
        const addrNode = root.derive("m/44'/60'/0'/0/0")
        const address = "0x" + ethUtils.privateToAddress(addrNode.privateKey).toString('hex');

        return(
            {
                address,
                privateKey: addrNode.privateKey.toString('hex')
            }
        )

    }

}

export default new Web3Interface();