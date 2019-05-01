import InterfaceBoilerPlate from '../InterfaceBoilerPlate';
import { KeyPair } from './types';
import {mnemonicToSeedSync} from "bip39";
import hdkey from "hdkey";
import ethUtils from "ethereumjs-util";
import Web3 from 'web3';
import {BN, toBN, fromWei, toWei} from "web3-utils";
import nameToNetwork from '../../nameToNetwork';
import networks from  "@ohdex/config/networks.json";
import testingNetworks from "@ohdex/config/test_networks.json";

import ERC20ABI from './ERC20.json';
import BridgeABI from '@ohdex/contracts/build/artifacts/Bridge.json';
import {Accounts} from 'web3-eth-accounts';
import PrivateKeyProvider from './WalletProvider';

class Web3Interface extends InterfaceBoilerPlate {


    Web3Instances:any = {};

    constructor() {
        super();
        this.getBalance = this.getBalance.bind(this);
        this.getBalanceWei = this.getBalanceWei.bind(this);
        this.send = this.send.bind(this);
        this.bridge = this.bridge.bind(this);
    }
 
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


    async getBalanceWei(address:string, network:string, token:string):Promise<BN> {
        const web3 = this.getWeb3(network);

        // @ts-ignore;
        web3.provider.start();

        let balance : BN; 

        if(token == "native") {
            balance = toBN(await web3.eth.getBalance(address));        
        }else{
            const tokenContract = new web3.eth.Contract(ERC20ABI, token);
            balance = toBN(await tokenContract.methods.balanceOf(address).call());
        }
        // @ts-ignore;
        web3.provider.stop();
        return balance;
    }

    async getBalance(address:string, network:string, token:string = "native"): Promise<string>  {
        const balance = await this.getBalanceWei(address, network, token);
        // TODO handle non 18 decimals tokens
        return fromWei(balance).toString();
    }

    async send (from:string, to:string, amount:string, token:any, fee:number) {
        const web3 = this.getWeb3(token.network);
        let receipt:any;
        console.log(token);
        console.log(fee);
        if(token.address == "native") {

            const txParams = {
                value: toBN(toWei(amount)).toString(),
                to,
                data: '',
                gasLimit: 21000,
                gasPrice: (fee * 1000000000).toString(),
                from,
            }

        
            receipt = await web3.eth.sendTransaction(txParams)
            
        } else {
            const tokenContract = new web3.eth.Contract(ERC20ABI, token.address);
            receipt = await tokenContract.methods.transfer(to, toBN(toWei(amount)).toString()).send({from});
        }

        console.log(receipt);

    }

    async bridge(from:string, to:string, amount:string, token:any, targetChain:string, fee:number, salt:string, successCallback : (event:any) => {})  {

        console.log(token);

        const web3 = this.getWeb3(token.network);
        const web3B = this.getWeb3(targetChain);

        let configA = networks[nameToNetwork[token.network]];
        let configB = networks[nameToNetwork[targetChain]];

        // Overwrite config when using fake networks
        if(token.network.indexOf("Fake") != -1) {
            configA = testingNetworks[nameToNetwork[token.network]];
        }
        if(targetChain.indexOf("Fake") != -1) {
            configB = testingNetworks[nameToNetwork[targetChain]];
        }

        if(token.address == "native") {
            throw(new Error("Bridging native tokens is not yet supported"));
        } else {
            const tokenContract = new web3.eth.Contract(ERC20ABI, token.address);
            const bridgeContract = new web3.eth.Contract(BridgeABI.compilerOutput.abi, configA.bridgeAddress);
            const bridgeContractB = new web3B.eth.Contract(BridgeABI.compilerOutput.abi, configB.bridgeAddress);

            const gasPrice = (fee * 1000000000).toString();

           

            // function isBridgedToken(
            //     address _bridgedToken,
            //     uint256 _originChainId,
            //     address _originBridge
            // )

            const isBridgedToken = await bridgeContract.methods.isBridgedToken(token.address, configB.chainId, configB.bridgeAddress).call();

            if(isBridgedToken) {
                // this is a bridged token being bridged back
            }
            else {

                console.log(configA.bridgeAddress);
                // callback triggered on successfull claim
                // bridgeContractB.events.Withdrawal({}, successCallback);

                // this is a token being bridged to a foreign chain
                const approveReceipt = await tokenContract.methods.approve(configA.bridgeAddress, toWei(amount).toString()).send({from, gasPrice});
                const bridgeReceipt = await bridgeContract.methods.deposit(
                    token.address, 
                    to, 
                    toWei(amount).toString(), 
                    salt,
                    configB.chainId,
                    configB.bridgeAddress
                ).send({from, gasPrice})

                console.log(approveReceipt);
                console.log(bridgeReceipt);
            }

        }

    }


    addWeb3Instance(network: string, privateKey: string) {
        let config:any;

        if(network.indexOf("Fake") != -1) {
            config = testingNetworks[nameToNetwork[network]];
        } else {
            config = networks[nameToNetwork[network]];
        }
         
        const Provider = new PrivateKeyProvider(privateKey, config.rpcUrl);
        this.Web3Instances[network] = new Web3(Provider, null, { transactionConfirmationBlocks: 1 });
        this.Web3Instances[network].provider = Provider;
    }

    getWeb3(network:string): Web3 {

        console.log(network);
        // const config = networks[nameToNetwork[network]];
  
        // if(privateKey === undefined) {
        //     return new Web3(config.rpcUrl);
        // }
        // return new Web3(new PrivateKeyProvider(privateKey, config.rpcUrl));

        return this.Web3Instances[network];
    }

}

export default new Web3Interface();