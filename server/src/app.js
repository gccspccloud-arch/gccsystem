const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { CLIENT_URL, NODE_ENV } = require('./config/env');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl / health checks (no Origin header)
      if (!origin) return cb(null, true);
      if (CLIENT_URL.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Render health check ping — keep outside /api so it's always cheap & unauthenticated.
app.get('/healthz', (req, res) => res.status(200).send('ok'));

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
