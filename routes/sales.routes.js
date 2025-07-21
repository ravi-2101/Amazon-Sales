var express = require('express');
var router = express.Router();
const { getSales } = require("../controller/sales.controller");
const jwtAuthorise = require("../middleware/jwtAuth.middleware");


router.get("/get",jwtAuthorise, getSales);

module.exports = router;