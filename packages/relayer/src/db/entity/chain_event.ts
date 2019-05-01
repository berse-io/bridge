import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, BaseEntity, PrimaryGeneratedColumn, OneToOne} from "typeorm";
import { Chain } from "./chain";
import { dehexify } from "@ohdex/shared";
import { InterchainStateUpdate } from "./interchain_state_update";

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

    // @OneToOne(InterchainStateUpdate, update => update.acknowledged)
    // ackdBy: InterchainStateUpdate;
    
    static getEventsBeforeTime(chainId: number, blockTime: number): Promise<ChainEvent[]> {
        return this.createQueryBuilder('event')
        .select('event.eventHash')
        .addSelect('event.blockTime')
        .leftJoinAndSelect("event.chain", "chain")
        .where('chain.chainId = :chainId', { chainId })
        .andWhere('event.blockTime <= :blockTime', { blockTime })
        .orderBy('event.blockTime', 'ASC')
        .getMany()
    }

    toBuf(): Buffer {
        return dehexify(this.eventHash)
    }
}