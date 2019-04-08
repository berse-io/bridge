import React from "react"
import { Button } from "@material-ui/core";
import TokenOverview from '../src/components/pages/TokenOverview';

class Index extends React.Component<any> {
    render() {
        return(
            <TokenOverview></TokenOverview> 
        )
    }
}

export default Index;