import {KeyPair, ValidateResponse} from './Web3/types';

class InterfaceBoilerPlate {

    getAddress() : string {
        return "address";
    }

    send (from:string, to:string, amount:string, token:any, fee:number) { 

    }

    bridge (to : string, amount : string , targetChain : string ) {

    }

    generateKeyPairFromMnemonic (mnemonic :string) : KeyPair  {
        return(
            {
                address: "address",
                privateKey: "privateKey"
            }
        )
    }

    async getBalance(address:string, network: string): Promise<string> {
        return ""
    }


}

export default InterfaceBoilerPlate;