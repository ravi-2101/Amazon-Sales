const {
  serverErrorResponse,
  createSuccessResponse,
  createErrorResponse,
} = require("../services/commonFunction");
const Sales = require("../model/sales.model");

const getSales = async (req, res) => {
  try {
    const { asinOrSku, page, limit } = req.body;

    if (!asinOrSku) {
      return createErrorResponse(res, "Either asin or sku is required", 400);
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skipNumber = (pageNumber - 1) * limitNumber;

    const sales = await Sales.aggregate([
      {
        $match: {
          $or: [{ asin: asinOrSku }, { sku: asinOrSku }],
        },
      },
      {
        $sort: { dayOfSale: 1 },
      },
      { $skip: skipNumber },
      { $limit: limitNumber },
      {
        $lookup: {
          from: "products",
          let: { asin: "$asin", sku: "$sku", userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    {
                      $or: [
                        { $eq: ["$asin", "$$asin"] },
                        { $eq: ["$sku", "$$sku"] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                productName: 1,
              },
            },
          ],
          as: "productDetails",
        },
      },
      {
        $project: {
          productName: {
            $ifNull: [
              { $arrayElemAt: ["$productDetails.productName", 0] },
              "Unknown Product",
            ],
          },
          quantity: 1,
          totalSales: 1,
          asin: 1,
          sku: 1,
          dayOfSale: 1,
          marketPlaceId: 1,
          userId: 1,
        },
      },
    ]);

    if (!sales.length) {
      return createErrorResponse(res, "No sales records found", 200);
    }

    return createSuccessResponse(res, "Sales fetched successfully", sales, 200);
  } catch (error) {
    return serverErrorResponse(res, error);
  }
};

module.exports = { getSales };
