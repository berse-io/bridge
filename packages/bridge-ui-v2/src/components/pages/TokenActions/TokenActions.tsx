import React from 'react';
import { Grid, Button, FormControl, InputLabel, Select, MenuItem, Typography, withStyles, Tabs, Tab, TextField, IconButton } from '@material-ui/core';
import Slider from '@material-ui/lab/Slider';
import Container from '../../utils/Container';
import { connect } from 'react-redux';
import WalletGate from '../../wallet/WalletGate';
import walletActions from '../../../reducers/wallet/actionTypes'
import QrCode from 'qrcode.react';
import Link from 'next/link';
import nameToNetwork from '../../../utils/nameToNetwork';
import BackIcon from '@material-ui/icons/ArrowBack';


const styles:any = (theme:any) => ({
    formControl: {
        width: "100%",
    },
    qrCode: {
        width: "100%",
        height: "auto",
    },
    spacer: {
        paddingTop: theme.spacing.unit * 10,
    }
})

class TokenActions  extends React.Component<any> {

    state = {
        action: 0,
        amount: "",
        to: "",
        tokenIndex: 0,
        gasSlider: "50",
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

        console.log(this.state.gasPrice);

        if(!token) {
            return <></>
        }


        return (
            <WalletGate>
                <Container>
                    <Typography component="h1" variant="h4" gutterBottom>
                    <Link href="/"><IconButton color="default" ><BackIcon /></IconButton></Link>{token.symbol} ({token.name}) - {token.network}
                    </Typography>
                    <form noValidate autoComplete="off">
                        <Grid container spacing={16} justify="flex-start">
                            <Grid item xs={12}>
                                <Tabs
                                    value={this.state.action}
                                    onChange={this.handleSelectAction}
                                    variant="fullWidth"
                                    indicatorColor="secondary"
                                    textColor="secondary"
                                    >
                                    <Tab label="Send" />
                                    <Tab label="Receive" />
                                    <Tab label="Bridge" />
                                    <Tab label="Buy/Sell" />
                                    {/* <Tab icon={<SendIcon />} label="SEND" />
                                    <Tab icon={<FavoriteIcon />} label="BRIDGE" /> */}
                                    {/* <Tab icon={<PersonPinIcon />} label="SWAP" /> */}
                                </Tabs>
                            </Grid>
                            {this.state.action != 1 ? <>
                                <Grid item xs={6}>
                                    <TextField
                                        id="amount"
                                        label={`Amount (Balance: ${token.balance})`}
                                        value={this.state.amount}
                                        onChange={this.handleChange('amount')}
                                        margin="normal"
                                        fullWidth
                                        type="number"
                                    />
                                </Grid>

                                <Grid item xs={6}>
                                    <TextField
                                        id="to"
                                        label="Receiver"
                                        value={this.state.to}
                                        onChange={this.handleChange('to')}
                                        margin="normal"
                                        fullWidth
                                        type="text"
                                    />
                                </Grid>

                                { this.state.action == 2 && <Grid item xs={6}>
                                    <FormControl className={classes.formControl}>
                                        <InputLabel htmlFor="network">Network</InputLabel>
                                        <Select
                                            value={"Ethereum"}
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
                            
                                <Grid item xs={6}>                    
                                    <Typography id="label">Gas Price: {this.state.gasPrice} Gwei</Typography>
                                    <Slider
                                    classes={{ container: classes.slider }}
                                    value={this.state.gasSlider}
                                    aria-labelledby="label"
                                    onChange={this.handleSlider}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Grid style={{height: "100%"}} container alignItems="flex-end" justify="flex-end" direction="row">
                                        <Button variant="contained" onClick={this.handleSend} color="primary">SEND</Button>
                                    </Grid>
                                </Grid>
                           </> : 
                           
                           
                           <>
                                <div className={classes.spacer}> </div>
                                <Grid item xs={4}>
                                    <QrCode className={classes.qrCode} value={this.props.wallet.ethereum.address} renderAs="svg"/>
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="h6">Address: {this.props.wallet.ethereum.address}</Typography>
                                    <Typography>Send funds to this address to use them in your Berse wallet.</Typography>
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
        
        console.log(network);

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