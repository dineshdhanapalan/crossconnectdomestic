const express = require("express");
const app = express();
const path = require("path");
const { errorHandler } = require("./errorHandler");
const logger = require("./config/winston");
const cors = require("cors");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerJsDoc = YAML.load("./api.yaml");
const https = require("https");
var fs = require("fs");
require("./db_config");
const auth = require("./auth");
global.appRoot = path.resolve(__dirname);

const publicDirectoryPath = path.join(__dirname, "/public");
app.use(express.static(publicDirectoryPath));
app.set("view engine", "hbs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/uploads", express.static("uploads"));

app.use("/onesify/crossconnect_domestic/docs", swaggerUi.serve, swaggerUi.setup(swaggerJsDoc));


const newConnection = require("./route/newConnection");
app.use("/onesify/crossconnect_domestic/new_connection", newConnection)

const common = require("./route/common");
app.use("/onesify/crossconnect_domestic/common", common)

const bill = require("./route/billAndShip");
app.use("/onesify/crossconnect_domestic/bill_and_ship",auth, bill)

const docusign = require("./route/docusign");
app.use("/onesify/crossconnect_domestic/docusign", docusign)

const mail = require("./route/mail");
app.use("/onesify/crossconnect_domestic/mail", mail)

const ErrorLog = function (req, res) {
  const file = `${appRoot}/logs/onesify_crossconnect_domestic_api_errors.log`;
  fs.readFile(file, (err, data) => {
    if (err) {
      res.status(404).send("Error Fetch Log File");
    }
    res.status(200).send(data);
  });
};

const ActivityLog = function (req, res) {
  const file = `${appRoot}/logs/onesify_crossconnect_domestic_api_activity.log`;
  fs.readFile(file, (err, data) => {
    if (err) {
      res.status(404).send("Error Fetch Log File");
    }
    res.status(200).send(data);
  });
};

app.get("/onesify/crossconnect_domestic/index", async (req, res) => {
  res.status(200).send({ status: "Success", message: "One Sify crossconnect_domestic API" });
});


app.get("/onesify/crossconnect_domestic/logs/:logname", async (req, res) => {
  if (req.params.logname === "error") {
    ErrorLog(req, res);
  } else if (req.params.logname === "activity") {
    ActivityLog(req, res);
  } else {
    res.status(404).send("No Log File Found");
  }
});

const options = {
  key: fs.readFileSync(`./cert/domain.com.key`),
  cert: fs.readFileSync(`./cert/server.crt`),
};

var server = https.createServer(options, app);


currentDate = new Date();
app.use(errorHandler);
server.listen(process.env.PORT || 4026, () => {
  logger.info(`One Sify crossconnect_domestic API is running on port ${process.env.PORT} at ${currentDate}`);
  console.log(`One Sify crossconnect_domestic API is running on port ${process.env.PORT} at ${currentDate}`);
});
