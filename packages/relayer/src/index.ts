import { Relayer } from "./relayer";

let networks = require('@ohdex/config').networks;

let relayer = new Relayer(networks)
relayer.start()

process.on('SIGTERM', async () => {
    await relayer.stop();
    process.exit(0);
});