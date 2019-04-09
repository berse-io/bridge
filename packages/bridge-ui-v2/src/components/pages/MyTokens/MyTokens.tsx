import React from 'react'
import Container from '../../utils/Container'
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, withStyles, Grid, Button } from '@material-ui/core';
import { connect } from 'react-redux';
import addTokenActions from '../../../reducers/addToken/actionTypes'
import {Token} from '../../../reducers/wallet/types';
import Router from 'next/router';
import AddTokenModal from './AddTokenModal';
import AddTokenByAddressModal from './AddTokenByAddressModal';
import WalletGate from '../../wallet/WalletGate';


const styles:any = (theme:any) => ({
    root: {
        marginTop: theme.spacing.unit * 4,
    },
    tableRow: {
        cursor: "pointer",
        '&:hover': {
            backgroundColor: theme.palette.grey[200],
        }
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
                            <Grid item xs={5}>
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
                            </TableRow>
                            </TableHead>
                            <TableBody>
                                {wallet.tokens.map((token: Token) => (
                                    <TableRow className={classes.tableRow} onClick={this.tokenClicked(token)} key={token.address}>
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
                                        <TableCell component="th" scope="row">
                                            {token.address}
                                        </TableCell>
                                    </TableRow>
                                ))} 
                            </TableBody>
                        </Table>
                    </Paper>
                    {/* MODALS */}
                    <AddTokenModal/>
                    <AddTokenByAddressModal/>

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
}

const styledMyTokens = withStyles(styles)(MyTokens)

export default connect((state:any) => ({
    wallet: state.wallet,
    addToken: state.addToken,
}))(styledMyTokens);