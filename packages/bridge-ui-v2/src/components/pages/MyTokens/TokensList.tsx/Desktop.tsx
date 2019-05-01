import React from 'react';
import {Paper, Table, TableHead, TableRow, TableCell, TableBody, IconButton, withStyles} from '@material-ui/core';
import {Token} from '../../../reducers/wallet/types';
import DeleteIcon from '@material-ui/icons/Delete';
import SendIcon from '@material-ui/icons/Send';
import grey from '@material-ui/core/colors/grey';

const styles:any = (theme:any) => ({
    root: {
        // GO ON BELOW
        margin: theme.spacing.unit * 4,
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
        color: grey[400]
    },
})

class Desktop extends React.Component<any> {
    render() {
        const{classes, tokens} = this.props;
        return(
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
                        {tokens.map((token: Token, index: number) => (
                            <TableRow className={classes.tableRow} key={`${token.address}${token.name}`}>
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
                                    <IconButton color="primary" onClick={this.props.onTokenClicked(token)} ><SendIcon /></IconButton>
                                    <IconButton color="inherit" className={classes.delete} onClick={this.props.onDeleteClicked(index)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))} 
                    </TableBody>
                </Table>
            </Paper>
        )
    }
}

const styledDesktop = withStyles(styles)(Desktop);

export default styledDesktop;