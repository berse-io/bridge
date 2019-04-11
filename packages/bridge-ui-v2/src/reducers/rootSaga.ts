
import { all, fork } from 'redux-saga/effects';
import walletSaga from './wallet/sagas';

export default function* root() {
    yield all([
        fork(walletSaga)
    ]);
}