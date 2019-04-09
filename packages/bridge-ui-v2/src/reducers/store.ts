import { createStore } from 'redux'
import reducers from './reducers'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'


  
  export const store = createStore(reducers)
  export const persistor = persistStore(store)

