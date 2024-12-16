const express = require("express");
const routes = express.Router();
const common = require("../controller/common");


routes.post("/get_quote",common.get_quote);
routes.post("/get_quote_list",common.get_quote_list);
routes.post("/change_quote_status",common.change_quote_status);
routes.post("/get_quote_summary",common.get_quote_summary);
routes.get("/share_and_sign/:reqId/:name/:mail", common.share_and_sign);


module.exports = routes;
