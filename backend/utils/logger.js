const winston = require('winston');
const path = require('path');

// กำหนด log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// สีสำหรับแต่ละ level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format สำหรับ log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// กำหนด transports
const transports = [
  // Console output
  new winston.transports.Console(),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
  }),
  
  // All logs file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/all.log'),
  }),
];

// สร้าง logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  format,
  transports,
});

// Helper functions
logger.logError = (message, error) => {
  logger.error(`${message}: ${error.message}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(error.stack);
  }
};

logger.logQuery = (query, params) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${query}`);
    if (params && params.length > 0) {
      logger.debug(`Params: ${JSON.stringify(params)}`);
    }
  }
};

logger.logAPI = (method, path, statusCode, duration) => {
  logger.http(`${method} ${path} ${statusCode} - ${duration}ms`);
};

module.exports = logger;
