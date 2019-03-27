import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn} from "typeorm";
import { Chain } from "./chain";

@Entity()
export class InterchainStateUpdate {
    @PrimaryColumn()
    id: number;

    @ManyToOne(type => Chain, u => u.stateUpdates)
    @JoinColumn()
    chain: Chain;

    @Column()
    blockTime: number;

    @Column()
    blockHash: string;

    @Column()
    stateRoot: string;
}