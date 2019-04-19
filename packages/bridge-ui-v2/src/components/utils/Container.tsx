import React from 'react';
import { Grid, withStyles } from '@material-ui/core';

const styles:any = (theme:any) => ({
    root: {
    },
    inner: {
        overflow: "hidden",
    }

})

class Container  extends React.Component<any> {
    render() {
        const{classes} = this.props;

        return (
            <> 
                <Grid className={classes.root} container spacing={0} justify="center">
                    <Grid item className={classes.inner} xs={10}>
                        {this.props.children}
                    </Grid>
                </Grid>
            </>
        )
    }
}

export default withStyles(styles)(Container);