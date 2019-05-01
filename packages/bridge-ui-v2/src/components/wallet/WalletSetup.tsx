import React from 'react';
import { Grid, withStyles, Typography, Button } from '@material-ui/core';
import Link from 'next/link'
import { connect } from 'react-redux';


const styles:any = (theme:any) => ({
    root: {
        height: "100vh",
        margin: "0px -16px",
    },
    walletCenter: {
        justifyContent: 'center'
    },
    action: {
        margin: theme.spacing.unit * 1,
    }
})

class WalletSetup extends React.Component<any> {
    render(){
        const {classes} = this.props

        return(
            <Grid className={classes.root} container spacing={16} justify="center" alignItems="center">
                <Grid item xs={12} className={classes.walletCenter} alignContent="center">
                    <Typography variant="h2" align="center">Setup Wallet</Typography>
                    <Grid container justify="center" alignItems="center">
                        <Link href="/import-mnemonic"><Button className={classes.action} variant="contained" color="primary">Import Mnemonic</Button></Link>
                        <Button className={classes.action} variant="contained" color="default">Create New Mnemonic</Button>
                    </Grid>       
                </Grid>
            </Grid>
        )
    }
}



const styledWalletSetup = withStyles(styles)(WalletSetup);

export default styledWalletSetup;
