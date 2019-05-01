import React from 'react';
import {AppBar, Toolbar, Typography, Tabs, Tab, IconButton, withStyles} from '@material-ui/core';
import BackIcon from '@material-ui/icons/ArrowBack';
import Link from 'next/link';

interface Props {
    token: any,
    onSelect: any,
    selectedAction: number,
    classes: any,
}

const styles:any = (theme:any) => ({    
    indicator: {
        backgroundColor: "white",
    }
})


class HomeBar extends React.Component<Props, any> {

    render() {
        const{token, onSelect, selectedAction, classes} = this.props;

        return(
            <AppBar position="static" color="primary">
                <Toolbar>
                <Typography variant="h6" color="inherit">
                    <Link href="/"><IconButton color="inherit" ><BackIcon /></IconButton></Link>
                    {token.symbol}
                </Typography>                
                </Toolbar>
                <Tabs classes={{indicator: classes.indicator}} variant="fullWidth" value={selectedAction} onChange={onSelect}>
                    <Tab label="Send" />
                    <Tab label="Receive" />
                    <Tab label="Bridge" />
                    <Tab label="Buy/sell" />
                </Tabs>
            </AppBar>
        )
    }
    
}

export default withStyles(styles)(HomeBar);