import React from 'react';
import { Grid, Typography, Button, withStyles } from '@material-ui/core';
import Container from '../../utils/Container';
import GridView from './GridView';
import getTokens from '../../../utils/getTokens';
import MUIDataTable from "mui-datatables";
import Router from 'next/router'
import WalletGate from '../../wallet/WalletGate';

const columns = [
    {
        name: "Symbol",
        options: {
            filter: false,
        }
    }, 
    {
        name: "Name",
        options: {
            filter: false,
        }
    }, 
    {
        name: "Network",
        options: {
            filter: true,
            searchable: false,
        }
    }, 
    {
        name: "Balance",
        options: {
            filter: false,
            searchable: false,
        }
    },
    {
        name: "Address",
        options: {
            filter: false,
        }
    } 
    
];

const styles:any = (theme:any) => ({
    table: {
        width: "100% !important"
    }
})


class TokenOverview  extends React.Component<any> {

    state = {
        tokens: [],
    }

    componentWillMount() {
        this.getData();
    }

    render() {
        const{classes} = this.props;

        const options =  {
            filterType: 'dropdown',
            selectableRows: false,
            onRowClick: this.handleRowClick,
        }
        
        return (
            <WalletGate> 
                <Container>
                    <Grid container spacing={16} justify="flex-start">
                        <Grid item xs={12}>
                            <Grid container alignItems="flex-start" justify="flex-end" direction="row">
                                <Button variant="contained" color="primary">Add Token</Button>
                            </Grid>


                            
                        </Grid>

                        <Grid item xs={12}>
                            {this.state.tokens.length != 0 &&
                            <MUIDataTable 
                                title={"Your Tokens"} 
                                data={this.state.tokens} 
                                columns={columns} 
                                options={options} 
                                className={classes.table}
                            />}
                        </Grid>
                        
                    </Grid>
                </Container>
            </WalletGate>
        )
    }

    getData = async () => {
        this.setState({
            tokens: await getTokens()
        })
    }

    handleRowClick = (rowData: string[], rowMeta: { dataIndex: number, rowIndex: number }) => {
        console.log(rowData);
        console.log(rowMeta);
        // href={`/coin?network=${network}&address=${address}`} as={`/token/${network}/${address}`}
        Router.push(`/coin?network=${rowData[2].toLowerCase()}&address=${rowData[4]}`, `/token/${rowData[2].toLowerCase()}/${rowData[4]}`);
    }
}

export default withStyles(styles)(TokenOverview);