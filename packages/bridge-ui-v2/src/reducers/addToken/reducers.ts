import actionTypes from './actionTypes';
import {AddTokenState} from './types';

// export interface Token {
//     symbol: string,
//     name: string,
//     network: string,
//     balance: string,
//     address: string,
// }

const initialState : AddTokenState = {
    addTokenOpen: false,
    tokenSearchOpen: false,
    addTokenByAddressOpen: false,
};

const mapping = {
    [actionTypes.TOGGLE_ADD_TOKEN]: (state:AddTokenState, action:any) => ({
        ...state,
        addTokenOpen: !state.addTokenOpen
    }),
    [actionTypes.OPEN_TOKEN_SEARCH]: (state:AddTokenState, action:any) => ({
        ...state,
        tokenSearchOpen: true,
        addTokenOpen: false
    }),
    [actionTypes.CLOSE_TOKEN_SEARCH]: (state:AddTokenState, action:any) => ({
        ...state,
        tokenSearchOpen: false,
    }),
    [actionTypes.OPEN_ADD_BY_ADDRESS]: (state:AddTokenState, action:any) => ({
        ...state,
        addTokenByAddressOpen: true,
        addTokenOpen: false
    }),
    [actionTypes.CLOSE_ADD_BY_ADDRESS]: (state:AddTokenState, action:any) => ({
        ...state,
        addTokenByAddressOpen: false,
    })
    
};



function reducer(state = initialState, action:any) {
    let newState = state;
  
    if (mapping[action.type]) {
        newState = mapping[action.type](state, action);
    }

    return newState;
}

export default reducer;
