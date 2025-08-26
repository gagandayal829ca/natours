const mongoose = require('mongoose');
const { default: slugify } = require('slugify');

const tourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [
        40,
        'A tour name must haive less or equal than 40 characters',
      ],
      minlength: [
        5,
        'A tour name must have greater or equal than 10 characters',
      ],
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    slug: {
      type: String,
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //the val is the priceDiscount value sent in the current doc
          // Important: this here points to a newly created document , but it wont run on update query
          return val < this.price;
        },
        // We can access the val in message using {VALUE} , this method is specific to mongoose not JS
        message: 'Discount price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
    },
    startLocation: {
      // GeoJSON -> Mongodb uses it to mention geospatial data
      // We have locations , which we saw will be embedded
      type: {
        type: String,
        default: 'Point', // We can specify multiple geometries in mondodb, default one is always point , we can also specify polygon, lines or other geometries.
        enum: ['Point'],
      },
      coordinates: [Number], // This will hold the coordinates like longitude first and then latitude, in google coordinates are longitude first and then latitude
      address: String,
      description: String,
    },
    /** For embedded documents we always need to create an array,
     *  So by specifying array of objects you can create new documents inside the parent document
     */
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number, // This will be the day of the tour when people will go to this location
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Document Middleware
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// Query Middleware
// In this middleware the 'this' keyword actually points towards the query we are running not the
// document because we are not processing any document here. 'this' in this will be a query object
// so we can chain different query methods
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  console.log('completed');
  console.log(docs);
  next();
});

// Aggregation middleware , it is used for modifying the aggregation pipeline , so
// the filter that we did for secret tours , will be coming in the get tour stats route
// so we need to filter that out from their and we can use aggregation middleware for that
// this keyword here will give us aggregation object

tourSchema.pre('aggregate', function (next) {
  console.log(this.pipeline());
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
