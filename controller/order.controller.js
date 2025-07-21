const {
  serverErrorResponse,
  createErrorResponse,
  createSuccessResponse,
} = require("../services/commonFunction");
const Order = require("../model/order.model");

const getOrderData = async (req, res) => {
  try {
    const order = await Order.aggregate([
      {
        $match: {
          userId: req?.user?._id,
        },
      },
      {
        $sort: { shipmentDate: 1 },
      },
      {
        $skip:
          (parseInt(req?.query?.page, 10) - 1) *
          (parseInt(req?.query?.limit, 10) || 10),
      },
      {
        $limit: parseInt(req?.query?.limit, 10) || 10,
      },
      {
        $lookup: {
          from: "orderitems",
          localField: "amazonOrderId",
          foreignField: "amazonOrderId",
          as: "orderItems",
          pipeline: [
            {
              $project: {
                asin: 1,
                productName: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$orderItems",
        },
      },
      {
        $addFields: {
          asin: "$orderItems.asin",
          productName: "$orderItems.productName",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "asin",
          foreignField: "asin",
          as: "products",
          pipeline: [
            {
              $project: {
                productImage: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$products",
        },
      },
      {
        $addFields: {
          productImage: "$products.productImage",
        },
      },
      {
        $project: {
          asin: 1,
          productName: 1,
          productImage: 1,
          shipmentDate: 1,
          orderTotal: 1,
          createdAt: 1,
        },
      },
    ]);

    if (!order) {
      return createErrorResponse(res, "Order data not found", 404);
    }

    return createSuccessResponse(
      res,
      "Order data fetched successfully",
      order,
      200
    );
  } catch (error) {
    console.error("Error fetching product data:", error);
    return serverErrorResponse(res, error);
  }
};

module.exports = {
  getOrderData,
};
