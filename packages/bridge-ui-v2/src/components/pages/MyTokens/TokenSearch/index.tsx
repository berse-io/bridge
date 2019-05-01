import React from 'react';
import Desktop from './Desktop';
import Mobile from './Mobile';
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';


class TokenSearch extends React.Component<any>{
    render(){
        if(isWidthUp('lg', this.props.width)) {
            return(
                <Desktop />
            )
        } else {
            return(
                <Mobile />
            )
        }
    }
}

const withWidthTokenSearch = withWidth()(TokenSearch);

export default withWidthTokenSearch;