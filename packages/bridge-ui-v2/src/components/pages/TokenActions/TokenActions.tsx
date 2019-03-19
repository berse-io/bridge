import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, Typography, withStyles } from '@material-ui/core';
import Container from '../../utils/Container';

const styles:any = (theme:any) => ({
    formControl: {
        width: "100%",
    }
})

class TokenActions  extends React.Component<any> {

    render() {
        const{classes} = this.props;

        return (
            <> 
                <Container>
                    <Typography component="h1" variant="h2" gutterBottom>
                        Token Actions
                    </Typography>
                    <form noValidate autoComplete="off">
                        <Grid container spacing={16} justify="flex-start">
                            <Grid item xs={6}>
                                <FormControl className={classes.formControl}>
                                    <InputLabel htmlFor="Token">Token</InputLabel>
                                    <Select
                                        value={"ETH"}
                                        inputProps={{
                                        name: 'Token',
                                        id: 'Token',
                                        }}
                                    >
                                        <MenuItem value={"ETH"}>Ether</MenuItem>
                                        <MenuItem value={"GNT"}>GNT</MenuItem>
                                        <MenuItem value={"OMG"}>OMG</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </form>
                    
                </Container>
            </>
        )
    }
}

export default  withStyles(styles)(TokenActions);