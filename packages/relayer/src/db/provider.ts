import { Provider, inject } from "@loopback/context";
import { Entity, Connection, createConnection, Repository, getRepository, BaseEntity } from "typeorm";
import { Chain } from "./entity/chain";
import { ChainEvent } from "./entity/chain_event";
import { InterchainStateUpdate } from "./entity/interchain_state_update";
import { Snapshot } from "./entity/snapshot";

export class DbConnProvider implements Provider<Connection> {
    connOpts: any;

    constructor(
        @inject('db.conn.opts') connOpts: any
    ) {
        this.connOpts = connOpts;
    }

    async value(): Promise<Connection> {
        let conn = await createConnection(this.connOpts);
        return conn;
    }
}

// export abstract class RepoProvider<T> implements Provider<Repository<T>> {
//     entityClass;
//     conn: Connection;

//     constructor(
//         @inject('db.conn') conn: Connection,
//     ) {
//         // throw new Error('123')
//         this.conn = conn;
//     }

//     value(): Repository<T> {
//         return getRepository(this.entityClass, this.conn.name)
//     }
// }

export class ChainRepoProvider {
    entityClass = Chain;

    constructor(
        @inject('db.conn') private conn: Connection,
    ) {
    }

    value(): Repository<Chain> {
        return getRepository(this.entityClass, this.conn.name)
    }
}

export class ChainEventRepoProvider {
    entityClass = ChainEvent;

    constructor(
        @inject('db.conn') private conn: Connection,
    ) {
    }

    value(): Repository<ChainEvent> {
        return getRepository(this.entityClass, this.conn.name)
    }
}

export class InterchainStateUpdateRepoProvider {
    entityClass = InterchainStateUpdate;

    constructor(
        @inject('db.conn') private conn: Connection,
    ) {
    }

    value(): Repository<InterchainStateUpdate> {
        return getRepository(this.entityClass, this.conn.name)
    }
}

export class SnapshotRepoProvider {
    entityClass = Snapshot;

    constructor(
        @inject('db.conn') private conn: Connection,
    ) {
    }

    value(): Repository<Snapshot> {
        return getRepository(this.entityClass, this.conn.name)
    }
}
