import React from 'react';
import Container from '../../utils/Container';
import { connect } from 'react-redux';
import { Grid, Typography, withStyles, TextField, Button } from '@material-ui/core';
import walletActionTypes from '../../../reducers/wallet/actionTypes';
import Router from 'next/router';


const styles:any = (theme:any) => ({
    root: {
        height: "100vh",
        margin: "0px -16px",
    },
    mnemonicInput: {
        margin: `${theme.spacing.unit * 2}px 0`,
        height: 38
    },
    continue: {
        margin: `${theme.spacing.unit * 2}px 0`
    }
})

class ImportMnemonic extends React.Component<any> {

    state = {
        mnemonic: ""
    }

    render() {

        const{classes} = this.props;

        return(
            <Grid className={classes.root} container spacing={16} justify="center" alignItems="center">
                <Grid item xs={12} className={classes.walletCenter} alignContent="center">
                    <Typography variant="h2" align="center">Enter Mnemonic</Typography> 
                    <Typography align="center">Enter your 12 or 24 word mnemonic phrase.</Typography>
                    
                    <Grid container justify="center">
                        <Grid item xs={4}>
                            <TextField className={classes.mnemonicInput} inputProps={{style: { textAlign: "center" }}} fullWidth multiline onChange={this.handleChange} value={this.state.mnemonic}/>
                        </Grid> 
                    </Grid>

                    {this.state.mnemonic !== "" &&
                    <Grid container justify="center">
                        <Button onClick={this.saveMnemonic} className={classes.continue} variant="contained" color="primary">Continue</Button>
                    </Grid>}
                    
                </Grid>
            </Grid>
        )
    }

    saveMnemonic = (event:any) => {
        this.props.dispatch({
            type: walletActionTypes.SET_MNEMONIC,
            mnemonic: this.state.mnemonic
        })

        Router.push('/');
    }

    handleChange = (event:any) => {
        this.setState({
            mnemonic: event.target.value,
        })
    }
}

const styledImportMnemonic = withStyles(styles)(ImportMnemonic);

export default connect((state:any) => ({
    wallet: state.wallet,
}))(styledImportMnemonic);