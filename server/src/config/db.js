const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/ventas_saas.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Optimizar SQLite y asegurar integridad referencial
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  db.exec(`
    -- Tabla de Empresas (Tenants)
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      tax_id TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      currency_symbol TEXT DEFAULT '$',
      currency_code TEXT DEFAULT 'USD',
      tax_rate REAL DEFAULT 16.0,
      ticket_footer TEXT DEFAULT '¡Gracias por su compra!',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Tabla de Usuarios por Empresa
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin', -- 'admin', 'vendedor', 'supervisor'
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE (company_id, email)
    );

    -- Tabla de Categorías de Productos
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#4f46e5',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- Tabla de Productos e Inventario
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      category_id INTEGER,
      sku TEXT,
      barcode TEXT,
      name TEXT NOT NULL,
      description TEXT,
      cost_price REAL DEFAULT 0.00,
      sale_price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      unit TEXT DEFAULT 'unidad',
      image_url TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Tabla de Clientes
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      tax_id TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      total_spent REAL DEFAULT 0.00,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- Tabla de Ventas (Encabezado)
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      client_id INTEGER,
      invoice_number TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'credit'
      subtotal REAL NOT NULL,
      tax_amount REAL DEFAULT 0.00,
      discount_amount REAL DEFAULT 0.00,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL,
      change_returned REAL DEFAULT 0.00,
      notes TEXT,
      status TEXT DEFAULT 'completed', -- 'completed', 'cancelled'
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    -- Tabla de Items de Venta (Detalle)
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL DEFAULT 0.00,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Historial de Movimientos de Inventario
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      type TEXT NOT NULL, -- 'sale', 'adjustment', 'purchase', 'cancel_sale'
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reference TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Índices para aislamiento y velocidad multi-tenant
    CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
    CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
    CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);
  `);
}

initDatabase();

module.exports = db;
