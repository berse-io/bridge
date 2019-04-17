import React from 'react';
import { Grid, withStyles } from '@material-ui/core';

const styles:any = (theme:any) => ({
    root: {
        paddingTop: theme.spacing.unit * 4,
        margin: "0px -16px",
    }
})

class Container  extends React.Component<any> {
    render() {
        const{classes} = this.props;

        return (
            <> 
                <Grid className={classes.root} container spacing={0} justify="center">
                    <Grid item xs={10}>
                        {this.props.children}
                    </Grid>
                </Grid>
            </>
        )
    }
}

export default withStyles(styles)(Container);