const express = require("express");
const routes = express.Router();
const billAndShip = require("../controller/billandship");


routes.post("/get_address_info",billAndShip.get_address_info);
routes.post("/get_address_list",billAndShip.get_address_list);
routes.post("/post_new_address",billAndShip.post_new_address);


module.exports = routes;
