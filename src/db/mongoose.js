const mongoose = require('mongoose');
const { ENV } = require('../config/env');


mongoose.set('strictQuery', true);


async function connectDB() {
    try{
        await mongoose.connect(ENV.MONGO_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}


module.exports = { connectDB };