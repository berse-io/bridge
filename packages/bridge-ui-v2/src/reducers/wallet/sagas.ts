import actions from "./actionTypes";
import {
    call, all, fork, put, select, takeEvery, takeLatest
} from 'redux-saga/effects';

import Web3Interface from '../../utils/coinInterfaces/Web3Interface';
import {WalletState} from './types';

export const getWallet = (state:any) => state.wallet

function* helloSaga() {
    console.log("hello saga");
}

function* tryGetBalance(action: any) { 
    const wallet:WalletState = yield select(getWallet);
    const token = wallet.tokens[action.tokenIndex];

    const balance = yield call(Web3Interface.getBalance, wallet.ethereum.address, token.network, token.address);

    yield put({
        type: actions.SET_TOKEN_BALANCE,
        tokenIndex: action.tokenIndex,
        balance: balance
    })

    // console.log(balance);
    // console.log(token);
    
    // console.log(action);
}

function* tryGetAllBalances(action: any) {
    const wallet:WalletState = yield select(getWallet);


    for(let tokenIndex in wallet.tokens) {

        const token = wallet.tokens[tokenIndex];

        let balance = yield call(Web3Interface.getBalance, wallet.ethereum.address, token.network, token.address);

        yield put({
            type: actions.SET_TOKEN_BALANCE,
            tokenIndex,
            balance: balance
        })

    }
}


export default function* saga() {
    yield all([
        takeEvery(actions.UPDATE_TOKEN_BALANCE, tryGetBalance),
        takeEvery(actions.UPDATE_ALL_BALANCES, tryGetAllBalances)
    ]);
}