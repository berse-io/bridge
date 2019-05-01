deployer 
========

Deploys the smart contracts to multiple Ethereum blockchains.

 * links libraries into sol-compiler bytecode using 0x ([tutorial](https://dev.to/liamzebedee/how-to-link-libraries-into-solidity-contracts-generated-by-sol-compiler-34b3))
 * deploys to networks specified in the `config.networks`
 * deploys with accounts in `config.accounts`
 * saves deployed contract addresses back to the `config.networks`

## Usage

```
# deploys to a specific chain
$ NODE_ENV=production NETWORK=rinkeby yarn deploy

# deploys to all chains
$ NODE_ENV=production NETWORK=all yarn deploy

# get info on accounts
$ NODE_ENV=production yarn debug

mainnet  0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (0 ETH)
ropsten  0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (1.04522071 ETH)
kovan    0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (2.036567114084348497 ETH)
rinkeby  0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (17.733787724932310539 ETH)
poaSokol         0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (1.442396979468700509 ETH)
goerli   0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (0.05 ETH)
xdai     0xb2fbcd12c58ef05e22de310885b3635e5c5e8c14 (0 ETH)
```

### Arguments

 - `NODE_ENV`: selects which configuration to use. **Values**: `development`, `production`
 - `NETWORK`: a network keyed in `networks`, eg. `kovan`. Can also specify `all` which attempts to deploy to all networks.

