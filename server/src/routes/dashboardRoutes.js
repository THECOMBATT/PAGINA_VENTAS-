const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/metrics', dashboardController.getMetrics);

module.exports = router;
