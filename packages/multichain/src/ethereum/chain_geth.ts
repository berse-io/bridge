import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { IAccountsConfig, IChain, IChainConfig } from "../types";


export class EthereumChainGeth implements IChain {
    gethServer: any;

    generateGenesis() {
        
    }

    async start(conf: IChainConfig, accountsConf: IAccountsConfig): Promise<any> {
        // load persistently
        let projectRoot = resolve(dirname(require.resolve(`@ohdex/multichain`)), '../../')
        console.log(projectRoot)
        let dbpath = resolve(projectRoot, `db/${conf.chainId}`)
        
        let firstStart = !existsSync(dbpath)

        if(firstStart) {
            // mkdirSync(dbpath)
            spawnSync(`mkdir`, ['-p', dbpath])
            spawnSync(`rm`, [ join(dbpath, 'geth/LOCK') ])
            spawnSync(`rm`, [ join(dbpath, 'geth/chaindata/LOCK') ])

            let genesis = JSON.parse(readFileSync(join(projectRoot, 'geth_dev/genesis_dev.json'), 'utf-8'))

            genesis.config.chainID = conf.chainId;

            for(let addr of accountsConf.getAddresses()) {
                genesis.alloc[addr] = {
                    balance: "0x8AC7230489E800000"
                }
            }


            spawnSync(`cp`, [`geth_dev/*`, dbpath], { shell: true, cwd: projectRoot, stdio: 'inherit' })
            writeFileSync(join(dbpath, 'genesis.json'), JSON.stringify(genesis, null, 4))
            spawnSync('./init.sh', { cwd: dbpath, stdio: 'inherit' })
        }

        // --ws --wsapi 'eth,net,web3,admin,debug,personal,miner,txpool'
        spawnSync(
            'geth',
            `--nodiscover --ipcdisable --networkid ${conf.chainId} --datadir=devChain --unlock 7ef5a6135f1fd6a02593eedc869c6d41d934aef8 --password _pw.txt --port 0 --rpc --rpcaddr localhost --rpcport ${conf.port} --rpccorsdomain '0.0.0.0'  --mine`.split(' '),
            { cwd: dbpath, stdio: 'inherit' }
        )

        
        // let pe = new Web3ProviderEngine();
        // pe.addProvider(new RPCSubprovider(`http://127.0.0.1:${conf.port}`, 300))
        // pe.on('error', () => {
        //     console.log(arguments)
        // })
        // pe.start()
        // let web3 = new Web3Wrapper(pe);

        // let addresses = await web3.getAvailableAddressesAsync()

        // firstStart = true;
        // if(firstStart) {
        //     console.log(`Funding accounts`)
    
        //     for(let addr of accountsConf.getAddresses()) {
        //         await web3.awaitTransactionSuccessAsync(
        //             await web3.sendTransactionAsync({
        //                 from: addresses[0],
        //                 to: addr,
        //                 value: DEFAULT_BALANCE_ETHER
        //             })
        //         )
        //     }
        //     pe.stop()
        // }

        console.log("");
        console.log("Accounts");
        console.log("===============\n");
        accountsConf.getAddresses().map((account, i) => {
            console.log(`(${i}) `, account)
        })

        console.log(`Running!`)
    }

    async stop() {
        return this.gethServer.stop();
    }
}