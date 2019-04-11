import { createStore, compose, applyMiddleware } from 'redux'
import reducers from './reducers'
import { persistStore, persistReducer } from 'redux-persist'
import createSagaMiddleware from 'redux-saga';
import rootSaga from './rootSaga';

import storage from 'redux-persist/lib/storage'

const sagaMiddleware = createSagaMiddleware();


  
export const store = createStore(reducers, {}, compose(
  applyMiddleware(
    sagaMiddleware
  )
))

sagaMiddleware.run(rootSaga);

export const persistor = persistStore(store)

