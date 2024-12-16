const { default: axios } = require("axios");
const Quote = require("../model/quote")
const https = require("https");
const moment = require("moment");
const crypto = require("crypto");
const { db } = require("../db_config");
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

exports.get_address_info = async (req, res, next) => {
    const { reqId ,ebsAccountNo} = req.body
    const headers = {
        username: process.env.TO_GET_ERP_ADDRESS_USERNAME,
        password: process.env.TO_GET_ERP_ADDRESS_PASSWORD,
    };
    const getShipToAddress = async () => {
        const shipToAddress = await Quote
            .findOne({
                reqId: reqId,
            }).lean();
        return shipToAddress;
    };
    const getShipToStates = async () => {
        const shipTo = await axios.get(`https://ws-test.sify.net/osc_cpq/server/flashnet/customer_address.php?action=getStates&n_customer_no&n_customer_no=${ebsAccountNo}&v_site_use_code=BILL_TO&n_org_id=82`, { headers }, { httpsAgent });
        if (shipTo.data.STATUS !== "S") {
            // throw new Error("Third party API error");
 		console.log("Third party API error")
            return ""
        }
        // console.log(shipTo.data);
        const stateList = shipTo.data.n_address.map((address) => {
            const { SERVICES, PRIMARY_FLAG, ...state } = address;
            return state;
        });
        return stateList;
    };
    try {
        const quote = await Quote.findOne({ reqId: reqId });
        if (!quote) {
            throw "reqid not found";
        }
        const shipToAddress = await getShipToAddress();
        const stateList = await getShipToStates();

        try {
            if (!quote) {
              console.log(`No document found with reqId: ${quote}`);
              return;
            }
      
            if (quote.isOpportunitySent === false) {
              const opportunityNo = quote.opportunityNo;
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
        res.send({
            status: "Success",
            shipTo: shipToAddress.shippingAddress,
            stateList: stateList,
        });
    } catch (err) {
        next(err);
    }
};
exports.get_address_list = async (req, res, next) => {
    const { stateName,ebsaccountNo } = req.body
    try {
        if (!stateName && !ebsaccountNo) {
            throw "Missing credentials";
        }
        const headers = {
            username: process.env.TO_GET_ERP_ADDRESS_USERNAME,
            password: process.env.TO_GET_ERP_ADDRESS_PASSWORD,
        };
        let bill_to = await axios.get(`https://ws-test.sify.net/osc_cpq/server/flashnet/customer_address.php?n_customer_no=${ebsaccountNo}&v_site_use_code=BILL_TO&n_org_id=82&v_state=${stateName}`, {
            headers: headers
        }, { httpsAgent });

        if (bill_to.data.STATUS == "S") {
            bill_to.data.n_address.forEach((e) => {
                delete e.SERVICES;
                delete e.PRIMARY_FLAG;
            });
        }
        let bill_to_list = bill_to?.data?.n_address?bill_to?.data?.n_address:[];
        res.send({
            status: "Success",
            data: bill_to_list,
        });
    } catch (err) {
        next(err);
    }
};


exports.post_new_address = async (req, res, next) => {
    let { reqId, isPoNo, poRefNo, shipToGst, hasShipToGst, billingAddress,ebsAccountNo } = req.body;

    try {
        if (!poRefNo && isPoNo == true) return res.send({ status: "Error", message: '"poRefNo" named is required, is P.O is selected' });
        const quote = await Quote.findOne({ reqId });


        poDate = moment().format("DD-MMM-YYYY")
        if (!isPoNo) {
            poRefNo = `CCD-${reqId}`
        }

        // async function updateOrCreateGstDetails(companyId, companyName, state, gstNo, declarationUrl) {
        //     const existingGstDetails = await Gstdetails.findOneAndUpdate(
        //         { companyId, state: state.toUpperCase() },
        //         {
        //             companyId,
        //             companyName,
        //             state: state.toUpperCase(),
        //             gstNo: gstNo || undefined,
        //             hasGst: !!gstNo,
        //             declarationUrl: gstNo ? undefined : declarationUrl || "url",
        //         },
        //         { upsert: true, new: true }
        //     );

        //     return existingGstDetails;
        // }
        const shippingAddressState = quote.shippingAddress.state;
        // await updateOrCreateGstDetails(companyId, companyName, shippingAddressState, shipToGst, undefined);

        const billingAddressState = billingAddress.state;
        const billToGst = billingAddress.gstNo;

        const generateSiteCode = async (city) => {
            const autoCode = crypto.randomBytes(4).toString("hex");
            let siteCode = city.toUpperCase() + "-" + autoCode.toUpperCase();
            return siteCode;
        };

        const runTwice = async (func, data, type) => {
            let responseData = {};
            responseData = await func("82", data, type);
            return responseData;
        };

        const postAddressToERP = async (orgId, data, type) => {
            const siteCode = await generateSiteCode(data.city);
            console.log(siteCode);
            let postData = {
                ACCOUNT_NUMBER: ebsAccountNo,
                SITE_CODE: siteCode,
                ADDRESS1: data.address1,
                ADDRESS2: data.address2,
                ADDRESS3: "",
                ADDRESS4: data.remarks || "",
                CITY: data.city,
                STATE: data.state,
                POSTAL_CODE: data.pincode || data.pinCode,
                SITE_USE_CODE: type,
                ORG_ID: orgId,
                GST_NO: data.gstNo?data.gstNo:"UNREGISTERED",
                COUNTRY_CODE: "IN"
            };
            const postAddress = await axios({
                method: "post",
                url: `https://interface.sify.net/api/flashnet/customer/address/create`,
                headers: {
                    apikey: process.env.ERP_API_KEY,
                    username: process.env.TO_GET_ERP_ADDRESS_USERNAME,
                    password: process.env.TO_GET_ERP_ADDRESS_PASSWORD,
                    "Content-Type": "application/json",

                }, httpsAgent,
                data: postData,
            });
            if (postAddress.data.MATCHING) {
                const data = postAddress.data.MATCHING[0]
                data.siteCode = data['SITE_CODE'];
                return data;
            } else {
                return { ...postAddress.data, siteCode };
            }
            // if (postAddress.data.STATUS !== "S") throw "Third Party API Error";
            // return { ...postAddress.data, siteCode };
        };

        const shipTo = { ...quote.shippingAddress, gstNo: shipToGst };
        let postShipToERP;
        let shipToERP;
        if (quote.postShipToERP === false) {
 if(quote.userType!=="prospect"){
            shipToERP = await runTwice(postAddressToERP, shipTo, "SHIP_TO");
            postShipToERP = true;
}
        }

        if (billingAddress.billToAddressType === 'new' || billingAddress.billToAddressType === 'sameas') {
            let billToERP;
            if (billingAddress.isComplete === true) {
 if(quote.userType!=="prospect"){
                // await updateOrCreateGstDetails(companyId, companyName, billingAddressState, billToGst, undefined);
                billToERP = await runTwice(postAddressToERP, billingAddress, "BILL_TO");
}
            }

            const result = await Quote.findOneAndUpdate(
                {
                    reqId,
                },
                {
                    $set: {
                        'shippingAddress.shipToGst': shipToGst,
                        'shippingAddress.hasShipToGst': hasShipToGst,
                        'shippingAddress.shipToERP': shipToERP || "",
                    },
                    pageTracker: "billAndShip",
                    ebsaccountNo:ebsAccountNo,
                    poRefNo,
                    poDate,
                    isPoNo,
                    postShipToERP,
                    billingToAddress: {
                        ...billingAddress,
                        billToERP,
                    },
                }
            );
            const opportunity = await db.collection("opportunityDetails").updateOne({reqId:reqId}, { $set: {updatedDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ') , pageTracker: "billAndShip" } });
            if (!result) {
                throw "Failed To Update";
            }

            res.send({ status: "Success" });
        } else {
            const result = await Quote.findOneAndUpdate(
                {
                    reqId,
                },
                {
                    $set: {
                        'shippingAddress.shipToGst': shipToGst,
                        'shippingAddress.hasShipToGst': hasShipToGst,
                        'shippingAddress.shipToERP': shipToERP || "",
                    },
                    pageTracker: "billAndShip",
                    ebsaccountNo:ebsAccountNo,
                    poRefNo,
                    poDate,
                    isPoNo,
                    shipToGst,
                    hasShipToGst,
                    postShipToERP,
                    billingToAddress: {
                        ...billingAddress
                    }
                }
            );
            // await updateOrCreateGstDetails(companyId, companyName, billingAddressState, billToGst, undefined);

            if (!result) {
                throw "reqId not found";
            }
            const opportunity = await db.collection("opportunityDetails").updateOne({reqId:reqId}, { $set: {updatedDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ') , pageTracker: "billAndShip" } });
            res.send({ status: "Success" });
        }
    } catch (err) {
        next(err);
    }
};