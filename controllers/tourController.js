// const fs = require('fs');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const qs = require('qs');

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour id is: ${val}`);
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }

//   next();
// };

// exports.checkBody = (req, res, next) => {
//   const { name, price } = req.body;

//   if (!name || !price) {
//     return res.status(400).json({
//       status: 'failed',
//       message: 'The req body does not contain name or price',
//     });
//   }

//   next();
// };

exports.aliasTopTours = (req, res, next) => {
  /** This is a difficult route to implement now because in recent version of express the req.query is immutable
   *  We have to figure out ways to implement this route
   */
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// class APIFeatures {
//   constructor(query, queryString) {
//     this.query = query;
//     this.queryString = queryString;
//   }

//   filter() {
//     let queryObj = { ...this.queryString };

//     queryObj = qs.parse(queryObj);

//     const excludedFields = ['sort', 'limit', 'page', 'fields'];
//     console.log('in filter');
//     excludedFields.forEach((el) => {
//       return delete queryObj[el];
//     });

//     // 1B. Advanced Filtering

//     let queryStr = JSON.stringify(queryObj);
//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

//     /** We should not await the below query because we will be chaining different methods
//      *  because when we await find it will return us with the query so we await the main
//      *  query later
//      */
//     this.query = this.query.find(JSON.parse(queryStr));
//     // let query = Tour.find(JSON.parse(queryStr));
//     return this;
//   }

//   sort() {
//     if (this.queryString.sort) {
//       const sortBy = this.queryString.sort.split(',').join(' ');
//       console.log('in sort');
//       this.query = this.query.sort(sortBy);
//     } else {
//       this.query = this.query.sort('-createdAt');
//     }

//     return this;
//   }

//   limitFields() {
//     if (this.queryString.fields) {
//       const fields = this.queryString.fields.split(',').join(' ');
//       console.log('in limitfields');
//       this.query = this.query.select(fields);
//     } else {
//       // Just excluding the __v field from mongodb in else nothing mandatory
//       this.query = this.query.select('-__v');
//     }

//     return this;
//   }

//   pagination() {
//     const page = this.queryString.page * 1 || 1;
//     const limit = this.queryString.limit * 1 || 100;
//     const skip = (page - 1) * limit;
//     console.log('in pagination');
//     this.query = this.query.skip(skip).limit(limit);

//     return this;
//   }
// }

exports.getAllTours = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  // can also be done like below
  // const tour = await Tour.findOne({ _id: req.params.id});

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });

  // if (!tour) {
  //   return res.status(404).json({
  //     status: 'fail',
  //     message: 'Invalid Id',
  //   });
  // }
  // res.status(200).json({
  //   status: 'success',
  //   data: tour,
  // });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    message: 'success',
    data: {
      tour,
    },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  await Tour.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });

  res.status(204).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>',
    },
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $avg: 'ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // remember id is now difficulty after going through pipeline so we used $ne: 'EASY'
    {
      $match: { _id: { $ne: 'EASY' } },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Below is for getting the max number of tours in a month
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
