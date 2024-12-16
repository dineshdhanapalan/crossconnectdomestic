const Quote = require("../model/quote");
const logger = require("../config/winston");
const fs = require("fs");
const puppeteer = require("puppeteer");
const axios = require("axios");
const handlebars = require("handlebars");
const moment = require("moment");
const { loginDB } = require("../db_config");

exports.get_po_doc = async (req, res, next) => {
  const fileName = req.params.reqId;

  try {
    if (!fileName) {
      throw new Error("Missing Parameter");
    }

    const reqId = fileName.match(/\d+/g)?.join("");
    if (!reqId) {
      throw new Error("Invalid reqId");
    }

    const docs = await Quote.findOne({ reqId });
    if (!docs) {
      throw new Error("Quote not found");
    }

    const billingAddress = docs.billingToAddress;
    const shippingAddress = docs.shippingAddress;
    const plan1 = docs.planDetails[0];
    const plan2 = docs.planDetails[1] || null;

    console.log(docs.createdDate)
    const validTillDate = moment(docs.createdDate).add(30, 'days').format('DD-MMM-YYYY');

    const quote = {
      ...docs.toObject(),
      billingAddress,
      shippingAddress,
      plan1,
      plan2,
validTillDate 
    };

    const templateFile = fs.readFileSync(
      `${appRoot}/template/po_details.hbs`,
      "utf-8"
    );
    const template = handlebars.compile(templateFile);

    // Register Handlebars helpers
    let serialNumber = 0;
    handlebars.registerHelper("incSerial", () => ++serialNumber);

    handlebars.registerHelper("now", (data) => {
      const currentDate = moment().format("DD-MMM-YYYY");
      const currentTime = new Date()
        .toLocaleTimeString("en-US", {
          hour12: true,
          hour: "numeric",
          minute: "numeric",
        })
        .replace(/:\d+ /, " $&IST ");

      switch (data) {
        case "date":
          return currentDate;
        case "endDate":
          return moment().add(15, "days").format("DD-MMM-YYYY");
        default:
          return currentTime;
      }
    });

    const htmlContent = template(quote);

    // Launch Puppeteer and generate the PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.emulateMediaType("screen");
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfPath = `${appRoot}/public/so/${fileName}.pdf`;
    const pdfOptions = {
      path: pdfPath,
      format: "A4",
      preferCSSPageSize: true,
    };

    await page.pdf(pdfOptions);

    await browser.close();

    const pdfBuffer = fs.readFileSync(pdfPath);
    res.contentType("application/pdf");
    logger.info(`${req.path} -- ${req.method} -- Success`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error(`${req.path} -- ${req.method} -- Error: ${error.message}`);
    next(error);
  }
};
exports.get_proposal_doc = async (req, res, next) => {
  const fileName = req.params.reqId;

  try {
    if (!fileName) {
      throw new Error("Missing Parameter");
    }

    const reqId = fileName.match(/\d+/g)?.join("");
    if (!reqId) {
      throw new Error("Invalid reqId");
    }

    const docs = await Quote.findOne({ reqId });
    if (!docs) {
      throw new Error("Quote not found");
    }

    const billingAddress = docs.billingToAddress;
    const shippingAddress = docs.shippingAddress;
    const plan1 = docs.planDetails[0];
    const plan2 = docs.planDetails[1] || null;

    console.log(docs.createdDate)
    const validTillDate = moment(docs.createdDate).add(30, 'days').format('DD-MMM-YYYY');


    const companies = loginDB.collection("companies");
    const companyDetails = await companies
      .find({ companyName: docs.companyName })
      .toArray();
    console.log(companyDetails[0]);

    const quote = {
      ...docs.toObject(),
      billingAddress,
      shippingAddress,
      plan1,
      plan2,
      companyDetails: companyDetails[0],
validTillDate 
    };

    const templateFile = fs.readFileSync(
      `${appRoot}/template/caf_details.hbs`,
      "utf-8"
    );
    const template = handlebars.compile(templateFile);

    // Register Handlebars helpers
    let serialNumber = 0;
    handlebars.registerHelper("incSerial", () => ++serialNumber);

    handlebars.registerHelper("now", (data) => {
      const currentDate = moment().format("DD-MMM-YYYY");
      const currentTime = new Date()
        .toLocaleTimeString("en-US", {
          hour12: true,
          hour: "numeric",
          minute: "numeric",
        })
        .replace(/:\d+ /, " $&IST ");

      switch (data) {
        case "date":
          return currentDate;
        case "endDate":
          return moment().add(15, "days").format("DD-MMM-YYYY");
        default:
          return currentTime;
      }
    });

    const htmlContent = template(quote);

    // Launch Puppeteer and generate the PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.emulateMediaType("screen");
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfPath = `${appRoot}/public/proposal/${fileName}.pdf`;
    const pdfOptions = {
      path: pdfPath,
      format: "A4",
      preferCSSPageSize: true,
    };

    await page.pdf(pdfOptions);

    await browser.close();

    const pdfBuffer = fs.readFileSync(pdfPath);
    res.contentType("application/pdf");
    logger.info(`${req.path} -- ${req.method} -- Success`);
    let erpTestApi;

    try {
      if (!docs) {
        console.log(`No document found with reqId: ${numericReqId}`);
        return;
      }

      if (docs.isOpportunitySent === false) {
        const opportunityNo = docs.opportunityNo;
        console.log("opportunityNo", opportunityNo);
        erpTestApi = await axios.post(
          `${process.env.APP_PATH}/onesify/channelPartner/common/opportunityUpdateDate`,
          { opportunityNo },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Basic " +
                Buffer.from("onesify@sifycorp.com:Onesify@123").toString(
                  "base64"
                ),
            },
            httpsAgent: new (require("https").Agent)({
              rejectUnauthorized: false,
            }),
          }
        );

        console.log("API Response:", erpTestApi.data);

        await Quote.updateOne(
          { reqId: reqId },
          { $set: { isOpportunitySent: true } }
        );

        console.log("Opportunity updated to true in the database.");
      } else {
        console.log("Opportunity has already been sent; skipping API call.");
      }
    } catch (error) {
      console.error("Error occurred during opportunity update:", error);
    }
    res.send(pdfBuffer);
  } catch (error) {
    logger.error(`${req.path} -- ${req.method} -- Error: ${error.message}`);
    next(error);
  }
};

exports.view_po_doc = async (req, res, next) => {
  const fileName = req.params.reqId;
  try {
    if (!fileName) {
      throw "Missing Parameter";
    }

    const file = `${appRoot}/public/so/${fileName}.pdf`;
    var data = fs.readFileSync(file);
    res.contentType("application/pdf");
    res.send(data);
  } catch (err) {
    next(err);
  }
};
exports.view_proposal_doc = async (req, res, next) => {
  const fileName = req.params.reqId;
  try {
    if (!fileName) {
      throw "Missing Parameter";
    }

    const file = `${appRoot}/public/proposal/${fileName}.pdf`;
    var data = fs.readFileSync(file);
    res.contentType("application/pdf");
    res.send(data);
  } catch (err) {
    next(err);
  }
};
