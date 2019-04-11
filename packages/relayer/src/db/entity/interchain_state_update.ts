import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, BaseEntity, PrimaryGeneratedColumn} from "typeorm";
import { Chain } from "./chain";
import { ChainEvent } from "./chain_event";

@Entity()
export class InterchainStateUpdate extends BaseEntity {
    @PrimaryGeneratedColumn()
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

    @Column()
    eventRoot: string;

    // @Column({ nullable: true })
    // acksUntil: ChainEvent;

    static getLatestStaterootAtTime(chainId: number, blockTime: number) {
        return this.createQueryBuilder('update')
        .select('update.blockTime')
        .addSelect('update.blockHash')
        .addSelect('update.stateRoot')
        .addSelect('update.chain')
        .addSelect('update.id')
        .addSelect('update.eventRoot')
        .leftJoinAndSelect("update.chain", "chain")
        .where('chain.chainId = :chainId', { chainId })
        .andWhere('update.blockTime <= :blockTime', { blockTime })
        .orderBy('blockTime', 'DESC') // most recent
        .limit(1)
        .getOne();
    }
}