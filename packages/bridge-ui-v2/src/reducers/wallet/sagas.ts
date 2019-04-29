import actions from "./actionTypes";
import {
    call, all, fork, put, select, takeEvery, takeLatest
} from 'redux-saga/effects';

import Web3Interface from '../../utils/coinInterfaces/Web3/Web3Interface';
import {WalletState} from './types';
import {randomHex, toBN} from 'web3-utils';

export const getWallet = (state:any) => state.wallet

function* tryGetBalance(action: any) { 
    const wallet:WalletState = yield select(getWallet);
    const token = wallet.tokens[action.tokenIndex];

    const balance = yield call(Web3Interface.getBalance, wallet.ethereum.address, token.network, token.address);

    yield put({
        type: actions.SET_TOKEN_BALANCE,
        tokenIndex: action.tokenIndex,
        balance: balance
    })
}

function* tryGetAllBalances(action: any) {
    const wallet:WalletState = yield select(getWallet);
    for(let tokenIndex in wallet.tokens) {

        const token = wallet.tokens[tokenIndex];

        // console.log(Web3Interface.getBalance);

        let balance = yield call(Web3Interface.getBalance, wallet.ethereum.address, token.network, token.address);

        yield put({
            type: actions.SET_TOKEN_BALANCE,
            tokenIndex,
            balance: balance
        })

        // console.log("update");

    }
}

function* trySendToken(action: any) {
    const wallet:WalletState = yield select(getWallet);
    const token = wallet.tokens[action.tokenIndex];

    console.log("sending token");

    const pendingTX = yield call(Web3Interface.send, wallet.ethereum.address, action.to, action.amount, token, action.fee);

    console.log("token send");

    yield put({
        type: actions.UPDATE_TOKEN_BALANCE,
        tokenIndex: action.tokenIndex,
    })

    console.log("balance updated");

}

function* tryBridgeToken(action: any) {
    const wallet:WalletState = yield select(getWallet);
    const token = wallet.tokens[action.tokenIndex];

    console.log("Bridging token");

    const salt = toBN(randomHex(32)).toString();

    // bridge (from:string, to:string, amount:string, token:any, targetChain:string, fee:number)
    const listeners = yield call(Web3Interface.bridge, wallet.ethereum.address, wallet.ethereum.address, action.amount, token, action.targetChain, action.fee, salt, console.log); 

}



export default function* saga() {
    yield all([
        takeEvery(actions.UPDATE_TOKEN_BALANCE, tryGetBalance),
        takeEvery(actions.UPDATE_ALL_BALANCES, tryGetAllBalances),
        takeEvery(actions.SEND_TOKEN, trySendToken),
        takeEvery(actions.BRIDGE_TOKEN, tryBridgeToken)
    ]);
}