import React from "react"
import TokenActions from '../src/components/pages/TokenActions';

class Coin extends React.Component<any> {
    render() {
        console.log(this.props);
        return(
            <TokenActions></TokenActions> 
        )
    }
}

export default Coin;