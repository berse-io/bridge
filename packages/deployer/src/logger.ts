const winston = require('winston');
const { format } = winston;

export const logFormat = (formats) => format.combine(
    ...formats,
    format.colorize(),
    format.timestamp(),
    format.align(),
    format.printf(info => `${info.level} ${info.label}: ${info.message}`)
);