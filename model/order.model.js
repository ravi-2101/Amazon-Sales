const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyerEmail: {
      type: String,
    },
    amazonOrderId: {
      type: String,
      required: true,
    },
    shipmentDate: {
      type: Date,
      required: true,
    },
    orderTotal: {
      type: Number,
    },
    marketPlaceId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
  },
  { timestamps: true, versionKey: false }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
