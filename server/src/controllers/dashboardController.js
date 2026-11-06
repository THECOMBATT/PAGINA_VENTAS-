const db = require('../config/db');

const dashboardController = {
  async getMetrics(req, res) {
    try {
      const companyId = req.user.companyId;

      // 1. Ventas de Hoy
      const todayStats = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM sales
        WHERE company_id = ? AND date(created_at) = date('now', 'localtime') AND status = 'completed'
      `).get(companyId);

      // 2. Ventas del Mes
      const monthStats = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
        FROM sales
        WHERE company_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime') AND status = 'completed'
      `).get(companyId);

      // 3. Clientes y Productos Activos
      const clientsCount = db.prepare('SELECT COUNT(*) as count FROM clients WHERE company_id = ?').get(companyId).count;
      const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE company_id = ? AND status = "active"').get(companyId).count;

      // 4. Alertas de Stock Bajo
      const lowStockProducts = db.prepare(`
        SELECT id, name, sku, stock, min_stock, unit, sale_price
        FROM products
        WHERE company_id = ? AND status = 'active' AND stock <= min_stock
        ORDER BY stock ASC
        LIMIT 6
      `).all(companyId);

      const lowStockCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM products
        WHERE company_id = ? AND status = 'active' AND stock <= min_stock
      `).get(companyId).count;

      // 5. Tendencia de Ventas últimos 7 días
      const salesTrend = db.prepare(`
        WITH RECURSIVE dates(date) AS (
          SELECT date('now', '-6 days')
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date('now')
        )
        SELECT
          d.date,
          COALESCE(SUM(s.total), 0) as total,
          COUNT(s.id) as count
        FROM dates d
        LEFT JOIN sales s ON date(s.created_at) = d.date AND s.company_id = ? AND s.status = 'completed'
        GROUP BY d.date
        ORDER BY d.date ASC
      `).all(companyId);

      // 6. Distribución por Método de Pago (Mes actual)
      const paymentStats = db.prepare(`
        SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE company_id = ? AND status = 'completed'
        GROUP BY payment_method
      `).all(companyId);

      // 7. Top 5 Productos más Vendidos
      const topProducts = db.prepare(`
        SELECT si.product_id, si.product_name, SUM(si.quantity) as units_sold, SUM(si.subtotal) as total_revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.company_id = ? AND s.status = 'completed'
        GROUP BY si.product_id, si.product_name
        ORDER BY units_sold DESC
        LIMIT 5
      `).all(companyId);

      // 8. Transacciones Recientes
      const recentSales = db.prepare(`
        SELECT s.id, s.invoice_number, s.total, s.payment_method, s.status, s.created_at,
               u.name as user_name, c.name as client_name
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.company_id = ?
        ORDER BY s.created_at DESC
        LIMIT 6
      `).all(companyId);

      return res.json({
        today: todayStats,
        month: monthStats,
        clientsCount,
        productsCount,
        lowStockCount,
        lowStockProducts,
        salesTrend,
        paymentStats,
        topProducts,
        recentSales
      });
    } catch (error) {
      console.error('Error al obtener dashboard:', error);
      return res.status(500).json({ error: 'Error al generar métricas de dashboard: ' + error.message });
    }
  }
};

module.exports = dashboardController;
