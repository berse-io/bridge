import React from 'react';
import {AppBar, Toolbar, Typography} from '@material-ui/core';


class HomeBar extends React.Component {

    render() {
        return(
            <AppBar position="static" color="primary">
                <Toolbar>
                <Typography variant="h6" color="inherit">
                    Berse
                </Typography>
                </Toolbar>
            </AppBar>
        )
    }
    
}

export default HomeBar;