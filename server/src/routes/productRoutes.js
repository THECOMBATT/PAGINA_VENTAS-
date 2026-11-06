const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.use(authenticateToken);

// Productos
router.get('/', productController.getProducts);
router.get('/detail/:id', productController.getProductById);
router.post('/', requireRole(['admin', 'supervisor']), productController.createProduct);
router.put('/:id', requireRole(['admin', 'supervisor']), productController.updateProduct);
router.delete('/:id', requireRole(['admin']), productController.deleteProduct);
router.post('/:id/adjust-stock', requireRole(['admin', 'supervisor']), productController.adjustStock);

// Categorías
router.get('/categories/all', productController.getCategories);
router.post('/categories', requireRole(['admin', 'supervisor']), productController.createCategory);
router.delete('/categories/:id', requireRole(['admin']), productController.deleteCategory);

module.exports = router;
