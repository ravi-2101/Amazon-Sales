const axios = require("axios");
const User = require("../model/user.model");
const Product = require("../model/product.model");
const OrderItem = require("../model/orderItem.model");

const fetchAndSaveProductsUsingCatalogAPI = async () => {
  try {
    const users = await User.find({
      "token.accessToken": { $exists: true, $ne: null },
      marketPlaceIds: { $exists: true, $ne: [] },
    }).select("token.accessToken marketPlaceIds");

    if (!users.length) {
      console.log("No users found with access tokens and marketplaceIds.");
      return;
    }

    const orderItems = await OrderItem.aggregate([
      {
        $group: {
          _id: { asin: "$asin", sku: "$sku" },
        },
      },
    ]);

    if (!orderItems.length) {
      console.log("No ASINs with SKUs found in OrderItem table.");
      return;
    }

    console.log(
      `Found ${orderItems.length} unique ASIN + SKU pairs from OrderItem.`
    );

    for (const user of users) {
      for (const marketPlaceId of user.marketPlaceIds) {
        const bulkOps = [];

        for (const item of orderItems) {
          const asin = item._id.asin;
          const sku = item._id.sku;

          try {
            await new Promise((resolve) => setTimeout(resolve, 2000)); 

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
              (img) => img?.variant === "MAIN"
            )?.link;

            bulkOps.push({
              updateOne: {
                filter: { asin, sku, marketPlaceId },
                update: {
                  $setOnInsert: {
                    asin,
                    sku,
                    productName,
                    productImage: image,
                    userId: user._id,
                    marketPlaceId,
                  },
                },
                upsert: true,
              },
            });
          } catch (error) {
            console.error(
              `Error fetching product with ASIN ${asin}:`,
              error?.response?.data || error.message
            );
          }
        }

        if (bulkOps.length) {
          const result = await Product.bulkWrite(bulkOps);
          console.log(
            `Completed bulk write for user ${user._id} in marketplace ${marketPlaceId}. Inserted: ${result.upsertedCount}.`
          );
        } else {
          console.log(
            `No new products to insert for user ${user._id} in marketplace ${marketPlaceId}.`
          );
        }
      }
    }

    console.log("✅ Products saved successfully from OrderItem ASINs.");
  } catch (error) {
    console.error("❌ Error in fetchAndSaveProductsUsingCatalogAPI:", error);
  }
};

module.exports = { fetchAndSaveProductsUsingCatalogAPI };
