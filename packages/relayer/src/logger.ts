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

const consoleOpts = {
    silent: process.env.NODE_ENV !== 'test'
}

export function chainLogger(chainId: string) {
    return winston.loggers.add(`chaintracker-${chainId}`, {
        format: logFormat([
            label({ label: chainId })
        ]),
        transports: [
            new winston.transports.Console(consoleOpts)
        ]
    });
}

export const defaultLogger = winston.loggers.add(`relayer`, {
    format: logFormat([
        label({ label: "Relayer" })
    ]),
    transports: [
        new winston.transports.Console(consoleOpts)
    ]
});