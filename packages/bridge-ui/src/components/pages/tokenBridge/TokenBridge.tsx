import { Button, Grid, Paper, Step, StepLabel, Stepper, withStyles } from '@material-ui/core';
import React from 'react';
import NetworkPicker from './NetworkPicker';
import TokenSelector from './TokenSelector';
import AmountSelector from './AmountSelector';
import TokenReceiver from './TokenReceiver';
import {connect} from 'react-redux';
import getConfigValue from '../../../utils/getConfigValue';

import BridgeArtifact from '@ohdex/contracts/build/artifacts/Bridge.json'

const styles = (theme:any) => ({
    root : {
        marginTop: theme.spacing.unit * 4,
    }, 
    paper: {
        padding: theme.spacing.unit * 4,
        minHeight: "55vh",
    },
    stepContent: {
        minHeight: "30vh",
    }
})


class TokenBridge extends React.Component<any> {
    
    state = {
        currentStep: 0,
    }

    constructor(props:any) {
        super(props);
    }

    componentDidMount() {
        const {drizzle} = this.props;
        
        // On mount add token contract to truffle
        const Bridge = {
            contractName: "Bridge",
            web3Contract: new drizzle.web3.eth.Contract(BridgeArtifact.compilerOutput.abi, getConfigValue(this.props.drizzleState.web3.networkId, 'bridgeAddress'))
        } 
        
        drizzle.addContract(Bridge);

    }

    
    render(){
        const {classes} = this.props;
        const steps = this.getSteps();
        const {canContinue} = this.props.bridge;

        return(
            <Grid container className={classes.root} spacing={16} justify="center">
                
                <Grid item md={6}>
                    <Paper className={classes.paper}>
                    
                        <Stepper alternativeLabel nonLinear activeStep={this.state.currentStep}>
                            {steps.map((label, index) => {
                                const props = {};      
                                return (
                                <Step key={label} {...props}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                                );
                            })}
                        </Stepper>

                        <div className={classes.stepContent}>{this.getStepContent(this.state.currentStep)} </div>
                        <Grid
                            justify="space-between" // Add it here :)
                            container 
                            spacing={24}
                        >   

                            <Grid item>
                                {this.state.currentStep != 0 && <Button onClick={this.handleBack} variant="outlined" color="primary">Back</Button>}
                            </Grid>

                            <Grid item>
                                {canContinue && <Button onClick={this.handleNext} variant="contained" color="primary">Continue</Button>}
                            </Grid>
                        </Grid>
                        
                    </Paper>
                </Grid>
            </Grid>
        )
    }


    getSteps = () => {
        return [
            "Select Origin Chain",
            "Select Token",
            "Bridge Tokens",
            "Receive Bridged Tokens"
        ]
    }

    getStepContent = (step:number) => {
        switch (step) {
          case 0:
            return <NetworkPicker drizzleState={this.props.drizzleState} />;
          case 1:
            return <TokenSelector drizzle={this.props.drizzle} drizzleState={this.props.drizzleState} />;
          case 2:
            return <AmountSelector drizzle={this.props.drizzle} drizzleState={this.props.drizzleState}/>;
          default:
            return <TokenReceiver drizzle={this.props.drizzle} drizzleState={this.props.drizzleState}/>;
        }
    }

    handleNext = (event) => {
        this.setState((prevState) => ({
            currentStep: prevState.currentStep + 1
        }))
    }

    handleBack = (event) => {
        this.setState((prevState) => ({
            currentStep: prevState.currentStep - 1
        }))
    }
}

const styledTokenBridge = withStyles(styles)(TokenBridge);

export default connect(state => ({
    bridge: state.bridge,
}))(styledTokenBridge);