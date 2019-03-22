import ethereumTokens from 'ethereum-lists/dist/tokens/eth/tokens-eth.min.json';
import axios from 'axios';
import { fromWei } from 'web3-utils';
import Web3 from 'web3';

const apis = {
    "Ethereum": "https://blockscout.com/eth/mainnet/api"
}

const rpcs = {
    "Ethereum": "https://mainnet.infura.io/v3/076b582fd6164444af0b426614496e15",
}


const getTokens = async() => {
    let tokens:any[] = [];

    tokens = await getTokensObject();
    return tokensObjectToArray(tokens);
}

const getTokensObject = async() => {
    let tokens:any[] = [];
    return(tokens.concat(await addNetworkToTokens("Ethereum", ethereumTokens)));
}

function tokensObjectToArray(tokens:any[]){
    return tokens.map((token) => {
        return [token.symbol, token.name, token.network, token.balance, token.address]
    })    
}

async function addNetworkToTokens(network:string, tokens:any[]) {

    let balances = await axios({
            method:'get',
            // @ts-ignore
            url: apis[network],
            params: {
                module: 'account',
                action: 'tokenlist',
                // @ts-ignore
                address: window.web3.eth.accounts[0]
            }
    })
    
    balances = balances.data.result;
    
    const tokenList =  tokens.map((token:any) => {
        
        let found = false;

        // @ts-ignore
        for(let i = 0; i < balances.length; i ++ ){
            // @ts-ignore
            if(token.address.toLowerCase() == balances[i].contractAddress) {
                // @ts-ignore
                token.balance = fromWei(balances[i].balance).toString();
                found = true;
                break;
            }
        }

        if(!found){
            token.balance = "0";
        }

        token.network = network;
        return token;
    })

    // console.log(tokenList);

    let nativeToken = {
        "symbol": "ETH",
        "name": "Ether",
        "type": "native",
        "address": "native",
        "ens_address": "",
        "decimals": 18,
        "website": "",
        "logo": {
          "src": "",
          "width": "10",
          "height": "10",
          "ipfs_hash": ""
        },
        "support": {
          "email": "",
          "url": ""
        },
        "social": {
          "blog": "",
          "chat": "",
          "facebook": "",
          "forum": "",
          "github": "",
          "gitter": "",
          "instagram": "",
          "linkedin": "",
          "reddit": "",
          "slack": "",
          "telegram": "",
          "twitter": "",
          "youtube": ""
        },
        "balance": "0",
        "network": "Ethereum"
    }

    // @ts-ignore
    const web3 = new Web3(rpcs[network]);
    // @ts-ignore
    nativeToken.balance = fromWei(await web3.eth.getBalance(window.web3.eth.accounts[0]));
    tokenList.push(nativeToken);

    return tokenList;
}

export default getTokens;

export const getToken = async (address:string, network:string) =>  {
    const tokens = await getTokensObject();

    console.log(address, network);

    for(let token in tokens) {
        const tokenObject = tokens[token];
        if(tokenObject.address.toLowerCase() == address.toLowerCase() && tokenObject.network.toLowerCase() == network.toLowerCase() ) {
            return tokenObject;
        }
    }

    return null;
}