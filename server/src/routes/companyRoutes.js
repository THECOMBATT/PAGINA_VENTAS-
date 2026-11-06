const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', companyController.getCompany);
router.put('/', requireRole(['admin']), companyController.updateCompany);

module.exports = router;
