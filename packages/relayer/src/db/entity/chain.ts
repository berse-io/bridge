import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import { InterchainStateUpdate } from "./interchain_state_update";
import { ChainEvent } from "./chain_event";

@Entity()
export class Chain {
    // @PrimaryGeneratedColumn()
    // id: number;
    
    @PrimaryColumn()
    chainId: number;

    @OneToMany(type => ChainEvent, event => event.chain)
    events: ChainEvent[];

    @OneToMany(type => InterchainStateUpdate, u => u.chain)
    stateUpdates: InterchainStateUpdate[];
}