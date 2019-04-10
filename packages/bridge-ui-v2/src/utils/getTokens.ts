import ethereumTokens from 'ethereum-lists/dist/tokens/eth/tokens-eth.json';


const getTokensObject = () => {
    let tokens:any[] = [];
    return(tokens.concat( addNetworkToTokens("Ethereum", ethereumTokens)));
}

export const tokens =  getTokensObject();


function addNetworkToTokens(network:string, tokens:any[]) {
 
    const tokenList =  tokens.map((token:any) => {
        
        // let found = false;

        // // @ts-ignore
        // for(let i = 0; i < balances.length; i ++ ){
        //     // @ts-ignore
        //     if(token.address.toLowerCase() == balances[i].contractAddress) {
        //         // @ts-ignore
        //         token.balance = fromWei(balances[i].balance).toString();
        //         found = true;
        //         break;
        //     }
        // }

        // if(!found){
        //     token.balance = "0";
        // }

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