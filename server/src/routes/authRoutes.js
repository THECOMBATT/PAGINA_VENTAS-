const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/login', authController.login);
router.post('/register', authController.registerCompany);
router.get('/companies', authController.listDemoCompanies);
router.get('/me', authenticateToken, authController.me);

module.exports = router;
