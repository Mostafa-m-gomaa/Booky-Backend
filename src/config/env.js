const dotenv = require('dotenv');
dotenv.config();


function must(name) {
const v = process.env[name];
if (!v) throw new Error(`Missing env var: ${name}`);
return v;
}


const ENV = {
PORT: Number(process.env.PORT || 5000),
NODE_ENV: process.env.NODE_ENV || 'development',
MONGO_URI: must('MONGO_URI'),
JWT_ACCESS_SECRET: must('JWT_ACCESS_SECRET'),
JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
JWT_REFRESH_SECRET: must('JWT_REFRESH_SECRET'),
JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || 'localhost'
};


const isProd = ENV.NODE_ENV === 'production';


module.exports = { ENV, isProd };