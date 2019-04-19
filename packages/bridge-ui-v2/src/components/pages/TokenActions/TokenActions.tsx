import React from 'react';
import { Grid, Button, FormControl, InputLabel, Select, MenuItem, Typography, withStyles, Tabs, Tab, TextField, IconButton } from '@material-ui/core';
import Slider from '@material-ui/lab/Slider';
import Container from '../../utils/Container';
import { connect } from 'react-redux';
import WalletGate from '../../wallet/WalletGate';
import walletActions from '../../../reducers/wallet/actionTypes'
import QrCode from 'qrcode.react';
import nameToNetwork from '../../../utils/nameToNetwork';
import TokenBar from './TokenBar';


const styles:any = (theme:any) => ({
    formControl: {
        width: "100%",
    },
    qrCode: {
        width: "80%",
        height: "80%",
        marginTop: theme.spacing.unit * 3,
    },
    spacer: {
        paddingTop: theme.spacing.unit * 2,
    },
    labelRoot: {
        [theme.breakpoints.down('sm')]: {
            fontSize: 12,
        }, 
    }, 
    address: {
        fontWeight: "bolder",
        wordWrap: "break-word"
    },
    sendButton: {
        position: "absolute",
        bottom: theme.spacing.unit * 2,
        left: theme.spacing.unit * 2,
        width: `calc(100vw - ${theme.spacing.unit * 4}px)`,
    },
    slider: {
        marginTop: theme.spacing.unit * 4,
    },
    gasPriceText:{
        marginTop: theme.spacing.unit * 4,
    }
})

class TokenActions  extends React.Component<any> {

    state = {
        action: 0,
        amount: "",
        to: "",
        tokenIndex: 0,
        gasSlider: 50,
        gasPrice: 0,
    }

    componentDidMount() {
        this.loadToken();
        this.setState({
            gasPrice: this.percentageToGasPrice(this.state.gasSlider)
        })
    }

    render() {
        const{classes} = this.props;
        const token = this.props.wallet.tokens[this.state.tokenIndex];    
        if(!token) {
            return <></>
        }


        return (
            <WalletGate>
                <TokenBar token={token} onSelect={this.handleSelectAction} selectedAction={this.state.action}></TokenBar>
                <Container>
                    <div className={classes.spacer} ></div>
                    <form noValidate autoComplete="off">
                        <Grid container spacing={16} justify="flex-start">
                            {this.state.action != 1 ? <>
                                <Grid item xs={12} lg={6}>
                                    <TextField
                                        id="amount"
                                        label={`Amount (Balance: ${token.balance})`}
                                        InputLabelProps={{
                                            FormLabelClasses: {
                                              root: classes.labelRoot
                                            }
                                          }}
                                        value={this.state.amount}
                                        onChange={this.handleChange('amount')}
                                        margin="none"
                                        fullWidth
                                        type="number"
                                        placeholder={token.balance}
                                    />
                                </Grid>

                                <Grid item xs={12} lg={6}>
                                    <TextField
                                        id="to"
                                        label="Receiver"
                                        value={this.state.to}
                                        onChange={this.handleChange('to')}
                                        margin="none"
                                        fullWidth
                                        type="text"
                                    />
                                </Grid>

                                { this.state.action == 2 && <Grid item xs={12} lg={6}>
                                    <FormControl fullWidth className={classes.formControl}>
                                        <InputLabel htmlFor="network">Network</InputLabel>
                                        <Select
                                            value={"Ethereum"}
                                            fullWidth
                                            inputProps={{
                                            name: 'Token',
                                            id: 'Token',
                                            }}
                                        >
                                            {Object.keys(nameToNetwork).map((item) => {
                                                return <MenuItem value={item}>{item}</MenuItem>
                                            })}
                                        </Select>
                                    </FormControl>
                                </Grid> }
                            
                                <Grid item xs={12} lg={6}>                    
                                    <Typography className={classes.gasPriceText} gutterBottom id="label">Gas Price: {this.state.gasPrice} Gwei</Typography>
                                    <Slider
                                    classes={{ container: classes.slider }}
                                    value={this.state.gasSlider}
                                    aria-labelledby="label"
                                    onChange={this.handleSlider}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Grid style={{height: "100%"}} container alignItems="flex-end" justify="flex-end" direction="row">
                                        <Button variant="contained" onClick={this.handleSend} color="primary" className={classes.sendButton}>SEND</Button>
                                    </Grid>
                                </Grid>
                           </> : 
                           
                           
                           <>
                                <Grid item xs={12} lg={4} justify="center">
                                    <Grid container justify = "center">
                                        <QrCode className={classes.qrCode} value={this.props.wallet.ethereum.address} renderAs="svg"/>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12} lg={8}>
                                    <Typography className={classes.address} align="center">{this.props.wallet.ethereum.address}</Typography>
                                    <Typography align="center">Send funds to this address to use them in your Berse wallet.</Typography>
                                </Grid>
                           </>}
                        </Grid>
                    </form>
                    
                </Container>
            </WalletGate>
        )
    }

    handleSend = async () => {
        this.props.dispatch({
            type: walletActions.SEND_TOKEN,
            tokenIndex: this.state.tokenIndex,
            to: this.state.to,
            amount: this.state.amount,
            fee: this.state.gasPrice,
        })
    }

    loadToken = async () => {        
        const{wallet} = this.props;
        let networkAndToken = window.location.pathname.split("/");
        const network = networkAndToken[2].replace(new RegExp('-', 'g'), ' ').toLowerCase();
        const address = networkAndToken[3]
        let tokenIndex = 0;

        for(tokenIndex = 0; tokenIndex < wallet.tokens.length; tokenIndex++) {
            const item = wallet.tokens[tokenIndex];
            if(item.address.toLowerCase() == address.toLowerCase() && item.network.toLowerCase() == network.toLowerCase()){
                break;
            }
        }
        
        this.setState({
            tokenIndex
        });

        this.props.dispatch({
            type: walletActions.UPDATE_TOKEN_BALANCE,
            tokenIndex: tokenIndex,
        })
    }

    percentageToGasPrice = (percentage:string):string => {
        const min = 1;
        const max = 100;

        return (min + parseFloat(percentage) / 100 * (max - min)).toFixed(2);
    }


    handleSlider = (event:any, gasSlider:string) => {
        this.setState({
            gasSlider,
            gasPrice: this.percentageToGasPrice(gasSlider)
        })
    }

    handleChange = (name:string) => (event:any) => {
        this.setState({ [name]: event.target.value });
    };

    handleSelectAction = (event:any, action:any) => {
        this.setState({ action });
    };
}

const styledTokenActions = withStyles(styles)(TokenActions);

export default connect((state:any) => ({
    wallet: state.wallet,
}))(styledTokenActions);