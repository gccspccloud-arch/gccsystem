const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[Database] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
