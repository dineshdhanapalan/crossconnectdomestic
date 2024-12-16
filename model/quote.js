const mongoose = require("mongoose");

const crossconectDomesticSchema = mongoose.Schema({
    reqId: {
        type: Number,
        unique: true,
        required: true,
    },
    companyId: {
        type: String,
        trim: true,
    },
    companyName: {
        type: String,
        trim: true,
    },
    location: {
        type: String,
        required: true
    },
    contractPeriod: {
        type: String,
        enum: ["1 Year", "2 Years", "3 Years", "4 Years", "5 Years"],
        default: "3 Months",
    },
    status: {
        type: String,
        default: "Draft",
    },
    pageTracker: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: String,
        required: true,
        default: "User",
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: String,
        default: "User",
    },
    updatedDate: {
        type: Date,
    },
    ebsaccountNo: {
        type: String,
    },
    opportunityId: {
        type: Number
    },
    email: {
        type: String,
    },
    planDetails: {
        type: Object,
    },
    totalOtc: {
        type: Number,
    },
    totalArc: {
        type: Number,
    },
    total: {
        type: Number,
    },
    billingToAddress:{
        type:Object
    },
    shippingAddress:{
        type:Object
    },
    poRefNo:{type:String},
    poDate:{type:String},
    opportunityId:{type:String},
    opportunityNo: { type: String },
    statusCode: { type: String },
    isPoNo:{type:Boolean},
    postShipToERP:{type:Boolean,default:false },
    userType: { type: String },
    isOpportunitySent:{type:Boolean,default:false }

});

const crossconectDomestic = new mongoose.model("quoteccds", crossconectDomesticSchema);

module.exports = crossconectDomestic;
