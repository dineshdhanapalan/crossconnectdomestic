const jwt = require("jsonwebtoken");
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const logger = require("./config/winston");
const https = require("https");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const auth = async (req, res, next) => {
  const userToken = req.header("Authorization") ? req.header("Authorization").replace("Bearer ", "") : null;
  if (!userToken) return res.send({ status: "Error", message: "Not Logged In" });
  try {
    const isLogged = await axios.get(`${process.env.APP_PATH}/onesify/auth/api/v1/is_auth/${userToken}`, { httpsAgent });
    if (isLogged.data.status == "Success") {
      let userDoc = isLogged.data.data;
      const decoded = jwt.verify(userToken, `${process.env.JWT_SECRET}`);
      req._id = decoded._id;
      req.companyId = userDoc[0].companyId;
      req.companyName = userDoc[0].companyName;
      req.roles = decoded.roles;
      req.email = userDoc[0].email;
      req.ebsAccountNo = userDoc[0].ebsaccountNo || null;
      req.firstName = userDoc[0].firstName.charAt(0).toUpperCase() + userDoc[0].firstName.slice(1);
      req.lastName = userDoc[0].lastName.charAt(0).toUpperCase() + userDoc[0].lastName.slice(1);
      const userExist = await axios.get(`${process.env.APP_PATH}/onesify/auth/api/v1/users/${userDoc[0].email}`, { httpsAgent });
      if (Array.isArray(userExist.data) && userExist.data.length) {
        next();
      } else {
        logger.error({ status: "Error", message: `User ID Not Registerd. Please contact One Sify Admin -- Local DB` });
        res.status(200).send({ status: "Error", message: `User ID Not Registerd. Please contact One Sify Admin  -- Local DB` });
        return;
      }
    } else if (isLogged.data.status == "Error") {
      let publicKEY = fs.readFileSync("./sso_public.key", "utf8");
      var verifyOptions = {
        algorithm: ["HS256"],
      };
      var legit = jwt.verify(userToken, publicKEY, verifyOptions);
      req._id = legit.onesify._id;
      req.companyId = legit.onesify.companyId;
      req.companyName = legit.onesify.companyName;
      req.roles = legit.onesify.roles;
      req.email = legit.onesify.email;
      req.ebsAccountNo = legit.onesify.ebsaccountNo;
      req.oscpartyId = legit.onesify.oscpartyId;
      req.firstName = legit.onesify.firstName.charAt(0).toUpperCase() + legit.onesify.firstName.slice(1);
      req.lastName = legit.onesify.lastName.charAt(0).toUpperCase() + legit.onesify.lastName.slice(1);
      req.token = userToken;
      const userExist = await axios.get(`${process.env.APP_PATH}/onesify/auth/api/v1/users/${legit.onesify.email}`, { httpsAgent });
      if (Array.isArray(userExist.data) && userExist.data.length) {
        next();
      } else {
        logger.error({ status: "Error", message: `User ID Not Registerd. Please contact One Sify Admin -- SSO` });
        res.status(200).send({ status: "Error", message: `User ID Not Registerd. Please contact One Sify Admin` });
        return;
      }
      return;
    } else {
      logger.error({ status: "Error", message: `Please Authenticate / Contact Admin` });
      res.status(200).send({ status: "Error", message: `Please Authenticate / Contact Admin` });
      return;
    }
  } catch (e) {
    console.log(e);
    logger.error({ status: "Error", message: `Please Authenticate` });
    res.status(401).send({ status: "Error", message: "Please Authenticate" });
  }
};

module.exports = auth;
