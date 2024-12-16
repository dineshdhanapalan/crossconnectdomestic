const logger = require('../config/winston')
const { db, loginDB } = require('../db_config')
const Quote = require('../model/quote')
const moment = require("moment");
const axios = require("axios")
var contractPeriods = ['1 Year', '2 Years', '3 Years', '4 Years', '5 Years']
const https = require("https");
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

exports.dcDetails = async (req, res, next) => {
    let locations = []
    let result = {}
    try {
        locations = await db.collection('locationccds').aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    _id: 1,
                    name: "$locationName",
                    desc: { $ifNull: ["$desc", ""] }
                }
            }
        ]).toArray(); // Convert the aggregation cursor to an array

        result = {
            locations,
            contractPeriods
        }
        logger.info(`${req.path} -- ${req.method} -- Records Fetched`)
        res.status(200).send(result)
    } catch (e) {
        console.log(e)
        logger.error(`${req.path} -- ${req.method} -- Error Msg Location: ${e}`)
        next(e)
    }
}
exports.postLocationDetails = async (req, res, next) => {
    const { reqId, location, contractPeriod, companyName, companyId, ebsAccountNo, userId } = req.body
    try {
        if (!location || !contractPeriod) {
            throw "Missing Crediential"
        }
        const shippingAddress = await db.collection('locationccds').aggregate([
            { $match: { isActive: true, locationName: location } },
            {
                $project: {
                    locationName: 1, address: 1, address1: 1, address2: 1, address3: 1, pincode: 1, city: 1, state: 1, company: 1, _id: 0
                }
            }
        ]).toArray();
        console.log(shippingAddress)
        if (reqId === 0) {
            const { reqId } = await db.collection("reqids").findOneAndUpdate({ id: "req_id" }, { $inc: { reqId: 1 } });

            const quote = new Quote({
                reqId: reqId, location: location, contractPeriod: contractPeriod, createdBy: userId,
                companyName: companyName,
                companyId: companyId,
                ebsaccountNo: ebsAccountNo,
                shippingAddress: shippingAddress[0],
                pageTracker: "Location"
            })
            const saveData = await quote.save()
            if (!saveData) {
                throw "Failed to insert";
            }
            logger.info(`${req.path} -- ${req.method} -- Location Data Saved Successfuly`)
            res.send({ status: "Success", message: "Location Data Saved Successfuly", reqId: reqId })
        } else {
            const updateQuote = await Quote.findOneAndUpdate({ reqId: reqId }, { location: location, contractPeriod: contractPeriod, shippingAddress: shippingAddress })
            logger.info(`${req.path} -- ${req.method} -- Location Data Update Successfully`)
            res.send({ status: "Success", message: "Location Data Update Successfully" })
        }
    } catch (error) {
        next(error)
    }
}
exports.get_amount = async (req, res, next) => {
    const { type, location, quantity } = req.body
    try {
        const getamount = await db.collection("priceccds").find({ location: location, type: type }).toArray()
        console.log(getamount)
        const data = getamount.map(item => {
            return {
                ...item,
                otc: quantity * item.otc,
                arc: quantity * item.arc,
                quantity: quantity
            };
        });

        res.send({ status: "Success", data })
    } catch (error) {
        next(error)
    }
}
exports.post_amount = async (req, res, next) => {
    const { reqId, planDetails } = req.body
    try {
        const quote = await Quote.findOne({ reqId: reqId })
        console.log(quote, "12345")
        if (!quote) {
            return res.send({ status: "Error", message: "No record found" })
        }
        const totals = planDetails.reduce(
            (acc, item) => {
                acc.totalOtc += item.otc;
                acc.totalArc += item.arc;
                return acc;
            },
            { totalOtc: 0, totalArc: 0 }
        );

        const opportunityTrue = await Quote.findOne({ reqId: reqId })
        const username = process.env.OPP_USERNAME;
        const password = process.env.OPP_PASSWORD;
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        const config1 = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${token}`, // Set the Authorization header
            },
        };

        let opportunityId = null;
        const currentDate = moment().format("DDMMYY");

        const coll = db.collection("reqids");
        const reqIds = await coll.findOneAndUpdate(
            { id: "opp_id" },
            { $inc: { reqId: 1 } }
        );
        const UpdateData = await Quote.findOneAndUpdate({ reqId }, {
           total: totals.totalArc + totals.totalOtc, planDetails: planDetails, totalArc: totals.totalArc, totalOtc: totals.totalOtc, pageTracker: "Plan"
      })


        let nameId = reqIds.reqId;
        console.log(quote,"quote")
        const opportunitypropect=await loginDB.collection("companies").find({companyName:quote.companyName}).toArray();
        console.log(opportunitypropect,"oppot")
       /*  const opportunityPayload = {
            "SalesMethodId": "300000661177775",
            "SalesStageId": "300000661177776",
            "Name": `OSP_CCD_${currentDate}_${nameId}`,
            "OwnerResourcePartyId": "300000001718016",
            "TargetPartyId": "100000000572704",
            "XXSI_OptyLeadBU_c": "300000660029076",
            "KeyContactId": "300000626565450",
            "ChildRevenue": [
                {
                    "ProdGroupId": 300000660038307,
                    "UnitPrice": 2000,
                    "Quantity": 1
                }
            ]
        } */
            let erpTestApi;

            try {
              if (!opportunityTrue.opportunityId) {
                console.log("Inside");
                const ebsAccountNo =
                  opportunitypropect[0]?.ebsaccountNo ||
                  opportunitypropect[0]?.armReqid;
                const userType = opportunitypropect[0]?.ebsaccountNo
                  ? "company"
                  : "prospect";
        
                erpTestApi = await axios.post(
                  `${process.env.APP_PATH}/onesify/channelPartner/common/create_opportunity`,
                  {
                    reqId: quote.reqId,
                    product: "ccds",
                    ebsAccountNo: ebsAccountNo,
                    userType: userType,
                  },
                  {
                    headers: {
                      "Content-Type": "application/json",
                    },
                    httpsAgent,
                  }
                );
                opportunityId = erpTestApi.data["OptyId"];
              }
            } catch (error) {
              console.error("Error while creating opportunity:", error);
            }
        

        res.send({ status: "Success", data: "Plan Details stored Successfully" })

    } catch (error) {
        next(error)
    }
}
exports.delete_details = async (req, res, next) => {
    const { reqId } = req.body;
    try {
        if (!reqId) {
            throw "Missing Credential";
        }
        const result = await Quote.findOneAndUpdate(
            {
                reqId
            },
            { isActive: false }
        );

        if (!result) {
            throw "No Data";
        }
        res.send({
            status: "Success",
        });
    } catch (error) {
        next(error);
    }
}
exports.quote_submit = async (req, res, next) => {
    try {
        // const opportunityTrue = await Quote.findOne({ reqId: req.params.reqId })
        // const username = process.env.OPP_USERNAME;
        // const password = process.env.OPP_PASSWORD;
        // const token = Buffer.from(`${username}:${password}`).toString('base64');
        // const config1 = {
        //   headers: {
        //     "Content-Type": "application/json",
        //     "Authorization": `Basic ${token}`, // Set the Authorization header
        //   },
        // };

        // let opportunityId = null;
        // const currentDate = moment().format("DDMMYY");

        // const coll = db.collection("reqids");
        // const reqIds = await coll.findOneAndUpdate(
        //     { id: "opp_id" },
        //     { $inc: { reqId: 1 } }
        // );
        // console.log(reqIds)
        // let nameId = reqIds.reqId;
        // // const opportunityPayload = {
        // //     SALESMETHODID: "300000614207211",
        // //     SALESSTAGEID: "300000614207212",
        // //     NAME: `OSP_${currentDate}_${nameId}`,
        // //     OWNERRESOURCEPARTYID: "300000001718016",
        // //     TARGETPARTYID: "100000000749274",
        // //     XXSI_OPTYLEADBU_C: "NCS",
        // //     KEYCONTACTID: "300000626565450",
        // //     CHILDREVENUE: [
        // //         {
        // //             ProdGroupId: "300000625775645",
        // //             UnitPrice: "11",
        // //             Quantity: "1",
        // //         },
        // //     ],
        // // };
        // const opportunityPayload = {
        //     "SalesMethodId": "300000661177775",
        //     "SalesStageId": "300000661177776",
        //     "Name": `OSP_CCD_${currentDate}_${nameId}`,
        //     "OwnerResourcePartyId": "300000001718016",
        //     "TargetPartyId": "100000000572704",
        //     "XXSI_OptyLeadBU_c": "300000660029076",
        //     "KeyContactId": "300000626565450",
        //     "ChildRevenue": [
        //       {
        //         "ProdGroupId": 300000660038307,
        //         "UnitPrice": 2000,
        //         "Quantity": 1
        //       }
        //     ]
        //   }
        // if (!opportunityTrue.opportunityId) {
        //     console.log("Inside")
        //     try {
        //         const erpTestApi = await axios.post(`${process.env.OPPORTUNITY_API}`, opportunityPayload, config1);
        //         opportunityId = erpTestApi.data["OptyId"];
        //         console.log(erpTestApi.data, "1234")
        //         const opportunity = await db.collection("opportunityDetails").insertOne({
        //             reqId: opportunityTrue.reqId,
        //             ebsaccountNo: opportunityTrue.ebsaccountNo,
        //             opportunityId: erpTestApi.data["OptyId"],
        //             opportunityNo: erpTestApi.data["OptyNumber"],
        //             createdDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        //             updatedDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        //             product: "Crossconnect-Domestic",
        //             status: "Awaiting Signature",
        //             companyId: opportunityTrue.companyId,
        //             companyName: opportunityTrue.companyName,
        //             createdBy: opportunityTrue.createdBy,
        //             pageTracker: opportunityTrue.pageTracker,
        //             type: "company"
        //         });
        //     } catch (error) {
        //         console.log(error, "5678");
        //     }
        // }

        const result = await db.collection("opportunityDetails").updateOne(
            { reqId: parseInt(req.params.reqId) },  // Filter document by reqId
            {
                $set: {
                    status: "Awaiting Signature",
                    pageTracker: "proposal",
                    updatedDate: moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ')  // Set the current date in ISO format
                }
            }
        );
        console.log(result)
        records = await Quote.updateOne(
            { reqId: req.params.reqId },
            { $set: { status: "Awaiting Signature", pageTracker: "proposal" } }
        );
        if (records.acknowledged == true && records.matchedCount == 1) {
            res.status(200).send({
                status: "Success",
                message: "Quote Submitted and awaiting signature",
            });
            return;
        }
        logger.info(`${req.path} -- ${req.method} -- Quote Submitted Error`);
        res.status(200).send({
            status: "Error",
            message: "Quote Submitted Error. Please try again",
        });
        return;
    } catch (e) {
        console.log(e);
        next(e)
    }



}
exports.delete_product = async (req, res, next) => {
    const { reqId, product } = req.body
    try {
        function removePlanAndUpdateTotals(data, typeToRemove) {
            // Find the plan to remove based on type
            const planToRemove = data.planDetails.find(plan => plan.type === typeToRemove);

            if (planToRemove) {
                // Remove the plan from planDetails
                data.planDetails = data.planDetails.filter(plan => plan.type !== typeToRemove);

                // Adjust the totalArc, totalOtc, and total by subtracting the removed values
                data.totalArc -= planToRemove.arc;
                data.totalOtc -= planToRemove.otc;
                data.total -= (planToRemove.arc + planToRemove.otc);
            }

            return data;
        }
        const data = await Quote.findOne({ reqId: reqId })
        if (!data) {
            return res.send({ status: "Error", message: "No Record Found" })
        }
        if (product == "Ethernet" || product == "Fiber") {
            const updatedData = removePlanAndUpdateTotals(data, product);
            const update = await Quote.findOneAndUpdate({ reqId: reqId }, updatedData)
            res.send({ status: "Success", message: "Product Deleted Successfully" })
        } else {
            res.send({ status: "Error", message: "Please Select correct product" })
        }

    } catch (error) {
        next(error)
    }
}
exports.opportunity = async (req, res, next) => {
    try {
      const { reqId, product, ebsAccountNo, userType } = req.body;
      let collectionName;
      switch (product) {
        case "gcc":
          collectionName = "quotegcc";
          break;
        case "ccs":
          collectionName = "quoteccds";
          break;
        case "cis":
          collectionName = "quotecis";
          break;
        case "ills":
          collectionName = "quoteills";
          break;
        case "mpls":
          collectionName = "quotempls";
          break;
        default:
          return res.status(400).send({
            status: "Error",
            message: "Invalid product type provided",
          });
      }
      const collection = db.collection(collectionName);
      const opportunityTrue = await collection.findOne({ reqId: reqId }); // If reqId is stored as a string
      if (!opportunityTrue) {
        return res.status(404).send({
          status: "Error",
          message: `No record found for reqId: ${reqId} in collection ${collectionName}`,
        });
      }
      console.log("reqid", opportunityTrue);
      const username = process.env.OPP_USERNAME;
      const password = process.env.OPP_PASSWORD;
      const token = Buffer.from(`${username}:${password}`).toString("base64");
      const config1 = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${token}`,
        },
      };
      console.log("Request Headers:", config1.headers);
      let opportunityId = opportunityTrue.opportunityId;
      console.log("opertunity Id", opportunityId);
      if (!opportunityId) {
        console.log(
          `Opportunity ID not found for reqId: ${reqId}. Generating new opportunity.`
        );
        const currentDate = moment().format("DDMMYY");
        const coll = db.collection("reqids");
        const reqIds = await coll.findOneAndUpdate(
          { id: "opp_id" },
          { $inc: { reqId: 1 } }
        );
        let nameId = reqIds.reqId;
        const opportunityData = await db.collection("opportunitydatas").findOne({
          salesStages: "01 - Qualified Lead",
        });
        console.log("Opportunity Payload:", opportunityData);
        if (!opportunityData) {
          return res.status(500).send({
            status: "Error",
            message: "Sales Method and Stage data not found",
          });
        }
        const oracleApiUrl =
          "https://cbjl-test.fa.us2.oraclecloud.com/crmRestApi/resources/11.13.18.05/accounts/2016/child/AccountTeam?onlyData=true&fields=ResourceId,ResourceEmailAddress,ResourceName,ResourceRoleName,OwnerFlag";
        const auth = {
          username: "onesify@sifycorp.com",
          password: "Onesify@123",
        };
        let targetPartyId = "100000000572704";
        try {
          const oracleApiResponse = await axios.get(oracleApiUrl, {
            auth: auth,
          });
          const accountTeamData = oracleApiResponse.data.items;
          const ownerResource = accountTeamData.find(
            (member) => member.OwnerFlag === "true"
          );
          if (ownerResource) {
            targetPartyId = ownerResource.ResourceId;
            console.log(`Target Party ID set to: ${targetPartyId}`);
          }
        } catch (error) {
          console.log("Error fetching data from Oracle API:", error);
          return res.status(500).send({
            status: "Error",
            message: "Error fetching Account Team details from Oracle API",
          });
        }
        const companyName = "Sify Technologes Limited"; // Match the exact name as in the database
        const oscProductDetailsCollection = db.collection("oscproductdetails");
        const productDetails = await oscProductDetailsCollection.findOne({
          company: companyName,
        });
        if (!productDetails) {
          return res.status(500).send({
            status: "Error",
            message: "No product details found for the specified company",
          });
        }
        const gtmNo = productDetails.gtmNo;
        console.log(`GTN Number: ${gtmNo}`);
        /*  } catch (error) {
                console.error("Error fetching product details:", error);
                return res.status(500).send({
                    status: "Error",
                    message: "Error retrieving product details from the database",
                });
            } */
        let ownerResourcePartyId = "300000001718016";
        if (userType === "company") {
          const companiesCollection = loginDB.collection("companies");
          const companyDetails = await companiesCollection.findOne({
            ebsAccountNo: ebsAccountNo,
          });
          if (companyDetails) {
            ownerResourcePartyId = companyDetails.oscPartyId;
            console.log(
              `Owner Resource Party ID set to company oscPartyId: ${ownerResourcePartyId}`
            );
          }
        } else if (userType === "prospect") {
          const companiesCollection = loginDB.collection("companies");
          const companyDetails = await companiesCollection.findOne({
            ebsAccountNo: ebsAccountNo,
          });
          if (companyDetails && companyDetails.abcd) {
            ownerResourcePartyId = companyDetails.abcd;
            console.log(
              `Owner Resource Party ID set to prospect abcd: ${ownerResourcePartyId}`
            );
          }
        }
        console.log(`Final Owner Resource Party ID: ${ownerResourcePartyId}`);
        let unitPrice = 0;
        if (product === "ills") {
          const hasRateCardDocument = await db.collection("quoteills").findOne({
            reqId: reqId, // Ensure reqId is checked
            hasRateCard: true,
          });
          
          console.log("hasRateCardDocument", hasRateCardDocument);
          
          // Make sure to check if locationDetails exists and has at least one item
          if (hasRateCardDocument && hasRateCardDocument.locationDetails.length > 0) {
            const reqBandwidth = hasRateCardDocument.locationDetails[0].reqBandwidth; // Assign value to reqBandwidth
            console.log(`Request bandwidth extracted: ${reqBandwidth}`);
        
            const rateCardPriceCheck = await db.collection("ratecardprices").find({
              bandwidth: 15,
              plane: "bw",
              Condition3: "serviceVariant=Standard",
              Price_Type: "PortCharges_ARC",
            }).toArray();
            
            console.log("Rate card prices matching criteria:", rateCardPriceCheck);
            
            // Check if there are any results in the rateCardPriceCheck array
            if (rateCardPriceCheck.length > 0) {
              // Access the first document in the array
              const rateCardPrice = rateCardPriceCheck[0]; // Get the first document
              unitPrice = rateCardPrice.Price; // Access the Price property
              console.log(`Rate card price found: ${unitPrice}`);
            } else {
              console.log("No rate card price found for the specified criteria.");
            }
            
          } else {
            console.log("No location details found or hasRateCardDocument is empty.");
          }
        } else {
          // Handle the case when product is not "ills"
        }
        
        // opportunityId: null; // This seems misplaced and should be part of the relevant context or object
        
        const opportunityPayload = {
          SalesMethodId: opportunityData.salesMethodId,
          SalesStageId: opportunityData.salesStagesId,
          Name: `OSP_${currentDate}_${nameId}`,
          OwnerResourcePartyId: ownerResourcePartyId,
          //TargetPartyId: String(targetPartyId),
          TargetPartyId: "100000000572704",
          XXSI_OptyLeadBU_c: String(gtmNo),
          //XXSI_OptyLeadBU_c: "300000660029076",
          KeyContactId: "300000626565450",
          ChildRevenue: [
            {
              ProdGroupId: 300000660038307,
              UnitPrice: /* 2000 */ unitPrice,
              Quantity: 1,
            },
          ],
        };
        console.log("Payload being sent:", opportunityPayload);
        /* const opportunityPayload = {
          SalesMethodId: "300000661177775",
          SalesStageId: "300000661177776",
          Name: `OSP_CCD_${currentDate}_${nameId}`,
          OwnerResourcePartyId: "300000001718016",
          TargetPartyId: "100000000572704",
          XXSI_OptyLeadBU_c: "300000660029076",
          KeyContactId: "300000626565450",
          ChildRevenue: [
            {
              ProdGroupId: 300000660038307,
              UnitPrice: 2000,
              Quantity: 1,
            },
          ],
        }; */
        console.log("Inside");
        console.log(opportunityTrue);
        try {
          const erpTestApi = await axios.post(
            `${process.env.OPPORTUNITY_API}`,
            opportunityPayload,
            config1
          );
          console.log("ERP API Response:", erpTestApi.data);
          opportunityId = erpTestApi.data["OptyId"];
          console.log("Opportunity ID:", opportunityId);
          await db.collection("opportunityDetails").insertOne({
            reqId: opportunityTrue.reqId,
            ebsaccountNo: opportunityTrue.ebsaccountNo,
            opportunityId: opportunityId,
            opportunityNo: erpTestApi.data["OptyNumber"],
            createdDate: moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
            updatedDate: moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
            product: "Crossconnect-Domestic",
            status: opportunityTrue.status,
            companyId: opportunityTrue.companyId,
            companyName: opportunityTrue.companyName,
            createdBy: opportunityTrue.createdBy,
            pageTracker: "plan",
            type: "company",
          });
        } catch (error) {
          console.error(
            "Error posting to ERP API:",
            error.response ? error.response.data : error.message
          );
        }
        // Update logic
        const records = await collection.updateOne(
          { reqId: reqId },
          {
            $set: {
              status: "Awaiting Signature",
              pageTracker: "proposal",
              opportunityId,
            },
          }
        );
        if (records.acknowledged && records.matchedCount === 1) {
          return res.status(200).send({
            status: "Success",
            message: "Quote Submitted and awaiting signature",
          });
        }
        /* logger.info(`${req.path} -- ${req.method} -- Quote Submission Error`);
        res.status(500).send({
          status: "Error",
          message: "Error submitting quote. Please try again",
        });
        // Opportunity ID handling
        console.log(
          `Opportunity ID found: ${opportunityId}. You may update the existing opportunity if needed.`
        ); */
        // Add your update logic here if required
      } else {
        return res.status(200).send({
          status: "Success",
          message: "oputunity Allerdy existed",
        });
      }
      // Add your update logic here if required
    } catch (e) {
      console.log("Error in opportunity processing:", e);
      next(e);
    }
  };