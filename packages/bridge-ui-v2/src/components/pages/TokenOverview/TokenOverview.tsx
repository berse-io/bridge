import React from 'react';
import { Grid, Typography, Button } from '@material-ui/core';
import Container from '../../utils/Container';
import TokenCard from '../../partials/TokenCard';

const dummyData = [
    {
        address: "",
        network: "",
        balance: "",
        decimals: "",

    }
    
]

class TokenOverview  extends React.Component<any> {

    render() {
        return (
            <> 
                <Container>
                    <Grid container spacing={16} justify="flex-start">
                        <Grid item xs={6}>
                            <Typography component="h1" variant="h2" gutterBottom>
                                My Tokens
                            </Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <Grid container alignItems="flex-start" justify="flex-end" direction="row">
                                <Button variant="contained">Add Token</Button>
                            </Grid>
                        </Grid>
                    
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="OmiseGo" symbol="OMG" balance={"1000000000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"10000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"100000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="OmiseGo" symbol="OMG" balance={"1000000000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"10000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"100000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="OmiseGo" symbol="OMG" balance={"1000000000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"10000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"100000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="OmiseGo" symbol="OMG" balance={"1000000000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"10000000000000000"} decimals="18"/>
                        <TokenCard network="ethereum" address="0xd26114cd6EE289AccF82350c8d8487fedB8A0C07" name="Golem" symbol="GNT" balance={"100000000000000"} decimals="18"/>
                    </Grid>
                </Container>
            </>
        )
    }
}

export default TokenOverview;