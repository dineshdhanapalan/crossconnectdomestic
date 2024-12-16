const express = require("express");
const routes = express.Router();
const newConnection = require("../controller/newConnection");
const auth = require("../auth");


routes.get("/get_dc_details",newConnection.dcDetails);
routes.post("/post_dc_details",newConnection.postLocationDetails);
routes.post("/get_amount",newConnection.get_amount);
routes.post("/post_amount",newConnection.post_amount);
routes.post("/delete_details",newConnection.delete_details);
routes.post("/delete_product",newConnection.delete_product);
routes.post("/quote_submit/:reqId",newConnection.quote_submit);

routes.post("/opportunity",newConnection.opportunity);



module.exports = routes;
