const { default: axios, create } = require("axios");
const Product = require("../model/product.model");
const User = require("../model/user.model");
const {
  serverErrorResponse,
  createSuccessResponse,
  createErrorResponse,
} = require("../services/commonFunction");

const addSingleProduct = async (req, res) => {
  try {
    const { asin, marketPlaceId, sku } = req.body;

    if (!asin || !marketPlaceId || !sku) {
      return res
        .status(400)
        .json({ message: "asin and marketplaceId and sku are required ." });
    }

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || !user.token?.accessToken) {
      return res
        .status(404)
        .json({ message: "User or access token not found." });
    }

    const exists = await Product.exists({
      asin,
      sku,
      marketPlaceId: marketPlaceId,
      userId,
    });
    if (exists) {
      return res.status(400).json({ message: "Product already exists." });
    }

    const catalogResponse = await axios.get(
      `${process.env.AMAZON_URL}/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketPlaceId}&includedData=images%2Csummaries`,
      {
        headers: {
          "x-amz-access-token": user.token.accessToken,
        },
      }
    );

    const productData = catalogResponse?.data;
    const productName = productData?.summaries?.[0]?.itemName;
    const image = productData?.images?.[0]?.images?.find(
      (img) => img.variant === "MAIN"
    )?.link;

    const newProduct = new Product({
      asin,
      sku,
      productName,
      productImage: image,
      userId,
      marketPlaceId: marketPlaceId,
    });

    await newProduct.save();

    return res
      .status(201)
      .json({ message: "Product saved successfully.", product: newProduct });
  } catch (error) {
    console.error("Error adding single product:", error);
    return res
      .status(500)
      .json({
        message: "Server error.",
        error: error.response?.data || error.message,
      });
  }
};

const getProducts = async (req, res) => {
  try {
    const userId = req?.user?.id;
    if (!userId) {
      return createErrorResponse(res, "User not found", 404);
    }

    const products = await Product.find({ userId });

    return createSuccessResponse(
      res,
      "Products fetched successfully",
      products,
      200
    );
  } catch (error) {
    return serverErrorResponse(res, error);
  }
};

module.exports = { addSingleProduct, getProducts };
