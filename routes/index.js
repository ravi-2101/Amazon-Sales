var express = require('express');
var router = express.Router();

const userRoutes = require('./users.routes');
const orderRoutes = require('./order.routes');
const salesRoutes = require('./sales.routes');
const productRoutes = require('./product.routes');

router.use('/user', userRoutes);
router.use('/order', orderRoutes);
router.use('/sales', salesRoutes);
router.use('/products', productRoutes);

module.exports = router;
