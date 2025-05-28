const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server started at PORT: ${PORT}`);
});
