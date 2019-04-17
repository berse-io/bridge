import React from 'react';
import { connect } from 'react-redux';
import nameToNetwork from '../../utils/nameToNetwork'
import Web3Interface from '../../utils/coinInterfaces/Web3/Web3Interface';

// Starts web3 providers before content

class Web3Provider extends React.Component<any> {

    state = {
        initialised: false
    }

    componentWillMount(){
        Object.keys(nameToNetwork).map((network, index) => {
            Web3Interface.addWeb3Instance(network, this.props.wallet.ethereum.privateKey);
        })

        this.setState({
            initialised: true
        })
    }

    render() {
        const{initialised} = this.state;

        if(!initialised) {
            return(
                <>Setting up web3</>
            )
        }
        
        return(
            <>{this.props.children}</>
        )   
    }

}

export default connect((state:any) => ({
    wallet: state.wallet,
}))(Web3Provider);
