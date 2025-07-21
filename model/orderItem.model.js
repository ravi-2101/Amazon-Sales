const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    asin: {
        type: String,
        required: true,
    },
    sku: {
        type: String,
        required: true,
    },
    orderItemId: {
        type: String,
        required: true,
    },
    productName: {
        type: String,
        required: true,
    },
    amazonOrderId: {
        type: String,
        required: true,
    },
    
},{ timestamps: true, versionKey: false });          

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
module.exports = OrderItem;