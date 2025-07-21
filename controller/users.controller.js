const { default: axios } = require("axios");
const User = require("../model/user.model");
const {
  serverErrorResponse,
  createSuccessResponse,
  createErrorResponse,
} = require("../services/commonFunction");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      refreshToken,
      marketPlaceIds,
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return createErrorResponse(res, "User already exists", 400);
    }

    if (password !== confirmPassword) {
      return createErrorResponse(
        res,
        "Password and confirm password do not match",
        400
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      token: {
        accessToken: null,
        refreshToken,
      },
      marketPlaceIds,
    });

    return createSuccessResponse(
      res,
      "User registered successfully",
      user,
      201
    );
  } catch (error) {
    return serverErrorResponse(res, error);
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return createErrorResponse(res, "User not found", 404);
    }

    const isPasswordMatch = await bcrypt.compare(password, user?.password);

    if (!isPasswordMatch) {
      return createErrorResponse(res, "Password is incorrect", 400);
    }

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

    const amazonAccessToken = amazonResponse?.data?.access_token;

    user.token.accessToken = amazonAccessToken;
    await user.save();

    const token = await jwt.sign(
      { id: user?._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    const data = {
      _id: user?._id,
      name: user?.name,
      email: user?.email,
      createdAt: user?.createdAt,
      token: user?.token,
      jwtToken: token,
    };

    return createSuccessResponse(res, "Login successful", data, 200);
  } catch (error) {
    return serverErrorResponse(res, error);
  }
};

module.exports = {
  registerUser,
  loginUser,
};
