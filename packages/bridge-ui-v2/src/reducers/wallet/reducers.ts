import actionTypes from './actionTypes';
import {WalletState} from './types';
import Web3Interface from '../../utils/coinInterfaces/Web3/Web3Interface';


// export interface Token {
//     symbol: string,
//     name: string,
//     network: string,
//     balance: string,
//     address: string,
// }

const initialState : WalletState = {
    mnemonic: "",
    ethereum: undefined,
    tokens: [
        {
            symbol: "ETH",
            name: "Ether",
            network: "Ethereum",
            balance: "0",
            address: "native",
        }
    ],
};

const mapping = {
    [actionTypes.ADD_TOKEN]: (state:WalletState, action:any) => ({
        ...state,
        tokens: [
            ...state.tokens,
            action.token,
        ]
    }),
    [actionTypes.REMOVE_TOKEN]: (state:WalletState, action:any) => ({
        ...state,
        tokens: [
            ...state.tokens.slice(0, action.tokenIndex),
            ...state.tokens.slice(action.tokenIndex + 1)
        ]
    }),
    [actionTypes.SET_TOKEN_BALANCE]: (state:WalletState, action:any) => ({
        ...state,
        tokens: state.tokens.map((item, index) => {
            if(index == action.tokenIndex) {
                item.balance = action.balance;
            }
            return item
        })
    })    
};

function setupWallet(state:WalletState, mnemonic:string) : WalletState {

    const keyPair = Web3Interface.generateKeyPairFromMnemonic(mnemonic);

    return {
        ...state,
        mnemonic,
        ethereum: keyPair
    }

}

function reducer(state = initialState, action:any) {
    let newState = state;

    if(action.type == actionTypes.SET_MNEMONIC) {
        newState = setupWallet(state, action.mnemonic)
    }
    
    else if (mapping[action.type]) {
        newState = mapping[action.type](state, action);
    }

    return newState;
}

export default reducer;
