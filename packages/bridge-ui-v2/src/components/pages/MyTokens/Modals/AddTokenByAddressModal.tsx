import React from 'react'

import {Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button, withStyles} from '@material-ui/core';
import { connect } from 'react-redux';
import addTokenActions from '../../../../reducers/addToken/actionTypes';
import walletActions from '../../../../reducers/wallet/actionTypes';
import {Token} from '../../../../reducers/wallet/types';
import nameToNetwork from '../../../../utils/nameToNetwork';


const styles:any = (theme:any) => ({
    root: {
        
    }
})

class AddTokenByAddress extends React.Component<any> {

    state =  {
        network: "Ethereum",
        address: "",
        symbol: "",
        name: "",
    }

    networks = Object.keys(nameToNetwork).map((key, index) => {
        return {value: key, label: key}
    });

    render() {

        const{classes} = this.props;

        return(
            <Dialog
                open={this.props.addToken.addTokenByAddressOpen}
                onClose={this.handleClose}
                aria-labelledby="form-dialog-title"
                className={classes.root}
                >
                <DialogTitle id="form-dialog-title">Add a token by address</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please fill the following fields:
                    </DialogContentText>


                    <TextField
                        id="select-network"
                        select
                        label="Network"
                        className={classes.textField}
                        value={this.state.network}
                        onChange={this.handleChange('network')}
                        SelectProps={{
                            native: true,
                            MenuProps: {
                            className: classes.menu,
                            },
                        }}
                        fullWidth
                        helperText="Select the Network the Token originates from"
                        margin="normal"
                    >
                    
                    {this.networks.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                    
                    </TextField>
                    
                    <TextField
                    autoFocus
                    margin="dense"
                    id="address"
                    label="Address"
                    type="text"
                    fullWidth
                    helperText="Leave empty for native tokens (e.g Ether)"
                    onChange={this.handleChange('address')}
                    />

                    <TextField
                        autoFocus
                        margin="dense"
                        id="symbol"
                        label="Symbol"
                        type="text"
                        fullWidth
                        helperText="The symbol you would like to use (e.g REP)"
                        onChange={this.handleChange('symbol')}
                    />

                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Name"
                        type="text"
                        fullWidth
                        helperText="The name you would like to use (e.g Augur)"
                        onChange={this.handleChange('name')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" onClick={this.addToken}>
                        Add Token
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    handleChange = (propertyName:string) => (event: any) => {

        // TODO implement filters to disable saving before input is valid

        this.setState({
            [propertyName]: event.target.value
        })

        console.log(this.state);
    } 

    handleClose = () => {
        this.props.dispatch({
            type: addTokenActions.CLOSE_ADD_BY_ADDRESS
        })
    }

    addToken = () => {  
        // export interface Token {
        //     symbol: string,
        //     name: string,
        //     network: string,
        //     balance: string,
        //     address: string,
        // }


        const token : Token = {
            name: this.state.name,
            symbol: this.state.symbol,
            balance: "0",
            address: this.state.address,
            network: this.state.network
        }


        this.props.dispatch({
            type: walletActions.ADD_TOKEN,
            token
        })

        this.handleClose();
    }

}

const styledAddTokenByAddress = withStyles(styles)(AddTokenByAddress);

export default connect((state:any) => ({
    addToken: state.addToken,
}))(styledAddTokenByAddress);
