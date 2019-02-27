import { Relayer } from "./relayer";

let networks: any;

switch(process.env.NODE_ENV) {
    case 'development':
        networks = require('@ohdex/config/test_networks')
        break;
    default:
        networks = require('@ohdex/config/networks')
        break;
}

let relayer = new Relayer(networks)
relayer.start()

process.on('SIGTERM', async () => {
    await relayer.stop();
    process.exit(0);
});