import React from 'react';
import { connect } from 'react-redux';
import {Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button, withStyles} from '@material-ui/core';
import addTokenActions from '../../../reducers/addToken/actionTypes';
import TokensOverview from './TokenOverview';

const styles:any = (theme:any) => ({
    root: {
    }
})

class SearchTokensModal extends React.Component<any> {
    render() {

        const{classes} = this.props;

        return (
            <Dialog
                open={this.props.addToken.tokenSearchOpen}
                onClose={this.handleClose}
                aria-labelledby="form-dialog-title"
                className={classes.root}
                >
                {/* <DialogTitle id="form-dialog-title">Add a token by address</DialogTitle> */}
                <DialogContent>
                    <TokensOverview></TokensOverview>
                </DialogContent>
                {/* <DialogActions>
                    <Button onClick={this.handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" onClick={this.addToken}>
                        Add Token
                    </Button>
                </DialogActions> */}
            </Dialog>
        )
    }

    handleClose = () => {
        this.props.dispatch({
            type: addTokenActions.CLOSE_TOKEN_SEARCH
        })
    }

}

const styledSearchTokensModal = withStyles(styles)(SearchTokensModal);

export default connect((state:any) => ({
    addToken: state.addToken,
}))(styledSearchTokensModal);