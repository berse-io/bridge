### Geth Dev Network

With these simple tools, you can start a local clique-based dev-chain.

It will only mine a block, if a transaction has been submitted.

This is the coinbase address of our test chain, it is the one that is authorized to sign blocks
`0x7ef5a6135f1fd6a02593eedc869c6d41d934aef8`

#



#### Initialisation

With

``bash init.sh``

you will create a new blockchain according to the parameters set in your ``genesis_dev.json``

The ``utc`` keyfile will automatically be copied to the new keystore folder.

We need this account for geth to mine to.
#



#### Start the Blockchain

Use

``bash start.sh``

to start the blockchain. The coinbase account will be unlocked using the pw.txt file.

The dev chain will ow await transactions.
#



#### Usage

You can use the seedphrase in ```dev_seed.txt``` to import the 3 prefilled accounts into any application and start using them.
#



##### Good to know

The authorized signer address in this clique chain is set in the genesis file under "extraData"

It is important that the ```chainID``` in the genesis file and the ```--networkid``` in the geth starting command are the same! Here they are 1234

All fork block indicators in the genesis file are 0, because our chain started after those forks.



