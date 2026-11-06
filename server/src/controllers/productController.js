const db = require('../config/db');

const productController = {
  // Listar productos de la empresa
  async getProducts(req, res) {
    try {
      const { category_id, search, low_stock } = req.query;

      let query = `
        SELECT p.*, c.name as category_name, c.color as category_color,
               CASE
                 WHEN p.stock <= 0 THEN 'out_of_stock'
                 WHEN p.stock <= p.min_stock THEN 'low_stock'
                 ELSE 'in_stock'
               END as stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.company_id = ? AND p.status = 'active'
      `;
      let params = [req.user.companyId];

      if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }

      if (search) {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      if (low_stock === 'true') {
        query += ' AND p.stock <= p.min_stock';
      }

      query += ' ORDER BY p.name ASC';

      const products = db.prepare(query).all(...params);
      return res.json({ products });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener productos: ' + error.message });
    }
  },

  // Obtener producto por ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = db.prepare(`
        SELECT p.*, c.name as category_name, c.color as category_color
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.company_id = ?
      `).get(id, req.user.companyId);

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      // Historial de movimientos
      const movements = db.prepare(`
        SELECT sm.*, u.name as user_name
        FROM stock_movements sm
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE sm.product_id = ? AND sm.company_id = ?
        ORDER BY sm.created_at DESC
        LIMIT 20
      `).all(id, req.user.companyId);

      return res.json({ product, movements });
    } catch (error) {
      return res.status(500).json({ error: 'Error al consultar producto: ' + error.message });
    }
  },

  // Crear nuevo producto
  async createProduct(req, res) {
    try {
      const {
        category_id,
        sku,
        barcode,
        name,
        description,
        cost_price = 0,
        sale_price,
        stock = 0,
        min_stock = 5,
        unit = 'unidad',
        image_url
      } = req.body;

      if (!name || sale_price === undefined) {
        return res.status(400).json({ error: 'Nombre del producto y precio de venta son obligatorios.' });
      }

      const parsedSalePrice = parseFloat(sale_price);
      const parsedCostPrice = parseFloat(cost_price) || 0;
      const parsedStock = parseInt(stock) || 0;
      const parsedMinStock = parseInt(min_stock) || 5;

      const result = db.prepare(`
        INSERT INTO products (
          company_id, category_id, sku, barcode, name, description,
          cost_price, sale_price, stock, min_stock, unit, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.companyId,
        category_id ? parseInt(category_id) : null,
        sku ? sku.trim() : null,
        barcode ? barcode.trim() : null,
        name.trim(),
        description ? description.trim() : null,
        parsedCostPrice,
        parsedSalePrice,
        parsedStock,
        parsedMinStock,
        unit,
        image_url || null
      );

      const productId = Number(result.lastInsertRowid);

      // Registrar movimiento inicial de inventario si hay stock inicial
      if (parsedStock > 0) {
        db.prepare(`
          INSERT INTO stock_movements (company_id, product_id, user_id, type, quantity, previous_stock, new_stock, reference)
          VALUES (?, ?, ?, 'adjustment', ?, 0, ?, 'Inventario inicial')
        `).run(req.user.companyId, productId, req.user.id, parsedStock, parsedStock);
      }

      const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      return res.status(201).json({ message: 'Producto registrado exitosamente', product: newProduct });
    } catch (error) {
      return res.status(500).json({ error: 'Error al crear producto: ' + error.message });
    }
  },

  // Actualizar producto
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const {
        category_id,
        sku,
        barcode,
        name,
        description,
        cost_price,
        sale_price,
        min_stock,
        unit,
        image_url
      } = req.body;

      const existing = db.prepare('SELECT id FROM products WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!existing) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      db.prepare(`
        UPDATE products
        SET category_id = ?,
            sku = ?,
            barcode = ?,
            name = ?,
            description = ?,
            cost_price = ?,
            sale_price = ?,
            min_stock = ?,
            unit = ?,
            image_url = ?
        WHERE id = ? AND company_id = ?
      `).run(
        category_id ? parseInt(category_id) : null,
        sku ? sku.trim() : null,
        barcode ? barcode.trim() : null,
        name ? name.trim() : 'Sin nombre',
        description ? description.trim() : null,
        cost_price !== undefined ? parseFloat(cost_price) : 0,
        sale_price !== undefined ? parseFloat(sale_price) : 0,
        min_stock !== undefined ? parseInt(min_stock) : 5,
        unit || 'unidad',
        image_url || null,
        id,
        req.user.companyId
      );

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return res.json({ message: 'Producto actualizado correctamente', product: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Error al actualizar producto: ' + error.message });
    }
  },

  // Ajuste manual de inventario
  async adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason = 'Ajuste manual' } = req.body;

      const qty = parseInt(quantity);
      if (isNaN(qty) || qty === 0) {
        return res.status(400).json({ error: 'La cantidad a ajustar debe ser distinta de cero.' });
      }

      const product = db.prepare('SELECT id, stock FROM products WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      const previousStock = product.stock;
      const newStock = previousStock + qty;

      if (newStock < 0) {
        return res.status(400).json({ error: `El ajuste daría un stock negativo (${newStock}). No permitido.` });
      }

      db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, id);

      db.prepare(`
        INSERT INTO stock_movements (company_id, product_id, user_id, type, quantity, previous_stock, new_stock, reference)
        VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?)
      `).run(req.user.companyId, id, req.user.id, qty, previousStock, newStock, reason);

      return res.json({
        message: 'Inventario ajustado con éxito',
        previousStock,
        newStock
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error al ajustar inventario: ' + error.message });
    }
  },

  // Eliminar producto (soft delete o delete si no tiene ventas)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const hasSales = db.prepare('SELECT id FROM sale_items WHERE product_id = ? LIMIT 1').get(id);

      if (hasSales) {
        // Marcamos como inactivo para preservar integridad contable
        db.prepare('UPDATE products SET status = "inactive" WHERE id = ? AND company_id = ?').run(id, req.user.companyId);
        return res.json({ message: 'Producto archivado/desactivado para mantener historial contable.' });
      } else {
        db.prepare('DELETE FROM products WHERE id = ? AND company_id = ?').run(id, req.user.companyId);
        return res.json({ message: 'Producto eliminado definitivamente.' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error al eliminar producto: ' + error.message });
    }
  },

  // Categorías
  async getCategories(req, res) {
    try {
      const categories = db.prepare(`
        SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status = 'active') as product_count
        FROM categories c
        WHERE c.company_id = ?
        ORDER BY c.name ASC
      `).all(req.user.companyId);

      return res.json({ categories });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener categorías: ' + error.message });
    }
  },

  async createCategory(req, res) {
    try {
      const { name, color = '#4f46e5' } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'El nombre de categoría es requerido.' });
      }

      const result = db.prepare('INSERT INTO categories (company_id, name, color) VALUES (?, ?, ?)')
        .run(req.user.companyId, name.trim(), color);

      const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json({ message: 'Categoría creada', category: newCat });
    } catch (error) {
      return res.status(500).json({ error: 'Error al crear categoría: ' + error.message });
    }
  },

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM categories WHERE id = ? AND company_id = ?').run(id, req.user.companyId);
      return res.json({ message: 'Categoría eliminada' });
    } catch (error) {
      return res.status(500).json({ error: 'Error al eliminar categoría: ' + error.message });
    }
  }
};

module.exports = productController;
