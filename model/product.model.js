const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
    },
    asin: {
        type: String,
        required: true,
    },
    sku: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    productImage: {
        type: String,
        required: true,
    },
    marketPlaceId: { type: String, required: true },
},{ timestamps: true, versionKey: false });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;