const { default: axios } = require("axios");
const User = require("../model/user.model");

const refreshUserToken = async () => {
  try {
    const users = await User.find({
      "token.refreshToken": { $exists: true, $ne: null },
    });

    for (const user of users) {
      try {
        const amazonResponse = await axios.post(
          "https://api.amazon.com/auth/o2/token",
          new URLSearchParams({
            grant_type: "refresh_token",
            client_id: process.env.AMAZON_CLIENT_ID,
            client_secret: process.env.AMAZON_CLIENT_SECRET,
            refresh_token: user?.token?.refreshToken,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        user.token.accessToken = amazonResponse?.data?.access_token;
        await user.save();

        console.log(`✅ Refreshed token for user: ${user?.email}`);
      } catch (err) {
        console.error(
          `❌ Failed to refresh token for user: ${user?.email}`,
          err?.response?.data || err?.message
        );
      }
    }
  } catch (err) {
    console.error("❌ Error fetching users:", err?.message);
  }
};

module.exports = refreshUserToken;
