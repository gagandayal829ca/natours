const crypto = require('crypto');
const { promisify } = require('util');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const bcrypt = require('bcryptjs');

exports.signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  /** The secure we will only set in production and it will be added using cookieOptions.secure = true
   *  Not removing secure from below to get an idea on how it is sent
   */
  // secure: true, // This make sure cookie is sent over https connections only, use in production
  httpOnly: true, // This will prevent cross site scripting attacks, browsers will be unable to modify cookie when true
};

if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

const createSendToken = (user, statusCode, res) => {
  const token = this.signToken(user._id);
  res.cookie('jwt', token, cookieOptions);

  /** The reason we set it to undefined is that the encrypted password shows up when sign up new user
   *  we had done select as false in get all users but sign up is different.
   */
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  createSendToken(newUser, 201, res);
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
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Getting token and checking if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in ! Please log in to get access', 401)
    );
  }
  // 2. Verify token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log('decoded', decoded);
  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this user no longer exits', 401)
    );
  }

  // 4. Check if user changed password after the token was issued

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }

  // Grant access to protected route
  // Putting user data in request.user
  // The req object is what that moves from middleware to middleware
  // So to move data we assign the currentuser to req.user
  req.user = currentUser;
  next();
});

// To implement the below, we need a way to pass arguments like admin and lead-guide used in tourRoutes
// For this we will create a wrapper function which will return the middleware function that we want to create
exports.restrictTo = (...roles) => {
  // The middleware below will have access to ...roles array because there is a closure
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      // This comes from the protect route because we put the user in request( req.user = currentUser)
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that Email address', 404));
  }

  // 2. Generate the random token
  // We will write this on user instance method i.e the model
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didnt forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (error) {
    // If an error occurs we need to change passwordResetToken and
    // passwordResetExpires to undefined so that we can generate new ones for
    // another request
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on token
  const hashedToken = crypto
    .createHash('SHA256')
    .update(req.params.token)
    .digest('hex');

  // We will get the user now based on token above , because we don't have anything other than :token from params
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // we are checking if passwordResetExpires is greater than current time, if yes then it is expire is in future
  });
  // 2. If token has not expired , and there is user , set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400)); // 400 bad request
  }

  user.password = req.body.password; // We will send the password and passwordConfirm via the body
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. Update changedPasswordAt property for the user
  // 4. Log the user in, send JWT
  // Sometimes this token is created before the changePasswordAt timestamp is created
  // We fix that by adding a - 1000ms time , while creating passwordChangedAt , not 100% accurate
  // but 1 sec doesn't make too much difference
  createSendToken(user, 200, res);
});

/** This functionality is only for logged in users
 *  Still this needs that old password should be entered before updating the password
 *  Eg. If someone gets access to your computer and it has you logged in then he can change password
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection

  const user = await User.findById(req.user._id).select('+password');

  // 2. Check if posted password is correct

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3. If so, update the password
  // This time we didn't turn off the validation because
  // we need to check if passwordConfirm === password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();
  // 4. Log the user in , send JWT
  createSendToken(user, 200, res);
});
