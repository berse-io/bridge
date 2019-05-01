config
======

Contains project-wide configuration of chains and accounts.

`*_accounts.json` contains the config of different accounts. This includes:
 - deployment accounts (for Ethereum)
 - relayer/validator account - for now, while we have a single relayer for MVP
 - 'donate' account - preloaded with $$ in ganache testchains
 - ... in future, accounts for different types of blockchains

`*_networks.json` contains the config to join different networks. This pertains to:
 - deployment addresses of contracts
 - rpcUrl's for connecting to the network


## TODO
```
"mainnet": {
    "chainId": 1,
    "chainType": "ethereum",
    "rpcUrl": "https://mainnet.infura.io/v3/3049535d150e49729f54f6f8bef40a1b"
},
"xdai": {
    "chainId": 100,
    "chainType": "ethereum",
    "rpcUrl": "https://dai.poa.network"
}
```