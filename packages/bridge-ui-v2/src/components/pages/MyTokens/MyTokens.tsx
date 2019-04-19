import React from 'react'
import Container from '../../utils/Container'
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, withStyles, Grid, Button, IconButton, Fab } from '@material-ui/core';
import { connect } from 'react-redux';
import addTokenActions from '../../../reducers/addToken/actionTypes';
import walletActions from '../../../reducers/wallet/actionTypes';
import {Token} from '../../../reducers/wallet/types';
import Router from 'next/router';
import AddTokenModal from './Modals/AddTokenModal';
import AddTokenByAddressModal from './Modals/AddTokenByAddressModal';
import SearchTokenModal from './Modals/SearchTokensModal';
import WalletGate from '../../wallet/WalletGate';
// import DeleteIcon from '@material-ui/icons/Delete';
// import SendIcon from '@material-ui/icons/Send';
import AddIcon from '@material-ui/icons/Add';

import HomeBar from './HomeBar';
import TokenList from './TokensList.tsx';


const styles:any = (theme:any) => ({
    fab: {
        position: "absolute",
        bottom: theme.spacing.unit * 2,
        right: theme.spacing.unit * 2,
    }
})

class MyTokens extends React.Component<any> {

    componentDidMount(){
        this.props.dispatch({
            type: walletActions.UPDATE_ALL_BALANCES      
        })
    }

    render() {
        const {classes, wallet} = this.props;
        return(
            <WalletGate>
                <HomeBar></HomeBar>
                
                    <TokenList onDeleteClicked={this.deleteClicked} onTokenClicked={this.tokenClicked} tokens={wallet.tokens} />
                    {/* MODALS */}
                    <AddTokenModal/>
                    <AddTokenByAddressModal/>
                    <SearchTokenModal/>
                
                <Fab onClick={this.addTokenClicked} className={classes.fab} color="primary">
                    <AddIcon />
                </Fab>
            </WalletGate>
        )
    }

    addTokenClicked = (event: any) => {
        this.props.dispatch({
            type: addTokenActions.TOGGLE_ADD_TOKEN
        })
    }

    tokenClicked = (token: Token) => (event:any) => {  
        // alert("dafuq");
        const urlSafeNetwork = token.network.replace(new RegExp(' ', 'g'), '-').toLowerCase();
        Router.push(`/coin?network=${urlSafeNetwork}&address=${token.address}`, `/token/${urlSafeNetwork}/${token.address}`);
    }

    deleteClicked = (tokenIndex: number) => () => {
        this.props.dispatch({
            type: walletActions.REMOVE_TOKEN,
            tokenIndex
        });
    }
}

const styledMyTokens = withStyles(styles)(MyTokens)

export default connect((state:any) => ({
    wallet: state.wallet,
    addToken: state.addToken,
}))(styledMyTokens);