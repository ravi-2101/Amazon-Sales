const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    totalSales : {
        type : Number,
        required : true
    },
    asin : {
        type : String,
        required : true
    },
    sku : {
        type : String,
        required : true
    },
    dayOfSale : {
        type : Date,
        required : true
    },
    marketPlaceId: { type: String, required: true }
},{ timestamps: true, versionKey: false });

const Sales = mongoose.model("Sales", salesSchema);
module.exports = Sales;