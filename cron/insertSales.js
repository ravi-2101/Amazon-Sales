const { default: axios } = require("axios");
const Product = require("../model/product.model");
const Sales = require("../model/sales.model");
const User = require("../model/user.model");
const moment = require("moment-timezone");
const { BSON } = require("bson");
const MAX_CHUNK_SIZE = 1000;
const MAX_PAYLOAD_SIZE = 48 * 1024 * 1024;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSalesDataWithRetry = async (
  url,
  headers,
  maxRetries = 5,
  delayMs = 10000
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, { headers });
      return response?.data;
    } catch (error) {
      const apiErrorCode = error?.response?.data?.errors?.[0]?.code;
      if (apiErrorCode === "QuotaExceeded") {
        console.warn(
          `Quota exceeded. Retrying in ${
            delayMs / 1000
          }s (Attempt ${attempt}/${maxRetries})...`
        );
        await sleep(delayMs);
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} retries due to quota limits.`);
};

const insertSales = async () => {
  try {
    const users = await User.find({
      "token.accessToken": { $exists: true, $ne: null },
      marketPlaceIds: { $exists: true, $ne: [] },
    }).select("token.accessToken marketPlaceIds");

    if (!users.length) {
      console.log("❌ No users found with valid access tokens and marketplaceIds.");
      return;
    }

    const timezone = "America/Los_Angeles";
    const targetDay = moment().subtract(4, "days").tz(timezone);
    const formattedDay = targetDay.format("YYYY-MM-DD");
    const startDate = targetDay.startOf("day").format("YYYY-MM-DDTHH:mmZ");
    const endDate = targetDay.clone().add(1, "days").startOf("day").format("YYYY-MM-DDTHH:mmZ");
    const interval = `${encodeURIComponent(startDate)}--${encodeURIComponent(endDate)}`;

    for (const user of users) {
      const products = await Product.find({ userId: user._id }).select("asin sku");

      if (!products.length) {
        console.log(`ℹ️ No products found for user ${user._id}. Skipping...`);
        continue;
      }

      for (const marketPlaceId of user.marketPlaceIds) {
        let operations = [];
        let currentBatchSize = 0;

        const flushBatch = async () => {
          if (operations.length > 0) {
            await Sales.bulkWrite(operations, { ordered: false });
            console.log(
              `✅ BulkWrite complete for user ${user._id}, marketplace ${marketPlaceId} – ${operations.length} records (~${(currentBatchSize / 1024).toFixed(2)} KB)`
            );
            operations = [];
            currentBatchSize = 0;
          }
        };

        for (const product of products) {
          const url = `${process.env.AMAZON_URL}/sales/v1/orderMetrics?asin=${product.asin}&marketplaceIds=${marketPlaceId}&interval=${interval}&granularity=day`;

          try {
            const data = await fetchSalesDataWithRetry(url, {
              "x-amz-access-token": user.token.accessToken,
            });

            const salesData = data?.payload || [];

            for (const sale of salesData) {
              const salesDoc = {
                userId: user._id,
                asin: product.asin,
                sku: product.sku,
                totalSales: sale?.totalSales?.amount,
                quantity: sale?.unitCount,
                marketPlaceId,
                dayOfSale: formattedDay,
              };

              const docSize = BSON.serialize(salesDoc).byteLength;
              const willExceedSize = currentBatchSize + docSize > MAX_PAYLOAD_SIZE;
              const willExceedCount = operations.length >= MAX_CHUNK_SIZE;

              if (willExceedSize || willExceedCount) {
                await flushBatch();
              }

              operations.push({
                updateOne: {
                  filter: {
                    userId: user._id,
                    asin: product.asin,
                    marketPlaceId,
                    dayOfSale: formattedDay,
                  },
                  update: { $setOnInsert: salesDoc },
                  upsert: true,
                },
              });

              currentBatchSize += docSize;
            }
          } catch (apiError) {
            console.error(
              `❌ API error for ASIN ${product.asin}, marketplace ${marketPlaceId}:`,
              apiError?.response?.data || apiError?.message
            );
          }
        }

        await flushBatch();
      }
    }

    console.log("✅ Sales data insertion complete.");
  } catch (error) {
    console.error("❌ Error inserting sales data:", error);
  }
};

module.exports = insertSales;
