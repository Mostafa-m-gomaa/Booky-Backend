const { ENV } = require('./config/env');
const { logger } = require('./lib/logger');
const { connectDB } = require('./db/mongoose');
const app = require('./app');


connectDB()
.then(() => {
app.listen(ENV.PORT, () => logger.info(`✓ Server running on http://localhost:${ENV.PORT}`));
})
.catch((err) => {
logger.error(err, 'Failed to start');
process.exit(1);
});