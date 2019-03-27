import { createConnection, ConnectionOptions, Connection } from "typeorm";
import { Chain } from "./entity/chain";
import { InterchainStateUpdate } from "./entity/interchain_state_update";
import { Event } from "./entity/event";

// get all events
let options: ConnectionOptions = {
    "type": "sqlite",
    "database": ":memory:",
    "synchronize": true,
    "logging": false,

    entities: [
        Chain,
        InterchainStateUpdate,
        Event
    ]
}


export class DB {
    conn: Connection;
    
    async connect() {
        this.conn = await createConnection(options);
    }
}
