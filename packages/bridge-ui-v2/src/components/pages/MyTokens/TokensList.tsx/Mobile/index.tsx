import React from 'react';
import {List, withStyles} from '@material-ui/core';
import TokenItem from './TokenItem';

const styles:any = (theme:any) => ({
  tokenSymbol: {
      fontSize: 11
  }
})

class Mobile extends React.Component<any> {
    render() {
        const{tokens, classes} = this.props;
        return(
            <List> 
                {tokens.map((token:any) => (
                    <TokenItem onTokenClicked={this.props.onTokenClicked} token={token}/>
                ))} 
            </List>
        )
    }
}

export default withStyles(styles)(Mobile);