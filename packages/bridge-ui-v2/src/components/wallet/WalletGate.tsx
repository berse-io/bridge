import React from 'react'
import { connect } from 'react-redux';
import WalletSetup from './WalletSetup';
import Web3Provider from './Web3Provider';



class WalletGate extends React.Component<any> {
    render() {1
        const {mnemonic} = this.props.wallet;

        if(mnemonic !== "") {

            console.log(mnemonic);
            return(
                <Web3Provider>{this.props.children}</Web3Provider>
            )
        }

        return(
            <WalletSetup> </WalletSetup>
        );

        
    }
}


export default connect((state:any) => ({
    wallet: state.wallet,
}))(WalletGate);