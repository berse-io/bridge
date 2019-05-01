import {Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, BaseEntity, PrimaryGeneratedColumn, OneToOne} from "typeorm";
import { Chain } from "./chain";
import { dehexify } from "@ohdex/shared";
import { InterchainStateUpdate } from "./interchain_state_update";
import { StateTree, EventTree } from "../../interchain/trees";

@Entity()
export class Snapshot extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(
        type => Chain, chain => chain.snapshots,
        { nullable: false }
    )
    chain: Chain;

    @OneToOne(
        type => InterchainStateUpdate, update => update.snapshot, 
        { nullable: true }
    )
    @JoinColumn()
    update: InterchainStateUpdate;

    @Column({
        type: "text",
        transformer: {
            from(value: string): StateTree {
                return StateTree.dsz(value);
            },
            to(value: StateTree): string {
                return value.sz();
            }
        }
    })
    stateTree: StateTree;

    @Column()
    stateRoot: string;

    cleanDangling() {
        // TODO(liamz)
    }
    
}