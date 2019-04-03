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
