const { default: axios } = require("axios");
const User = require("../model/user.model");
const Order = require("../model/order.model");
const { BSON } = require("bson");

const MAX_CHUNK_SIZE = 1000;
const MAX_PAYLOAD_SIZE = 48 * 1024 * 1024; 

const insertOrders = async () => {
  try {
    const users = await User.find({
      "token.accessToken": { $exists: true, $ne: null },
      marketPlaceIds: { $exists: true, $ne: [] },
    }).select("token.accessToken marketPlaceIds");

    if (!users.length) {
      console.log("No users with valid tokens and marketplace IDs.");
      return;
    }

    for (const user of users) {
      for (const marketPlaceId of user.marketPlaceIds) {
        const latestOrder = await Order.findOne({ marketPlaceId, userId: user._id }).sort({
          shipmentDate: -1,
        });

        const createdAfter = latestOrder
          ? new Date(latestOrder.shipmentDate).toISOString()
          : new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

        console.log(
          `📦 Fetching orders for marketplace ${marketPlaceId} since ${createdAfter}`
        );

        let nextToken = null;

        let operations = [];
        let currentBatchSize = 0;

        const flushBatch = async () => {
          if (operations.length > 0) {
            await Order.bulkWrite(operations, { ordered: false });
            console.log(
              `✅ BulkWrite executed: ${operations.length} operations, ~${(currentBatchSize / 1024).toFixed(2)} KB`
            );
            operations = [];
            currentBatchSize = 0;
          }
        };

        while (true) {
          const url = `${process.env.AMAZON_URL}/orders/v0/orders?${
            nextToken
              ? `NextToken=${encodeURIComponent(nextToken)}`
              : `MarketplaceIds=${marketPlaceId}&CreatedAfter=${encodeURIComponent(createdAfter)}`
          }`;

          try {
            await new Promise((resolve) => setTimeout(resolve, 3000)); 

            const { data } = await axios.get(url, {
              headers: { "x-amz-access-token": user.token.accessToken },
            });

            const { Orders = [], NextToken } = data?.payload || {};
            nextToken = NextToken;

            if (!Orders.length) {
              console.log(
                `ℹ️ No orders found for user ${user._id} in marketplace ${marketPlaceId}.`
              );
              break;
            }

            for (const order of Orders) {
              const orderDoc = {
                amazonOrderId: order.AmazonOrderId,
                shipmentDate: order?.LatestShipDate,
                buyerEmail: order?.BuyerInfo?.BuyerEmail,
                orderTotal: order?.OrderTotal?.Amount,
                marketPlaceId,
                userId: user._id,
              };

              const orderSize = BSON.serialize(orderDoc).byteLength;

              const willExceedSize = currentBatchSize + orderSize > MAX_PAYLOAD_SIZE;
              const willExceedCount = operations.length >= MAX_CHUNK_SIZE;

              if (willExceedSize || willExceedCount) {
                await flushBatch();
              }

              operations.push({
                updateOne: {
                  filter: { amazonOrderId: order.AmazonOrderId },
                  update: { $setOnInsert: orderDoc },
                  upsert: true,
                },
              });

              currentBatchSize += orderSize;
            }

            if (!nextToken) {
              break;
            }

            console.log(`➡️ Fetching next page with NextToken: ${nextToken}`);
          } catch (error) {
            console.error(
              `❌ Error fetching orders for user ${user._id}, marketplace ${marketPlaceId}:`,
              error?.response?.data || error.message
            );
            break;
          }
        }

        await flushBatch();
      }
    }

    console.log("✅ Completed fetching and inserting orders.");
  } catch (error) {
    console.error("❌ Unexpected error in insertOrders:", error);
  }
};

module.exports = { insertOrders };
