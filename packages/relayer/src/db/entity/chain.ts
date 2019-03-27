import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany} from "typeorm";
import { InterchainStateUpdate } from "./interchain_state_update";
import { Event } from "./event";

@Entity()
export class Chain {
    @PrimaryColumn()
    chainId: number;

    @OneToMany(type => Event, event => event.chain)
    events: Event[];

    @OneToMany(type => InterchainStateUpdate, u => u.chain)
    stateUpdates: InterchainStateUpdate[];
}