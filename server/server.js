require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();
