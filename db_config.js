const mongoose = require("mongoose");
const logger = require("./config/winston");
require("dotenv").config();

mongoose.connect(`${process.env.MONGODB_CLUSTER}/${process.env.MONGODB_DBNAME}`);

const db = mongoose.connection;

db.on("error", () => {
  logger.info(console, "NSE Database connection error");
  console.error.bind(console, "NSE Database connection error");
});

db.once("open", () => {
  logger.info(`NSE Database connected successfully`);
  console.info("NSE Database connected successfully");
});

const loginDB = mongoose.createConnection(`${process.env.MONGODB_CLUSTER}/${process.env.MONGODB_DBNAME_LOGIN}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

loginDB.on("error", () => {
  console.error.bind(console, "Login Database connection error");
});

loginDB.once("open", () => {
  console.info("Login Database connected successfully");
});


module.exports = {db,loginDB};
