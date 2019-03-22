import React from 'react';
import { Grid, Paper, withStyles, Typography } from '@material-ui/core';
import { fromWei } from 'web3-utils';
import Link from 'next/link';


const styles:any = (theme:any) => ({
    root: {
        cursor: 'pointer',
    },
    paper: {
        padding: theme.spacing.unit * 2,
    }
})

class TokenCard extends React.Component<any> {

    state = {
        hover: false,
    }

    render() {
        const{classes, name, symbol, balance, decimals, address, network} = this.props;

        return(
            <Grid className={classes.root} item xs={4}>
                <Link href={`/coin?network=${network}&address=${address}`} as={`/token/${network}/${address}`}>
                    <Paper elevation={this.state.hover ? 8 : 2 } onMouseOver={this.hover} onMouseLeave={this.hoverOff} className={classes.paper}>
                        <Typography variant="h6" align="center">{name}</Typography>
                        <Typography variant="subtitle1" align="center">{symbol}</Typography>
                        <Typography variant="subtitle2" align="center">{fromWei(balance)}</Typography>
                    </Paper>
                </Link>
            </Grid>
        ) 
    }
    hover = () =>  {
        this.setState({hover:true});
    }
    hoverOff = () =>  {
        this.setState({hover:false});
    }

}

export default withStyles(styles)(TokenCard);