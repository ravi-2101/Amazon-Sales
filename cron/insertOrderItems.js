const { default: axios } = require("axios");
const Order = require("../model/order.model");
const User = require("../model/user.model");
const OrderItem = require("../model/orderItem.model");
const { BSON } = require("bson");


const MAX_CHUNK_SIZE = 1000;
const MAX_PAYLOAD_SIZE = 48 * 1024 * 1024; 

const insertOrderItems = async () => {
  try {
    const users = await User.find({
      "token.accessToken": { $exists: true, $ne: null },
      marketPlaceIds: { $exists: true, $ne: [] },
    }).select("token.accessToken marketPlaceIds");

    if (!users.length) {
      console.error("❌ No users found with valid access tokens and marketplaceIds.");
      return;
    }

    const existingOrderItemIds = await OrderItem.distinct("amazonOrderId");

    for (const user of users) {
      for (const marketPlaceId of user.marketPlaceIds) {
        const orders = await Order.find({
          amazonOrderId: { $nin: existingOrderItemIds },
          marketPlaceId,
          userId: user._id,
        }).select("amazonOrderId");

        if (!orders.length) {
          console.log(`ℹ️ No new orders for user ${user._id} in marketplace ${marketPlaceId}.`);
          continue;
        }

        for (const order of orders) {
          let nextToken = null;

          let operations = [];
          let currentBatchSize = 0;

          const flushBatch = async () => {
            if (operations.length > 0) {
              await OrderItem.bulkWrite(operations, { ordered: false });
              console.log(
                `✅ BulkWrite executed for order ${order.amazonOrderId}: ${operations.length} items (~${(currentBatchSize / 1024).toFixed(2)} KB)`
              );
              operations = [];
              currentBatchSize = 0;
            }
          };

          while (true) {
            let url = `${process.env.AMAZON_URL}/orders/v0/orders/${order.amazonOrderId}/orderItems?MarketplaceIds=${marketPlaceId}`;
            if (nextToken) {
              url += `&NextToken=${encodeURIComponent(nextToken)}`;
            }

            try {
              await new Promise((resolve) => setTimeout(resolve, 2500)); 
                console.log("🚀 ~ insertOrderItems ~ accessToken:", user.token.accessToken )

              const response = await axios.get(url, {
                headers: { "x-amz-access-token": user.token.accessToken },
              });

              const { OrderItems, NextToken } = response?.data?.payload || {};
              nextToken = NextToken;

              if (!OrderItems?.length) {
                console.log(`ℹ️ No items found for order ${order.amazonOrderId}.`);
                break;
              }

              for (const item of OrderItems) {
                const itemDoc = {
                  amazonOrderId: order.amazonOrderId,
                  orderItemId: item?.OrderItemId,
                  productName: item?.Title,
                  asin: item?.ASIN,
                  sku: item?.SellerSKU,
                };

                const itemSize = BSON.serialize(itemDoc).byteLength;

                const willExceedSize = currentBatchSize + itemSize > MAX_PAYLOAD_SIZE;
                const willExceedCount = operations.length >= MAX_CHUNK_SIZE;

                if (willExceedSize || willExceedCount) {
                  await flushBatch();
                }

                operations.push({
                  updateOne: {
                    filter: {
                      amazonOrderId: order.amazonOrderId,
                      orderItemId: item.OrderItemId,
                    },
                    update: { $setOnInsert: itemDoc },
                    upsert: true,
                  },
                });

                currentBatchSize += itemSize;
              }

              if (!nextToken) break;
            } catch (error) {
              console.error(
                `❌ Error fetching order items for order ${order.amazonOrderId}:`,
                error?.response?.data || error.message
              );
              break;
            }
          }

          await flushBatch();
        }
      }
    }

    console.log("✅ Finished fetching and saving order items.");
  } catch (error) {
    console.error("❌ Error in insertOrderItems:", error);
  }
};

module.exports = { insertOrderItems };
