const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const bcrypt = require('bcryptjs');

exports.signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const token = this.signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email & password exists
  if (!email || !password) {
    // we do return here to say our login function finishes right away
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2. Check if the user exists && password is correct
  // using + in select will bring other details along with the password
  // if + is not used then only _id and password will be displayed
  const user = await User.findOne({ email: email }).select('+password');

  // password === $2b$12$iMIeldL9SE51s7NGSUyRDuZelvj3HWH5rSW5O8aeOlbWnquaA04qu

  // const correct = await user.comparePassword(password, user.password);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // console.log('user', user);
  // 3. If everything ok , send to client
  const token = this.signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Getting token and checking if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  console.log(token);
  if (!token) {
    return next(
      new AppError('You are not logged in ! Please log in to get access', 401)
    );
  }
  // 2. Verify token

  // 3. Check if user still exists

  // 4. Check if user changed password after the token was issued
  res.status(201).json({
    status: 'success',
  });
});
