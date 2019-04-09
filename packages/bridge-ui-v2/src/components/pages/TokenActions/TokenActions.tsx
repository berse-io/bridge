import React from 'react';
import { Grid, Button, FormControl, InputLabel, Select, MenuItem, Typography, withStyles, Tabs, Tab, TextField } from '@material-ui/core';
import Container from '../../utils/Container';
import {getToken} from '../../../utils/getTokens';
import { getSignatureParameters } from 'web3-utils/types';
import { networkInterfaces } from 'os';
import WalletGate from '../../wallet/WalletGate';

// import SendIcon from '@material-ui/icons/Send';
// import FavoriteIcon from '@material-ui/icons/Favorite';



const styles:any = (theme:any) => ({
    formControl: {
        width: "100%",
    }
})

class TokenActions  extends React.Component<any> {

    state = {
        action: 0,
        amount: "",
        to: "",
        token: "",
    }

    componentDidMount() {
        this.loadToken();
    }

    render() {
        const{classes} = this.props;
        const{token} = this.state;

        console.log(token);

        if(!token) {
            return <></>
        }

        return (
            <WalletGate>
                <Container>
                    <Typography component="h1" variant="h2" gutterBottom>
                        {token.symbol} ({token.name}) - {token.network}
                    </Typography>
                    <form noValidate autoComplete="off">
                        <Grid container spacing={16} justify="flex-start">
                            {/* <Grid item xs={6}>
                                <FormControl className={classes.formControl}>
                                    <InputLabel htmlFor="Token">Token</InputLabel>
                                    <Select
                                        value={"ETH"}
                                        inputProps={{
                                        name: 'Token',
                                        id: 'Token',
                                        }}
                                    >
                                        {
                                            this.state.tokens.map((token:any) => {
                                                return <MenuItem value={"ETH"}>Ether</MenuItem>
                                            })
                                        }
                                    </Select>
                                </FormControl>
                            </Grid> */}

                            <Grid item xs={12}>
                                <Tabs
                                    value={this.state.action}
                                    onChange={this.handleSelectAction}
                                    variant="fullWidth"
                                    indicatorColor="secondary"
                                    textColor="secondary"
                                    >
                                    <Tab label="SEND" />
                                    <Tab label="BRIDGE" />
                                    <Tab label="Buy/Sell" />
                                    {/* <Tab icon={<SendIcon />} label="SEND" />
                                    <Tab icon={<FavoriteIcon />} label="BRIDGE" /> */}
                                    {/* <Tab icon={<PersonPinIcon />} label="SWAP" /> */}
                                </Tabs>
                            </Grid>

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
                                    type="number"
                                />
                            </Grid>

                            { this.state.action == 1 && <Grid item xs={6}>
                                <FormControl className={classes.formControl}>
                                    <InputLabel htmlFor="network">Network</InputLabel>
                                    <Select
                                        value={"ETH"}
                                        inputProps={{
                                        name: 'Token',
                                        id: 'Token',
                                        }}
                                    >
                                        <MenuItem value={"ETH"}>Ethereum</MenuItem>
                                        <MenuItem value={"GNT"}>TEZOS</MenuItem>
                                        <MenuItem value={"OMG"}>Aeternity</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid> }
                            {/* {this.state.action == 1 && 
                                <Grid item xs={6}>
                                    <FormControl className={classes.formControl}>
                                        <InputLabel htmlFor="network">Destination Network</InputLabel>
                                        <Select
                                            value={"ETH"}
                                            inputProps={{
                                            name: 'Token',
                                            id: 'Token',
                                            }}
                                        >
                                            <MenuItem value={"ETH"}>Ethereum</MenuItem>
                                            <MenuItem value={"GNT"}>TEZOS</MenuItem>
                                            <MenuItem value={"OMG"}>Aeternity</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            } */}

                            <Grid item xs={12}>
                                <Grid style={{height: "100%"}} container alignItems="flex-end" justify="flex-end" direction="row">
                                    <Button variant="contained" color="primary">SEND</Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </form>
                    
                </Container>
            </WalletGate>
        )
    }

    loadToken = async () => {

        let networkAndToken = window.location.pathname.split("/");
        this.setState({
            token: await getToken(networkAndToken[3], networkAndToken[2]),
        });
    } 

    handleChange = (name:string) => (event:any) => {
        this.setState({ [name]: event.target.value });
    };

    handleSelectAction = (event:any, action:any) => {
        this.setState({ action });
    };
}

export default  withStyles(styles)(TokenActions);