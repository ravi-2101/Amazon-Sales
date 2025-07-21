const jwt = require("jsonwebtoken");

const jwtAuthorise = async (req, res, next) => {
  const authorise = req.get("Authorization");
  if (!authorise) {
    return res.status(401).json({ status: false, message: "Unauthorised to access!" });
  }

  try {
    const token = authorise.split(" ")[1];
    let decode;
    decode = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decode;

    next();
  } catch (error) {
    return res.status(500).json({ status: false, message: "Token Expired!" });
  }
};

module.exports = jwtAuthorise;
