const pino = require('pino');
const { isProd } = require('../config/env');


const logger = pino({
transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
level: isProd ? 'info' : 'debug'
});


module.exports = { logger };