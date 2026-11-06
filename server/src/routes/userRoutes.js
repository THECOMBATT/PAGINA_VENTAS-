const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', userController.getUsers);
router.post('/', requireRole(['admin']), userController.createUser);
router.put('/:id', requireRole(['admin']), userController.updateUser);
router.delete('/:id', requireRole(['admin']), userController.deleteUser);

module.exports = router;
