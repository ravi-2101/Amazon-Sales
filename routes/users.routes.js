var express = require('express');
var router = express.Router();
const { registerUser, loginUser } = require("../controller/users.controller");
const {
  validateRegisterUser,
  validateLoginUser,
} = require("../validation/userValidation");

router.post("/register", validateRegisterUser, registerUser);
router.post("/login", validateLoginUser, loginUser);

module.exports = router;
