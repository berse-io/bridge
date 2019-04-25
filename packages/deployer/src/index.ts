import { ConfigManager } from "./config";
import { deploy } from "./deploy";

import '@ohdex/config';

const configMgr = ConfigManager.load()

deploy(configMgr)
.then(x => {
    console.log("Deployed successfully!")
})
.catch(err => {
    console.log(err);
    process.exit(-1)
})