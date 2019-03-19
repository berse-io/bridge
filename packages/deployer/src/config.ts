import { writeFileSync } from 'fs';

const env = process.env.NODE_ENV;
class ConfigManager {
    configPath: string;
    config: any;

    constructor(configPath: string) {
        this.configPath = configPath;
        this.config = require(configPath)
    }

    static load() {
        let relpath: string = "";
        switch(env) {
            case 'test':
            case 'development':
                relpath = "@ohdex/config/test_networks.json"
                break;
            case 'production':
                relpath = "@ohdex/config/networks.json";
                break;
            default:
                throw new Error("NODE_ENV null")
        }
        
        return new ConfigManager(require.resolve(relpath))
    }

    save() {
        console.log("Writing deployed contracts to config");
        writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
    }
}

export {
    ConfigManager
}