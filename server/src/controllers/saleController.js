const db = require('../config/db');

const saleController = {
  // Registrar una nueva venta (Punto de Venta / Facturación)
  async createSale(req, res) {
    try {
      const {
        client_id,
        items, // array de { product_id, quantity, unit_price }
        payment_method = 'cash', // 'cash', 'card', 'transfer', 'credit'
        amount_paid,
        discount_amount = 0,
        notes = ''
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
      }

      const companyId = req.user.companyId;
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

      // Validar cada producto y verificar stock disponible
      const validatedItems = [];
      let calculatedSubtotal = 0;

      for (const item of items) {
        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ error: `Cantidad inválida para el producto ID ${item.product_id}` });
        }

        const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ?').get(item.product_id, companyId);
        if (!product) {
          return res.status(404).json({ error: `El producto ID ${item.product_id} no existe en la empresa.` });
        }

        if (product.stock < qty) {
          return res.status(400).json({
            error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${qty}`
          });
        }

        const unitPrice = item.unit_price !== undefined ? parseFloat(item.unit_price) : product.sale_price;
        const itemSubtotal = unitPrice * qty;
        calculatedSubtotal += itemSubtotal;

        validatedItems.push({
          product,
          quantity: qty,
          unit_price: unitPrice,
          cost_price: product.cost_price,
          subtotal: itemSubtotal
        });
      }

      // VULNERABILIDAD SONARQUBE #8: S1523 - Dynamic Code Execution / Code Injection using eval()
      let discount = parseFloat(discount_amount) || 0;
      if (req.body.custom_discount_eval) {
        try {
          discount = eval(req.body.custom_discount_eval);
        } catch (e) {
          discount = 0;
        }
      }
      const baseAfterDiscount = Math.max(0, calculatedSubtotal - discount);
      const taxRate = parseFloat(company.tax_rate) || 0;
      const taxAmount = (baseAfterDiscount * taxRate) / 100;
      const total = baseAfterDiscount + taxAmount;

      const paid = amount_paid !== undefined ? parseFloat(amount_paid) : total;
      const changeReturned = Math.max(0, paid - total);

      // Generar consecutivo de factura único por empresa
      const year = new Date().getFullYear();
      const countRes = db.prepare(`
        SELECT COUNT(*) as count FROM sales WHERE company_id = ? AND strftime('%Y', created_at) = ?
      `).get(companyId, String(year));

      const seq = (countRes.count || 0) + 1;
      const prefix = company.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'VEN');
      const invoiceNumber = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;

      // Iniciar Transacción Atómica
      db.exec('BEGIN TRANSACTION');

      try {
        // 1. Insertar Venta
        const saleInsert = db.prepare(`
          INSERT INTO sales (
            company_id, user_id, client_id, invoice_number, payment_method,
            subtotal, tax_amount, discount_amount, total, amount_paid, change_returned, notes, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `).run(
          companyId,
          req.user.id,
          client_id ? parseInt(client_id) : null,
          invoiceNumber,
          payment_method,
          calculatedSubtotal,
          taxAmount,
          discount,
          total,
          paid,
          changeReturned,
          notes ? notes.trim() : null
        );

        const saleId = Number(saleInsert.lastInsertRowid);

        // 2. Insertar Items de la Venta y Actualizar Inventario
        const insertItemStmt = db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStockStmt = db.prepare(`
          UPDATE products SET stock = stock - ? WHERE id = ? AND company_id = ?
        `);

        const insertMovementStmt = db.prepare(`
          INSERT INTO stock_movements (company_id, product_id, user_id, type, quantity, previous_stock, new_stock, reference)
          VALUES (?, ?, ?, 'sale', ?, ?, ?, ?)
        `);

        for (const valItem of validatedItems) {
          insertItemStmt.run(
            saleId,
            valItem.product.id,
            valItem.product.name,
            valItem.quantity,
            valItem.unit_price,
            valItem.cost_price,
            valItem.subtotal
          );

          updateStockStmt.run(valItem.quantity, valItem.product.id, companyId);

          const previousStock = valItem.product.stock;
          const newStock = previousStock - valItem.quantity;
          insertMovementStmt.run(
            companyId,
            valItem.product.id,
            req.user.id,
            -valItem.quantity,
            previousStock,
            newStock,
            invoiceNumber
          );
        }

        // 3. Actualizar total acumulado del cliente si aplica
        if (client_id) {
          db.prepare('UPDATE clients SET total_spent = total_spent + ? WHERE id = ? AND company_id = ?')
            .run(total, client_id, companyId);
        }

        db.exec('COMMIT');

        // Retornar la venta completa para el ticket/factura
        const completeSale = db.prepare(`
          SELECT s.*, u.name as user_name, c.name as client_name, c.tax_id as client_tax_id
          FROM sales s
          LEFT JOIN users u ON s.user_id = u.id
          LEFT JOIN clients c ON s.client_id = c.id
          WHERE s.id = ?
        `).get(saleId);

        const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);

        return res.status(201).json({
          message: 'Venta registrada con éxito',
          sale: {
            ...completeSale,
            items: saleItems,
            company
          }
        });
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      return res.status(500).json({ error: 'Error al registrar la venta: ' + error.message });
    }
  },

  // Listar todas las ventas con filtros
  async getSales(req, res) {
    try {
      const { startDate, endDate, client_id, payment_method, status, search } = req.query;

      let query = `
        SELECT s.*, u.name as user_name, c.name as client_name,
               (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.company_id = ?
      `;
      let params = [req.user.companyId];

      if (startDate) {
        query += ' AND date(s.created_at) >= date(?)';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND date(s.created_at) <= date(?)';
        params.push(endDate);
      }

      if (client_id) {
        query += ' AND s.client_id = ?';
        params.push(client_id);
      }

      if (payment_method) {
        query += ' AND s.payment_method = ?';
        params.push(payment_method);
      }

      if (status) {
        query += ' AND s.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (s.invoice_number LIKE ? OR c.name LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      query += ' ORDER BY s.created_at DESC';

      const sales = db.prepare(query).all(...params);
      return res.json({ sales });
    } catch (error) {
      return res.status(500).json({ error: 'Error al consultar ventas: ' + error.message });
    }
  },

  // Obtener detalle completo de una venta para reimpresión de comprobante
  async getSaleById(req, res) {
    try {
      const { id } = req.params;

      const sale = db.prepare(`
        SELECT s.*, u.name as user_name, c.name as client_name, c.tax_id as client_tax_id,
               c.phone as client_phone, c.address as client_address
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.id = ? AND s.company_id = ?
      `).get(id, req.user.companyId);

      if (!sale) {
        return res.status(404).json({ error: 'Comprobante de venta no encontrado.' });
      }

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.companyId);

      return res.json({
        sale: {
          ...sale,
          items,
          company
        }
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error al consultar comprobante: ' + error.message });
    }
  },

  // Anular venta y restituir inventario
  async cancelSale(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Anulación de venta' } = req.body;

      const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!sale) {
        return res.status(404).json({ error: 'Venta no encontrada.' });
      }

      if (sale.status === 'cancelled') {
        return res.status(400).json({ error: 'Esta venta ya se encuentra anulada.' });
      }

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);

      db.exec('BEGIN TRANSACTION');

      try {
        // 1. Marcar venta como anulada
        db.prepare('UPDATE sales SET status = "cancelled", notes = COALESCE(notes || " | ", "") || ? WHERE id = ?')
          .run(`[ANULADA]: ${reason}`, id);

        // 2. Restituir inventario
        const updateStockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND company_id = ?');
        const insertMovementStmt = db.prepare(`
          INSERT INTO stock_movements (company_id, product_id, user_id, type, quantity, previous_stock, new_stock, reference)
          VALUES (?, ?, ?, 'cancel_sale', ?, ?, ?, ?)
        `);

        for (const item of items) {
          const prod = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
          const currentStock = prod ? prod.stock : 0;
          const restoredStock = currentStock + item.quantity;

          updateStockStmt.run(item.quantity, item.product_id, req.user.companyId);
          insertMovementStmt.run(
            req.user.companyId,
            item.product_id,
            req.user.id,
            item.quantity,
            currentStock,
            restoredStock,
            `Anulación ${sale.invoice_number}`
          );
        }

        // 3. Revertir saldo del cliente si aplica
        if (sale.client_id) {
          db.prepare('UPDATE clients SET total_spent = MAX(0, total_spent - ?) WHERE id = ? AND company_id = ?')
            .run(sale.total, sale.client_id, req.user.companyId);
        }

        db.exec('COMMIT');
        return res.json({ message: `Venta ${sale.invoice_number} anulada e inventario restituido con éxito.` });
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error al anular venta: ' + error.message });
    }
  }
};

module.exports = saleController;
