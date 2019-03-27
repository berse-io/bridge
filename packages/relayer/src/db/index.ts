import { createConnection, ConnectionOptions, Connection } from "typeorm";
import { Chain } from "./entity/chain";
import { InterchainStateUpdate } from "./entity/interchain_state_update";
import { ChainEvent } from "./entity/chain_event";

// get all events
let options: ConnectionOptions = {
    "type": "sqlite",
    "database": ":memory:",
    "synchronize": true,
    "logging": false,
    "name": "default",

    entities: [
        Chain,
        InterchainStateUpdate,
        ChainEvent
    ]
}

let conn: Connection;

var AsyncLock = require('async-lock');
var lock = new AsyncLock();
export class DB {
    async connect() {
        conn = await createConnection(options);
        // await lock.acquire('key', new Promise((res,rej) => {
        //     const f = async () => {
        //         if(!conn) {
        //             conn = await createConnection(options);
        //         }
        //     }
        //     // @ts-ignore
        //     f().then(res).catch(rej)
        // }))
    }
}
