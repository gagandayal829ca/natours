// const fs = require('fs');
const Tour = require('./../models/tourModel');
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

exports.getAllTours = async (req, res) => {
  try {
    // Build Query
    // 1A) Filtering

    let queryObj = { ...req.query };

    console.log(queryObj);
    queryObj = qs.parse(queryObj);
    console.log('queryObj', queryObj);
    const excludedFields = ['sort', 'limit', 'page', 'fields'];

    excludedFields.forEach((el) => {
      return delete queryObj[el];
    });

    // 1B. Advanced Filtering

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    console.log(JSON.parse(queryStr));

    /** We should not await the below query because we will be chaining different methods
     *  because when we await find it will return us with the query so we await the main
     *  query later
     */

    let query = Tour.find(JSON.parse(queryStr));

    // 2. Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // 3. Field Limiting

    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');

      query = query.select(fields);
    } else {
      // Just excluding the __v field from mongodb in else nothing mandatory
      query = query.select('-__v');
    }

    // 4. Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numTours = await Tour.countDocuments();

      if (skip >= numTours) throw new Error('This page does not exist');
    }

    // Execute Query
    const tours = await query;

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: tours,
    });
  } catch (error) {
    // 404: Not Found
    res.status(404).json({
      status: 'fail',
      message: error,
    });
  }
  // res.status(200).json({
  //   status: 'success',
  //   requestedAt: req.requestTime,
  //   results: tours.length,
  //   data: {
  //     tours,
  //   },
  // });
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    // can also be done like below
    // const tour = await Tour.findOne({ _id: req.params.id});

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'fail',
      message: error,
    });
  }

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
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (error) {
    // 400 for bad request
    res.status(400).json({
      status: 'fail',
      message: error,
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(404).json({
      status: 'fail',
      message: error,
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(404).json({
      status: 'fail',
      message: error,
    });
  }

  res.status(204).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>',
    },
  });
};
