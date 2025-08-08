const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();
app.use(express.json());

// console.log(process.env.NODE_ENV);
// 1. Global Middlewares
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // window milliseconds
  message: 'Too many requests from this IP, please try again in an hour!',
});

/** We need to limit every route , so we use /api meaning limit every route starting with /api */
app.use('/api', limiter);
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers);
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Natours backend project',
    app: 'Natours',
  });
});

// 3. Routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('/{*any}', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server !`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server !`);
  // err.statusCode = 404;
  // err.status = 'failed';

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// 4. App export to use in server.js
module.exports = app;
