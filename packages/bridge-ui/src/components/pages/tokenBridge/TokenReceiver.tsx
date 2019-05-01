import React from 'react';
import { withStyles, LinearProgress, Typography } from '@material-ui/core';
import { connect } from 'react-redux';
import { toBN, toWei, fromWei, randomHex, BN } from 'web3-utils';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes';
import {ethers} from 'ethers';
import getConfigValue, {getConfigValueByName} from '../../../utils/getConfigValue';


// import EscrowArtifact from '@ohdex/contracts/build/artifacts/Escrow.json'
import BridgeArtifact from '@ohdex/contracts/build/artifacts/Bridge.json'

import { BigNumber } from 'ethers/utils';
import { concatSeries } from 'async';

const styles = (theme:any) => ({

})

class TokenReceiver extends React.Component<any> {

    state = {
        approveTxId: "",
        bridgeTxId: "",
        success: false,
    }

    bridgeB:any;
    bridgedTokenAddress:string = "";
    

    salt:BN = toBN(0);

    chainBProvider:any = null;

    componentDidMount() {
        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue: false,
        })
        
        const {tokenAddress, tokenAmount, chainB, chainA, bridgingBack} = this.props.bridge;
        const {drizzle, drizzleState} = this.props;

        const chainAID = getConfigValueByName(chainA, "chainId");
        const chainBID = getConfigValueByName(chainB, "chainId");
        
        const weiTokenAmount = toWei(tokenAmount);
        const from = drizzleState.accounts[0];
            
        const salt = toBN(randomHex(32));
        this.salt = salt;

        let ethersProvider = new ethers.providers.JsonRpcProvider(getConfigValueByName(chainB, "rpcUrl"));
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 1000;
    

        this.chainBProvider = ethersProvider;

        const bridgeAddress = getConfigValueByName(chainB, "bridgeAddress")
        const Bridge = drizzle.contracts.Bridge;
        const bridge = new ethers.Contract(
            bridgeAddress, BridgeArtifact.compilerOutput.abi, this.chainBProvider
        );

        this.bridgeB = bridge;

        if(!bridgingBack) {
            // event BridgedTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );

            
            // const bridgeAddress = "0xd859747b327702be74babeaeed62a4d19e7bc5c0"

            // TODO setup filter for listening
            // emit BridgedMint(
            //     address(bridgeToken),
            //     _token, 
            //     _receiver, 
            //     _amount,
            //     _salt,
            //     _originChainId,
            //     _originBridge,
            //     eventHash
            // );

            const filter = bridge.filters.BridgedMint(null, null, null, null, null, null, null, null); 
            bridge.on(filter, this.tokensClaimed);
            
        
            const approveTxId = drizzle.contracts[tokenAddress].methods.approve.cacheSend(Bridge.address, weiTokenAmount, {from});
            
            // function deposit(
            //     address _token,
            //     address _receiver,
            //     uint256 _amount,
            //     uint256 _salt,
            //     uint256 _targetChainId,
            //     address _targetBridge
            // )

            // const bridgeTxId = Bridge.methods.bridge.cacheSend(
            //     tokenAddress, from, weiTokenAmount, salt, chainBID, getConfigValueByName(chainB, "bridgeAddress"), {from, gas: 500000}
            // );


            const bridgeTxId = Bridge.methods.deposit.cacheSend(
                tokenAddress,
                from,
                weiTokenAmount,
                salt,
                chainBID,
                getConfigValueByName(chainB, "bridgeAddress"),
                {
                    from,
                    gas: 500000
                }
            )

            // alert(salt.toString());

            this.setState({
                approveTxId,
                bridgeTxId,
            })

        } else {

            // event Withdrawal(
            //     address token,
            //     address receiver,
            //     uint256 amount,
            //     uint256 salt,
            //     uint256 originChainId,
            //     address originBridge,
            //     bytes32 eventHash
            // );


            const filter = bridge.filters.Withdrawal(null, null, null, null, null, null, null); 
            bridge.on(filter, this.tokensClaimed);
            
            
            const bridgeTxId =  Bridge.methods.burnBridged.cacheSend(
                tokenAddress,
                from,
                weiTokenAmount,
                salt,
                chainBID,
                getConfigValueByName(chainB, "bridgeAddress"),
                {
                    from
                }
            )

            this.setState({
                bridgeTxId,
            })

        }
    }

    // address(bridgedToken), _receiver, _amount, _chainId, _salt
    tokensClaimed = async (address:string, receiver:string, amount:string, chainId:string, salt:string) => {
        // const {tokenAddress, chainA} = this.props.bridge;
        // console.log(event);
        // this.bridgedTokenAddress = await this.bridgeB.getBridgedTokenStatic(tokenAddress, getConfigValueByName(chainA, "chainId"));
        this.bridgedTokenAddress = address;
        if(this.salt.eq(toBN(salt.toString()))) {
            this.setState({
                success: true
            })
        }

    }

    render() {
        const {progress, stateMessage} = this.bridgingState();
        const {success} = this.state;
        const {tokenAmount, bridgingBack, tokenAddress, originTokenAddress} = this.props.bridge;

        return (
            <>
                {!success ?
                    <> 
                        <Typography align="center"> {stateMessage} </Typography>
                        <LinearProgress variant="determinate" value={progress} />
                    </>
                 :
                    <>
                        <Typography align="center">Tokens Bridged!</Typography>
                        <Typography align="center">Received {tokenAmount} at token address: {bridgingBack ? originTokenAddress : this.bridgedTokenAddress}</Typography>
                    </>
                }
            </>    
        )
    }

    bridgingState() {
        const {drizzleState} = this.props;
        const {transactions, transactionStack} = drizzleState;
        const {approveTxId, bridgeTxId, success} = this.state;


        let stateMessage = "";
        let progress = 0; 

        if(approveTxId === "" || bridgeTxId === "" || !transactions[transactionStack[approveTxId]] || !transactions[transactionStack[bridgeTxId]]) {
            stateMessage = "Awaiting transaction approval";
            progress = 0;
        } else if (transactions[transactionStack[approveTxId]].status == "pending" || transactions[transactionStack[bridgeTxId]].status == "pending" ) {
            stateMessage = "Awaiting confirmation of transactions";
            progress = 25;
        } else if (transactions[transactionStack[approveTxId]].status == "success" || transactions[transactionStack[bridgeTxId]].status == "success" && !success) {
            stateMessage = "Transactions confirmed waiting for relayers to bridge tokens";
            progress = 50;
        } 
        else {
            progress = 0; 
            stateMessage = "Unknown state"
        }

        return {progress, stateMessage};
    }
}



const styledTokenReceiver = withStyles(styles)(TokenReceiver);

export default connect((state:any) => ({
    bridge: state.bridge,
}))(styledTokenReceiver);