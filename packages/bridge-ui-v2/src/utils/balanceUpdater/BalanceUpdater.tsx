import {Token} from '../../reducers/wallet/types'

class BalanceUpdater {

    updateBalance = (token:Token) => {
        console.log("Updating");
        console.log(token);
    }


}


export default BalanceUpdater