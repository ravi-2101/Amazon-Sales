const cron = require("node-cron");
const refreshUserToken = require("./refreshToken");
const { fetchAndSaveProductsUsingCatalogAPI } = require("./insertProduct");
const insertSales = require("./insertSales");
const { insertOrders } = require("./insertOrder");
const { insertOrderItems } = require("./insertOrderItems");


const startCronJobs = async () => {
  cron.schedule("*/50 * * * *", async () => {
    console.log("Running Amazon Access Token Refresh Cron Job...");
    await refreshUserToken();
    console.log("Amazon Access Token Refresh Cron Job Completed...");
  });

  cron.schedule("17 9 * * *", async () => {
    console.log("Cron job started to insert sales data for all users");
    await insertSales();
    console.log("Cron job completed");
  });

  cron.schedule("16 9 * * *", async () => {
    console.log("Cron job started to insert order data for all users");
    await insertOrders();
    console.log("Cron job completed");
  });

  cron.schedule("30 9 * * *", async () => {
    console.log("Cron job started to insert order items data for all users");
    await insertOrderItems();
    console.log("Cron job completed");
  });

  cron.schedule("31 9 * * *", async () => {
    console.log("Cron job started to insert product data for all users");
    await fetchAndSaveProductsUsingCatalogAPI();
    console.log("Cron job completed");
  });
};

module.exports = { startCronJobs };
