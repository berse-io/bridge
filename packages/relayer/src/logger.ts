import { Provider } from "@loopback/context";

const winston = require('winston');
const { format } = winston;

// const logger = winston.createLogger({
//     transports: [
//         new winston.transports.Console()
//     ]
// });

export const logFormat = (formats) => format.combine(
    ...formats,
    format.colorize(),
    format.timestamp(),
    format.align(),
    format.printf(info => `${info.level} ${info.label}: ${info.message}`)
);


const { combine, label, json, simple } = format;

export let consoleOpts = {
    silent: process.env.NODE_ENV !== 'test',
    handleExceptions: true
}

export function chainLogger(chainId: string) {
    return winston.loggers.add(`chaintracker-${chainId}`, {
        format: logFormat([
            label({ label: chainId })
        ]),
        transports: [
            new winston.transports.Console(consoleOpts),
            new winston.transports.File({
                filename: `logs/${chainId}.log`,
                level: 'debug'
            })
        ]
    });
}

export const defaultLogger = () => winston.loggers.add(`relayer`, {
    format: logFormat([
        label({ label: "Relayer" })
    ]),
    transports: [
        new winston.transports.Console(consoleOpts),
        new winston.transports.File({
            filename: `logs/default.log`,
            level: 'debug'
        })
    ]
});

const MESSAGE = Symbol.for('message');

const jsonFormatter = (logEntry) => {
    const base = { timestamp: new Date() };
    const json = Object.assign(base, logEntry)
    if(typeof logEntry == 'object') {
        logEntry[MESSAGE] = JSON.stringify(json, null, 1);
    } else {
        logEntry[MESSAGE] = logEntry;
    }
    return logEntry;
  }

export class LoggerProvider implements Provider<any> {
    constructor(
    ) {
    }

    async value(): Promise<any> {
        let logger = winston.loggers.add(`default`, {
            format: format.simple(),
            transports: [
                // new winston.transports.Console(consoleOpts),
                new winston.transports.File({
                    filename: `logs/default.log`,
                    level: 'debug'
                })
            ]
        });

        
        return logger;
    }
}