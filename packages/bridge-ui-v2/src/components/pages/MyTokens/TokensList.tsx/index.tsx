import React from 'react';
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';
import Desktop from './Desktop';
import Mobile from './Mobile';

class TokenList extends React.Component<any> {

    render() {
        if(isWidthUp('lg', this.props.width)) {
            return(
                <Desktop onTokenClicked={this.props.onTokenClicked} tokens={this.props.tokens} onDeleteClicked={this.props.onDeleteClicked} />
            )
        }
        else {
            return(
                <Mobile onTokenClicked={this.props.onTokenClicked} tokens={this.props.tokens} onDeleteClicked={this.props.onDeleteClicked} />
            )
        }
    }
}

const withWidthTokenList = withWidth()(TokenList);

export default withWidthTokenList;