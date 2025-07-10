// Global error handling middleware
const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational error, trusted error: send message to client

  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // Programming or other unknown error: don't leak error details
  } else {
    //  1. Log the error
    console.error('Error 💣', err);

    // 2. Send the generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  //   console.log(err.stack);
  console.log('err', err);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // Creating a hard copy of error object because it is not good practice to
    // change the argument err directly

    let error = Object.create(err);

    if (error.name === 'CastError') {
      console.log('inside 2');
      error = handleCastErrorDB(error);
    }

    sendErrorProd(error, res);
  }

  // res.status(err.statusCode).json({
  //   status: err.status,
  //   message: err.message,
  // });
};
