import { createConnection, ConnectionOptions, Connection } from "typeorm";
import { Chain } from "./entity/chain";
import { InterchainStateUpdate } from "./entity/interchain_state_update";
import { ChainEvent } from "./entity/chain_event";
import { Provider } from '@loopback/context'

export let options: ConnectionOptions = {
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


export class DB {
    async connect() {
        
    }
}

export class DbService implements Provider<Connection> {
    conn: Connection;
    connOpts: any;

    constructor(connOpts: any) {
        this.connOpts = connOpts;
    }

    async value() {
        this.conn = await createConnection(this.connOpts);
        return this.conn;
    }
}