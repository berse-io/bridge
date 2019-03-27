import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn} from "typeorm";
import { Chain } from "./chain";

@Entity()
export class Event {
    @PrimaryColumn()
    eventHash: string;

    @ManyToOne(type => Chain, chain => chain.events)
    @JoinColumn()
    chain: Chain;
}