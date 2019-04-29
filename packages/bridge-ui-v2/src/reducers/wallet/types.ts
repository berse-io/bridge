import {KeyPair} from '../../utils/coinInterfaces/Web3/types';

export interface WalletState {
    mnemonic: string,
    ethereum: KeyPair| undefined,
    tokens: Token[],
    trackedTransactions: TrackedTransaction[],
}


export interface TrackedTransaction {
    txID: string,
    network: string,
    confirmations: string,
    error: undefined|string,
}

export interface Token {
    symbol: string,
    name: string,
    network: string,
    balance: string,
    address: string,
}