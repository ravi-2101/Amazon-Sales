var express = require('express');
var router = express.Router();
const jwtAuthorise = require("../middleware/jwtAuth.middleware");
const { addSingleProduct, getProducts } = require('../controller/product.controller');


router.post("/add",jwtAuthorise, addSingleProduct);
router.get("/get",jwtAuthorise, getProducts);

module.exports = router;