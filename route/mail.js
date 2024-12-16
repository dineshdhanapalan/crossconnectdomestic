const express = require("express");
const routes = express.Router();
const mail = require("../controller/mail");
const auth=require("../auth")

routes.post("/send_mail_to_sign",auth, mail.send_mail_to_sign);

module.exports = routes;
