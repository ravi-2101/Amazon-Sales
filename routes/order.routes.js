var express = require('express');
var router = express.Router();
const {  getOrderData } = require("../controller/order.controller");
const jwtAuthorise = require("../middleware/jwtAuth.middleware");

router.get("/get",jwtAuthorise, getOrderData);


module.exports = router;
