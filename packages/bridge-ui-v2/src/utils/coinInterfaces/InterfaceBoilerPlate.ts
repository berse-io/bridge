import {KeyPair} from './types';

class InterfaceBoilerPlate {

    getAddress() : string {
        return "address";
    }

    send(to : string, amount : string) {

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

}

export default InterfaceBoilerPlate;