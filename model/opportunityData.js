const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const opportunityDataSchema = new Schema({
  salesMethodId: { type: String, required: true },
  salesMethodName: { type: String, required: true },
  salesStages: { type: String, required: true },
  salesStagesId: { type: String, required: true }
});

const OpportunityData = mongoose.model('OpportunityData', opportunityDataSchema);

module.exports = OpportunityData;
