
const productionNetworks = {
    "Ethereum": "ethereum",
    "Ethereum Ropsten Testnet": "ropsten",
    "Ethereum Kovan Testnet": "kovan",
    "Ethereum Rinkeby Testnet": "rinkeby",
    "Ethereum Goerli Testnet": "goerli",
    "PepChain Testnet": "pepchainChurchill",
    "POA SOKOL Testnet": "poaSokol",
    "XDAI": "xdai",
}

let testingNetworks = process.env.NODE_ENV == 'development' ? 
    {
        "Fake Kovan": "kovan",
        "Fake Rinkeby": "rinkeby",
    }
    :
    {

    }


export default {
    ...productionNetworks,
    ...testingNetworks
}