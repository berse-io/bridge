
import ProviderEngine from 'web3-provider-engine';
import EthereumjsWallet from 'ethereumjs-wallet';
const FiltersSubprovider = require('web3-provider-engine/subproviders/filters');
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet');
// const VmSubprovider = require('web3-provider-engine/subproviders/vm.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker');
const SubscriptionsSubprovider = require('web3-provider-engine/subproviders/subscriptions');


class WalletProvider extends ProviderEngine {

    wallet: any;
    address: string;

    constructor(privateKey: string, rpcUrl: string) {

        super();

        this.wallet = EthereumjsWallet.fromPrivateKey(new Buffer(privateKey, "hex"));
        this.address = "0x" + this.wallet.getAddress().toString("hex");

        
        this.addProvider(new FiltersSubprovider());
        this.addProvider(new NonceSubprovider());
        // this.addProvider(new VmSubprovider())
        this.addProvider(new WalletSubprovider(this.wallet, {}));
        this.addProvider(new RpcSubprovider({ rpcUrl }));

          // Subscription
        const subscriptionSubprovider = new SubscriptionsSubprovider();
        subscriptionSubprovider.on('data', (err:any, notification:any) => {
            
            this.emit('data', err, notification);
        });
        this.addProvider(subscriptionSubprovider);

        this.start();
    }

}


export default WalletProvider;