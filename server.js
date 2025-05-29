const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    console.log(`DB connection successful`);
  });

const app = require('./app');

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server started at PORT: ${PORT}`);
});
