import React from 'react'
import { connect } from 'react-redux';
import WalletSetup from './WalletSetup';



class WalletGate extends React.Component<any> {
    render() {
        const {mnemonic} = this.props.wallet;

        if(mnemonic !== "") {
            return(
                this.props.children
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