const logger = require("../config/winston");
const {db} = require("../db_config")
const Quote = require("../model/quote")
const https = require("https");
const { default: axios } = require("axios");
const moment = require("moment");
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
var contractPeriods = ['1 Year', '2 Years', '3 Years', '4 Years', '5 Years']


exports.get_quote = async (req, res, next) => {
    const { reqId } = req.body
    try {
        const quote = await Quote.findOne({ reqId: reqId,isActive:true }).lean();
        if(!quote) return res.send({status:"Error",message:"No Record Found"})
        let locations = await db.collection('locationccds').aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    _id: 1,
                    name: "$locationName",
                    desc: { $ifNull: ["$desc", ""] }
                }
            }
        ]).toArray(); 
       
        res.send({ status: "Succcess", data: {...quote,locations,contractPeriods} })
    } catch (error) {
        next(error)
    }
}
exports.get_quote_list = async (req, res, next) => {
    const { limit, page, searchKeyword,companyId } = req.body;
    try {
        const searchKeyNo = parseInt(searchKeyword);
        console.log(searchKeyNo)
        const pageNo = page - 1;

        console.log(companyId)
        let quote, totalRecords;
        if (searchKeyword) {
            quote = await db.collection("quoteccds").find(
                {
                    isActive: true,
                    companyId: companyId,
                    $or: [
                        { reqId: searchKeyNo },
                    ],
                }
            ).limit(limit)
                .skip(limit * pageNo)
                .sort({ reqId: -1 }).toArray();

            totalRecords = await db.collection("quoteccds").countDocuments({
                isActive: true,
                companyId: companyId,
                $or: [
                    { reqId: searchKeyNo }
                ],
            });
        } else {
            quote = await Quote.find(
                {
                    isActive: true,
                    companyId: companyId
                }
            ).limit(limit)
                .skip(limit * pageNo)
                .sort({ reqId: -1 });

            console.log(quote)

            totalRecords = await Quote.countDocuments({
                isActive: true, companyId: companyId
            });
        }



        logger.info(`${req.path} -- ${req.method} -- Success`);
        res.send({
            status: "Success",
            limit: limit,
            page: page,
            total: totalRecords,
            data: quote
        });
    } catch (error) {
        next(error);
    }
};
exports.get_quote_summary = async (req, res, next) => {
    try {
        const terms = await db.collection("termsccd").aggregate([
            { $match: { isActive: true, servicesType:  "General" } },
            {
              $group: {
                _id: "$servicesType",
                desc: { $push: { type: "$servicesType", desc: "$desc" } },
              },
            },
          ]).toArray();
          if(!terms) return res.send({status:"Error",message:"No Record Found"})
       
        res.send({ status: "Succcess", data: terms })
    } catch (error) {
        next(error)
    }
}

exports.change_quote_status = async (req, res, next) => {
    const { reqId, status } = req.body;
    try {
        if (!reqId) {
            throw "Missing Parameter";
        }
        const reqID = reqId.match(/\d+/g).join('');

        let updateData = { status };

        if (status === "Order Signed") {
            console.log("I am from here.....")
            const integerReqID = parseInt(reqID, 10); 
            const result = await db.collection("opportunityDetails").updateOne({reqId:integerReqID}, { $set: { status: "Order Signed",updatedDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ') ,pageTracker: "docuSign" } });
        }

        
        const integerReqID = parseInt(reqID, 10);
        console.log("integerReqID",integerReqID) 
        const quote = await db.collection("quoteccds").findOne({ reqId:integerReqID });
        if (!quote) {
          console.error("Quote not found for reqId:", integerReqID);
          throw new Error("Quote not found");
        }      
        const sendOpportunityUpdate = async () => {
        const apiUrl =
          `${process.env.APP_PATH}/onesify/channelPartner/common/opportunityUpdate`;
        const payload = {
          opportunityNo:quote.opportunityNo,
          poDate: moment(quote.poDate, "DD-MMM-YY").format("YYYY-MM-DD"), 
          poNumber:quote.poRefNo,
          poValue: quote.totalArc,
          /* contractPeriod: "1 Month",
          attachmentType: "Feasbility Report", */
        };
        console.log("payload3",payload)
        try {
          const response = await axios.post(apiUrl, payload, {
            headers: {
              "Content-Type": "application/json",
            },
            httpsAgent,
          });
  
          console.log("API response:", response.data);
        } catch (error) {
          console.error(
            "Error calling opportunityUpdate API:",
            error.response ? error.response.data : error.message
          );
        }
      };
      sendOpportunityUpdate();


        const quoteStatus = await Quote.findOneAndUpdate({ reqId: reqID, isActive: true }, updateData);
        console.log(quoteStatus)
        if (!quoteStatus) {
            throw new Error("Document not found");
        }

        res.send({ status: "Success" });
    } catch (err) {
        next(err);
    }
};

exports.share_and_sign = async (req, res, next) => {
    try {
        const reqId = req.params.reqId;
        const name = req.params.name;
        const mail = req.params.mail;

        const docuSignPayload = {
            name: name,
            email: mail,
            filePath: `${process.env.APP_PATH}/onesify/crossconnect_domestic/docusign/view_po_doc/CCD-SO-${reqId}`,
            service: "CCD",
        };
        const docuSignApi = await axios.post(
            `${process.env.APP_PATH}/onesify/docusign/api/v1/get-jwt-token/CCD-SO-${reqId}`,
            docuSignPayload,
            { httpsAgent }
        );

        const docuSignUrl = docuSignApi.data.data;
        res.redirect(docuSignUrl);
    } catch (error) {
        next(error);
    }
};


