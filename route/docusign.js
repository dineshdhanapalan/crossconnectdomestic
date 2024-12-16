const express = require("express");
const routes = express.Router();
const common = require("../controller/docusign");


routes.get("/get_po_doc/:reqId",common.get_po_doc);
routes.get("/view_po_doc/:reqId",common.view_po_doc);
routes.get("/get_proposal_doc/:reqId",common.get_proposal_doc);
routes.get("/view_proposal_doc/:reqId",common.view_proposal_doc);


module.exports = routes;
