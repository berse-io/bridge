import { IAccountsConfig } from "./types";
import { MnemonicWalletSubprovider, PrivateKeyWalletSubprovider } from '@0x/subproviders'



class AccountsConfig implements IAccountsConfig {
    data: any;
    addresses: [];
    providers: [];

    constructor(data, addresses, providers) {
        this.data = data;
        this.addresses = addresses;
        this.providers = providers;
    }

    static async load(data: any): Promise<AccountsConfig> {
        let addresses = [];
        let providers = [];

        async function loadAccount(accountConf) {
            if(accountConf.type == 'MnemonicWalletSubprovider') {
                let subprovider: MnemonicWalletSubprovider;
                subprovider = new MnemonicWalletSubprovider({
                    mnemonic: accountConf.mnemonic,
                    baseDerivationPath: accountConf.baseDerivationPath,
                });
        
                providers.push(
                    subprovider
                )
                addresses.push(
                    ...await subprovider.getAccountsAsync(1)
                )
        
            } else if(accountConf.type == 'PrivateKeyWalletSubprovider') {
                let subprovider: PrivateKeyWalletSubprovider;
                subprovider = new PrivateKeyWalletSubprovider(accountConf.privateKey);
        
                providers.push(
                    subprovider
                )
                addresses.push(
                    ...await subprovider.getAccountsAsync()
                )
        
            } else if(accountConf.type == 'donate') {
                addresses.push(
                    accountConf.address.toLowerCase()
                )
            } else {
                throw new Error(`unknown account type ${accountConf.type} - ${accountConf}`)
            }
        }

        for(let accountConf of data['*']) {
            await loadAccount(accountConf)
        }
        
        return new AccountsConfig(
            data,
            addresses,
            providers
        )
    }

    getAddresses(): string[] {
        return this.addresses
    }
}

export {
    AccountsConfig
}