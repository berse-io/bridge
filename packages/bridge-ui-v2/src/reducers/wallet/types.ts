import {KeyPair} from '../../utils/coinInterfaces/Web3/types';

export interface WalletState {
    mnemonic: string,
    ethereum: KeyPair| undefined,
    tokens: Token[],
}

export interface Token {
    symbol: string,
    name: string,
    network: string,
    balance: string,
    address: string,
}