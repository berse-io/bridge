import InterfaceBoilerPlate from './InterfaceBoilerPlate';
import { KeyPair } from './types';
import {mnemonicToSeedSync} from "bip39";
import hdkey from "hdkey";
import ethUtils from "ethereumjs-util";
import Web3 from 'web3';
import nameToNetwork from '../nameToNetwork';
import networks from  "@ohdex/config/networks.json";

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

    async getBalance(address:string, network: string, token: string = "native"): Promise<string> {
        const config = networks[nameToNetwork[network]];
        const web3 = new Web3(config.rpcUrl);
        if(token == "native") {
            return  (web3.utils.fromWei(await web3.eth.getBalance(address)).toString());        
        }
        return "1337";
        // TODO implement tokens        
    }

}

export default new Web3Interface();