import React from 'react';
import TokenCard from './TokenCard';

class GridView extends React.Component<any> {
    render() {
        const{tokens} = this.props;
        console.log(tokens);
        
        return(
            <>  
                {/* {tokens.map((network:any) => {
                    return network.tokens.map((token:any) => {

                        console.log(token);
                        return <TokenCard key={`${token.address}${token.network}`} network={network.network} address={token.address} name={token.name} symbol={token.symbol} balance={"1000000000000000000000"} decimals={token.decimals}/>
                    })
                })} */}
            </>
        )
    }
}

export default GridView