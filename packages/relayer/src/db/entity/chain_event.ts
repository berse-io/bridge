import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, BaseEntity, PrimaryGeneratedColumn} from "typeorm";
import { Chain } from "./chain";

@Entity()
export class ChainEvent extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    eventHash: string;

    @ManyToOne(type => Chain, chain => chain.events)
    @JoinColumn()
    chain: Chain;

    @Column()
    blockTime: number;
    
    static getEventsBeforeTime(chainId: number, blockTime: number): Promise<ChainEvent[]> {
        return this.createQueryBuilder('event')
        .select('event.eventHash')
        .addSelect('event.blockTime')
        .leftJoinAndSelect("event.chain", "chain")
        .where('chain.chainId = :chainId', { chainId })
        .andWhere('event.blockTime <= :blockTime', { blockTime })
        .orderBy('blockTime', 'DESC')
        .getMany()
    }
}