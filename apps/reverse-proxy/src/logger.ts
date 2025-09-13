/**
 * W3 Suite Enterprise Reverse Proxy - Logging System
 * Winston-based logging with structured format and multiple transports
 */

import winston from 'winston';
import { config } from './config.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] ${service ? `[${service}] ` : ''}${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'w3suite-proxy' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Add file transport in production
if (config.environment === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/proxy-error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/proxy-combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
}

export default logger;