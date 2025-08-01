const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find({});

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Create error if user Posts password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }
  // 2. Update user document
  /** We are using filter object because in the controller we are updating user data
   *  and anyone if not filtered can pass role = "admin" in the req.body and can update his role
   *  which should not done , hence we filter that it consists only name and email.
   *  Important: Here we use findByIdAndUpdate not save because we only want user data updated not the password
   *  the validators for passwords will run if we use that is the reason we only used user.save() during
   *  password updated and not the findByIdAndUpdate
   */
  const filteredBody = filterObj(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route has not been implemented yet',
  });
};

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route has not been implemented yet',
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route has not been implemented yet',
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route has not been implemented yet',
  });
};
