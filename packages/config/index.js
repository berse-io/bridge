require('dotenv').config({
    path: require.resolve('@ohdex/config/.env')
})

let env = process.env.NODE_ENV;

let accounts;
let networks;

switch(env) {
    case 'test':
    case 'development':
        accounts = require('./test_accounts.json')
        networks = require('./test_networks.json')
        break;
    case 'production':
    default:
        accounts = require('../secrets/accounts.json')
        networks = require('./networks.json')
        break;
}

module.exports = {
    accounts,
    networks
}