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

            let genesis = JSON.parse(readFileSync(join(projectRoot, 'geth_dev/genesis.template.json'), 'utf-8'))

            genesis.config.chainID = conf.chainId;

            for(let addr of accountsConf.getAddresses()) {
                genesis.alloc[addr] = {
                    balance: "0x8AC7230489E800000"
                }
            }


            spawnSync(`cp`, [`-R`, `geth_dev/*`, dbpath], { shell: true, cwd: projectRoot, stdio: 'inherit' })
            writeFileSync(join(dbpath, 'genesis.json'), JSON.stringify(genesis, null, 4))
            spawnSync('./init.sh', { cwd: dbpath, stdio: 'inherit' })
        }


        // --ws --wsapi 'eth,net,web3,admin,debug,personal,miner,txpool'
        spawnSync(
            'geth',
            `-v--nodiscover --ipcdisable --networkid ${conf.chainId} --datadir=devChain --unlock 7ef5a6135f1fd6a02593eedc869c6d41d934aef8,0x5409ed021d9299bf6814279a6a1411a7e866a631,0x6ecbe1db9ef729cbe972c83fb886247691fb6beb,0xe36ea790bc9d7ab70c55260c66d52b1eca985f84 --etherbase 7ef5a6135f1fd6a02593eedc869c6d41d934aef8 --password _pw.txt --port 0 --rpc --rpcapi eth,net,web3,admin,debug,personal,miner,txpool --rpcaddr localhost --rpcport ${conf.port} --rpccorsdomain '0.0.0.0' --mine`.split(' '),
            { cwd: dbpath, stdio: 'inherit' }
        );

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