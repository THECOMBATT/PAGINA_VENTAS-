const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/', saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);
router.post('/:id/cancel', requireRole(['admin', 'supervisor']), saleController.cancelSale);

module.exports = router;
