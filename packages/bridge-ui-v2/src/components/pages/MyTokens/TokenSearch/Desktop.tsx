import React from 'react';
import { Grid, Typography, Button, withStyles } from '@material-ui/core';
import {tokens} from '../../../../utils/getTokens';
import MUIDataTable from "mui-datatables";
import walletActions from '../../../../reducers/wallet/actionTypes'
import addTokenActions from '../../../../reducers/addToken/actionTypes';
import Router from 'next/router'
import { connect } from 'react-redux';


const columns = [
    {
        name: "symbol",
        lable: "Symbol",
        options: {
            filter: false,
        }
    }, 
    {
        name: "name",
        lable: "Name",
        options: {
            filter: false,
        }
    }, 
    {
        name: "network",
        lable: "Network",
        options: {
            filter: true,
            searchable: false,
        }
    }, 
    // {
    //     name: "Balance",
    //     options: {
    //         filter: false,
    //         searchable: false,
    //     }
    // },
    // {
    //     name: "Address",
    //     options: {
    //         filter: false,
    //     }
    // } 
    
];

const styles:any = (theme:any) => ({
    table: {
        width: "100% !important"
    }
})


class TokenOverview  extends React.Component<any> {

    render() {
        const{classes} = this.props;

        const options =  {
            filterType: 'dropdown',
            selectableRows: false,
            onRowClick: this.handleRowClick,
            elevation: 0,
            print: false,
            download: false,
            responsive: 'scroll',
        }
        
        return (
            <>            
                {tokens.length != 0 &&
                <MUIDataTable 
                    title={"Search Tokens"} 
                    data={tokens} 
                    columns={columns} 
                    options={options} 
                    className={classes.table}
                />}
            </>
        )
    }

    handleRowClick = (rowData: string[], rowMeta: { dataIndex: number, rowIndex: number }) => {
        console.log(rowData);
        console.log(rowMeta);
        // href={`/coin?network=${network}&address=${address}`} as={`/token/${network}/${address}`}
        const tokenData = tokens[rowMeta.dataIndex];


        const token : Token = {
            name: tokenData.name,
            symbol: tokenData.symbol,
            balance: "0",
            address: tokenData.address,
            network: tokenData.network
        }


        this.props.dispatch({
            type: walletActions.ADD_TOKEN,
            token
        })

        // this.handleClose();

        console.log(token);
    
    }
}

const styledTokenOverview =  withStyles(styles)(TokenOverview);

export default connect((state:any) => ({
    addToken: state.addToken,
}))(styledTokenOverview);
