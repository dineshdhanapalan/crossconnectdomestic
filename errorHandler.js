const logger = require("./config/winston");

exports.errorHandler = async (error, req, res, next) => {
  console.log(error);
  logger.error(`${req.path} -- ${req.method}`, { statusCode: error.statusCode || 200, status: "Error", message: error });
  res.status(error.statusCode || 200).send({ status: "Error", message: `${error}` });
};
