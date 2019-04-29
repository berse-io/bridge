multichain
==========

Multichain runs nodes for multiple blockchains.

 * loads and prefunds accounts specified in `config.accounts`
 * chain data is persisted (so no need to redeploy after restart)
 * runs Ganache and Geth chains
 * loads chainID from `config.networks`

## Usage

```
yarn start run --chain ethereum --name kovan
```

### Prefunding accounts

We can prefund three different types of accounts:

 * mneumonic-based
 * private-key - for testing in-browser with Metamask
 * addresses

This is intended to help with different testing scenarios. You can see an example of this configuration in `../config/test_accounts.json`.