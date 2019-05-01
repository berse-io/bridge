import React from 'react';
import {Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button, withStyles} from '@material-ui/core';
import addTokenActions from '../../../../reducers/addToken/actionTypes'
import { connect } from 'react-redux';


const styles:any = (theme:any) => ({
    root: {
        textAlign: "center"
    },
    button: {
        margin: theme.spacing.unit,
    }
})

class AddTokenModal extends React.Component<any> {

    render() {

        const {classes} = this.props

        return(
            <Dialog
                open={this.props.addToken.addTokenOpen}
                onClose={this.handleClose}
                aria-labelledby="form-dialog-title"
                className={classes.root}
                maxWidth={'xl'}
                fullWidth
                >
                <DialogTitle id="form-dialog-title">Add token to your wallet</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Search for a token or add it by address
                    </DialogContentText>

                    <Button onClick={this.openSearch} className={classes.button} variant="contained" color="primary">Search</Button>
                    <Button onClick={this.openAddByAddress} className={classes.button}variant="contained" color="default">By Address</Button>
                    {/* <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Address"
                    type="email"
                    fullWidth
                    /> */}
                </DialogContent>
                
            </Dialog>
        )
    }


    openSearch = () => {
        this.props.dispatch({
            type: addTokenActions.OPEN_TOKEN_SEARCH
        })
    }

    openAddByAddress = () => {
        this.props.dispatch({
            type: addTokenActions.OPEN_ADD_BY_ADDRESS
        })
    }

    handleClose = () => {
        this.props.dispatch({
            type: addTokenActions.TOGGLE_ADD_TOKEN
        })
    }

}

const styledAddTokenModal = withStyles(styles)(AddTokenModal)

export default connect((state:any) => ({
    addToken: state.addToken,
}))(styledAddTokenModal);

