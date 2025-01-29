const  { createLogger, format, transports } =require('winston');
require('dotenv').config();
const logger = createLogger({
  level: 'info', // default level
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ level, message, timestamp }) => `${timestamp} [${level.toUpperCase()}]: ${message}`),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }), //  errors
    new transports.File({ filename: 'logs/combined.log' }) // everything
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  );
}

module.exports= logger;
