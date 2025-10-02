const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');  
const { ENV, isProd } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');


const app = express();


app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(isProd ? 'combined' : 'dev'));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));  // ← (2)

// Rate limit أساسي على مسارات الأوث
app.use('/api/v1/auth', rateLimit({ windowMs: 60 * 1000, max: 60 }));


app.use('/api/v1', routes);


app.use(notFound);
app.use(errorHandler);


module.exports = app;