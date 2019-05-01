
import React from 'react';
import {List, ListItem, Avatar, ListItemText, withStyles} from '@material-ui/core';

const styles:any = (theme:any) => ({
    tokenSymbol: {
        fontSize: 11
    }
  })

class TokenItem extends React.Component<any>{
    buttonPressTimer:any;
    render(){
        const{token, classes} = this.props;
        return(
            <ListItem 
                onTouchStart={this.handleButtonPress} 
                onTouchEnd={this.handleButtonRelease} 
                onMouseDown={this.handleButtonPress} 
                onMouseUp={this.handleButtonRelease} 
                onMouseLeave={this.handleButtonRelease} 
                onClick={this.props.onTokenClicked(token)}
            >
                <Avatar className={classes.tokenSymbol}>
                    {token.symbol}
                    {/* <ImageIcon /> */}
                </Avatar>
                <ListItemText 
                    primary={token.name}
                    secondary={token.balance}
                />
            </ListItem>
        )
    }

    handleButtonPress = () =>  {
        this.buttonPressTimer = setTimeout(() => this.props.onDeleteClicked(this.props.token), 1500);
    }

    handleButtonRelease = () => {
        clearTimeout(this.buttonPressTimer);
    }
}

export default withStyles(styles)(TokenItem);
