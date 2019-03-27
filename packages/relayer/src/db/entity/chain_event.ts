import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, BaseEntity} from "typeorm";
import { Chain } from "./chain";

@Entity()
export class ChainEvent extends BaseEntity {
    @PrimaryColumn({ name: 'eventHash' })
    eventHash: string;

    @ManyToOne(type => Chain, chain => chain.events)
    @JoinColumn()
    chain: Chain;

    @Column()
    blockTime: number;
    
    static getEventsBeforeTime(chain: number, blocktime: number) {
        return []
    }
}