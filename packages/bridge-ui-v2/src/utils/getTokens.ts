import ethereumTokens from 'ethereum-lists/dist/tokens/eth/tokens-eth.json';


const getTokensObject = () => {
    let tokens:any[] = [];
    tokens = tokens.concat( addNetworkToTokens("Ethereum", "Ether", "ETH" , ethereumTokens));
    tokens = tokens.concat( addNetworkToTokens("Ethereum Ropsten Testnet", "Ropsten Ether", "RETH" , []));
    tokens = tokens.concat( addNetworkToTokens("Ethereum Kovan Testnet", "Kovan Ether", "KETH" , []));

    return tokens;
}

export const tokens =  getTokensObject();


function addNetworkToTokens(network:string, nativeCurrencyName:string, nativeCurrencySymbol: string, tokens:any[]) {
 
    const tokenList =  tokens.map((token:any) => {
        token.network = network;
        return token;
    })

    // console.log(tokenList);

    let nativeToken = {
        "symbol": nativeCurrencySymbol,
        "name": nativeCurrencyName,
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
        "network": network
    }
    // @ts-ignore
    tokenList.unshift(nativeToken);

    return tokenList;
}

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