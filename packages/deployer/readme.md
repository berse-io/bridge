deployer 
========

Deploys things to chains.

## Usage
```
# deploys to a specific chain
NODE_ENV=production NETWORK=rinkeby yarn deploy

# deploys to all chains
NODE_ENV=production NETWORK=all yarn deploy

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
