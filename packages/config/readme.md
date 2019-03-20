# config
`*_accounts.json` contains the config of different accounts. This includes:
 - deployment accounts (for Ethereum)
 - relayer/validator account - for now, while we have a single relayer for MVP
 - 'donate' account - preloaded with $$ in ganache testchains
 - ... in future, accounts for different types of blockchains

`*_networks.json` contains the config to join different networks. This pertains to:
 - deployment addresses of contracts
 - rpcUrl's for connecting to the network