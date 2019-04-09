import { combineReducers } from 'redux'
import walletReducer from './wallet/reducers';
import addTokenReducer from './addToken/reducers';
import storage from 'redux-persist/lib/storage';
import { persistReducer } from 'redux-persist';


const rootPersistConfig = {
    key: 'root',
    storage: storage,
    blacklist: ['wallet', 'addToken']
}

const walletPersistConfig = {
    key: 'wallet',
    storage: storage,
    // blacklist: ['mnemonic'] //should not remember this phrase in production
}


const reducers = combineReducers({
    wallet: persistReducer(walletPersistConfig, walletReducer),
    addToken: addTokenReducer
})

export default persistReducer(rootPersistConfig, reducers);