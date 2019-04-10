import React from 'react'
import Container from '../../utils/Container'
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, withStyles, Grid, Button, IconButton } from '@material-ui/core';
import { connect } from 'react-redux';
import addTokenActions from '../../../reducers/addToken/actionTypes';
import walletActions from '../../../reducers/wallet/actionTypes';
import {Token} from '../../../reducers/wallet/types';
import Router from 'next/router';
import AddTokenModal from './AddTokenModal';
import AddTokenByAddressModal from './AddTokenByAddressModal';
import SearchTokenModal from './SearchTokensModal';
import WalletGate from '../../wallet/WalletGate';
import DeleteIcon from '@material-ui/icons/Delete';
import SendIcon from '@material-ui/icons/Send';
import red from '@material-ui/core/colors/red';


const styles:any = (theme:any) => ({
    root: {
        marginTop: theme.spacing.unit * 4,
    },
    tableRow: {
        // cursor: "pointer",
        // '&:hover': {
        //     backgroundColor: theme.palette.grey[200],
        // }
    },
    tokenBalance: {
        maxWidth: "100px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    delete: {
        color: red.A700
    }
})

class MyTokens extends React.Component<any> {
    render() {

        const {classes, wallet, addToken} = this.props;

        console.log(addToken);

        return(
            <WalletGate>
                <Container>

                    <Grid container>
                            <Grid item xs={6}>
                                <Typography variant="h2">My Tokens</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Grid container alignItems="flex-start" justify="flex-end" direction="row">
                                    <Button onClick={this.addTokenClicked} variant="contained" color="primary">Add Token</Button>
                                </Grid>
                            </Grid>
                    </Grid>
                    
                    <Paper className={classes.root}>
                        <Table >
                            <TableHead>
                            <TableRow>
                                <TableCell>Symbol</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Network</TableCell>
                                <TableCell>Balance</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                            </TableHead>
                            <TableBody>
                                {wallet.tokens.map((token: Token, index: number) => (
                                    <TableRow className={classes.tableRow} key={token.address}>
                                        <TableCell component="th" scope="row">
                                            {token.symbol}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {token.name}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {token.network}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {token.balance}
                                        </TableCell>
                                        <TableCell className={classes.tokenBalance} component="th" scope="row">
                                            {token.address}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            <IconButton color="primary" onClick={this.tokenClicked(token)} ><SendIcon /></IconButton>
                                            <IconButton color="inherit" className={classes.delete} onClick={this.deleteClicked(index)}><DeleteIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))} 
                            </TableBody>
                        </Table>
                    </Paper>
                    {/* MODALS */}
                    <AddTokenModal/>
                    <AddTokenByAddressModal/>
                    <SearchTokenModal/>

                </Container>
            </WalletGate>
        )
    }

    addTokenClicked = (event: any) => {
        this.props.dispatch({
            type: addTokenActions.TOGGLE_ADD_TOKEN
        })
    }

    tokenClicked = (token: Token) => (event:any) => {  
        Router.push(`/coin?network=${token.network.toLowerCase()}&address=${token.address}`, `/token/${token.network.toLowerCase()}/${token.address}`);
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