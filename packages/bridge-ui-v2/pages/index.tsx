import React from "react"
import { Button } from "@material-ui/core";
import MyTokens from '../src/components/pages/MyTokens';

class Index extends React.Component<any> {
    render() {
        return(
            <MyTokens></MyTokens> 
        )
    }
}

export default Index;