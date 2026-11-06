const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('--- Iniciando Sembrado de Base de Datos Multi-empresa (SaaS) ---');

  // Comprobar si ya existen empresas
  const existingCompanies = db.prepare('SELECT count(*) as count FROM companies').get();
  if (existingCompanies && existingCompanies.count > 0) {
    console.log('La base de datos ya contiene registros. Omitiendo sembrado duplicado.');
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const sellerPasswordHash = bcrypt.hashSync('vendedor123', salt);

  // 1. EMPRESA 1: TechNova Solutions
  const insertCompany = db.prepare(`
    INSERT INTO companies (name, slug, tax_id, email, phone, address, currency_symbol, currency_code, tax_rate, ticket_footer)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resComp1 = insertCompany.run(
    'TechNova Solutions',
    'technova-solutions',
    'RFC-TNS240501',
    'contacto@technova.com',
    '+1 (555) 234-5678',
    'Av. Tecnológica 1024, Edificio Quantum, Piso 4',
    '$',
    'USD',
    16.0,
    '¡Gracias por confiar en TechNova! Garantía de 12 meses en todos los equipos.'
  );
  const comp1Id = Number(resComp1.lastInsertRowid);

  // Usuarios Empresa 1
  const insertUser = db.prepare(`
    INSERT INTO users (company_id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  const user1Admin = insertUser.run(comp1Id, 'Alex Mercer (Admin TechNova)', 'admin@technova.com', adminPasswordHash, 'admin');
  const user1Seller = insertUser.run(comp1Id, 'Carlos Ramos (Ventas)', 'vendedor@technova.com', sellerPasswordHash, 'vendedor');

  const admin1Id = Number(user1Admin.lastInsertRowid);
  const seller1Id = Number(user1Seller.lastInsertRowid);

  // Categorías Empresa 1
  const insertCat = db.prepare('INSERT INTO categories (company_id, name, color) VALUES (?, ?, ?)');
  const cat1Laptops = Number(insertCat.run(comp1Id, 'Laptops & Computadoras', '#3b82f6').lastInsertRowid);
  const cat1Acc = Number(insertCat.run(comp1Id, 'Accesorios & Periféricos', '#10b981').lastInsertRowid);
  const cat1Audio = Number(insertCat.run(comp1Id, 'Audio & Video Pro', '#8b5cf6').lastInsertRowid);
  const cat1Redes = Number(insertCat.run(comp1Id, 'Redes & Conectividad', '#f59e0b').lastInsertRowid);

  // Productos Empresa 1
  const insertProd = db.prepare(`
    INSERT INTO products (company_id, category_id, sku, barcode, name, description, cost_price, sale_price, stock, min_stock, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const p1 = Number(insertProd.run(comp1Id, cat1Laptops, 'LAP-M2-01', '7501001001', 'MacBook Air M2 13.6" 256GB', 'Chip M2, 8GB RAM unificada, SSD 256GB, Gris Espacial', 850.00, 1099.00, 12, 3, 'unidad').lastInsertRowid);
  const p2 = Number(insertProd.run(comp1Id, cat1Laptops, 'LAP-DL-02', '7501001002', 'Dell XPS 15 OLED i7 1TB', 'Intel Core i7 13va gen, 32GB RAM, 1TB NVMe, RTX 4060', 1400.00, 1850.00, 8, 2, 'unidad').lastInsertRowid);
  const p3 = Number(insertProd.run(comp1Id, cat1Acc, 'MOU-LOG-03', '7501001003', 'Mouse Logitech MX Master 3S', 'Sensor Darkfield 8000 DPI, Clics silenciosos, Bluetooth/USB', 65.00, 99.99, 25, 5, 'unidad').lastInsertRowid);
  const p4 = Number(insertProd.run(comp1Id, cat1Acc, 'KEY-RGB-04', '7501001004', 'Teclado Mecánico Keychron K2 Pro', 'Switches Red intercambiables, Bluetooth 5.1 y cable USB-C', 70.00, 115.00, 18, 4, 'unidad').lastInsertRowid);
  const p5 = Number(insertProd.run(comp1Id, cat1Audio, 'AUD-SNY-05', '7501001005', 'Audífonos Sony WH-1000XM5 ANC', 'Cancelación de ruido líder en la industria, 30h de batería', 240.00, 349.00, 15, 3, 'unidad').lastInsertRowid);
  const p6 = Number(insertProd.run(comp1Id, cat1Audio, 'MIC-SHU-06', '7501001006', 'Micrófono Shure MV7X Podcasting', 'Conexión XLR para transmisiones y podcasting profesional', 120.00, 179.00, 4, 5, 'unidad').lastInsertRowid); // En bajo stock
  const p7 = Number(insertProd.run(comp1Id, cat1Redes, 'ROU-WIF-07', '7501001007', 'Router TP-Link WiFi 6 AX3000', 'Velocidades de hasta 3 Gbps, soporte EasyMesh y 4 antenas', 55.00, 89.90, 2, 5, 'unidad').lastInsertRowid); // Alerta stock

  // Clientes Empresa 1
  const insertClient = db.prepare(`
    INSERT INTO clients (company_id, name, tax_id, email, phone, address, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const c1 = Number(insertClient.run(comp1Id, 'Corporativo Nexus Digital S.A.', 'RUC 20601234567', 'compras@nexusdigital.com', '+1 555-901-2233', 'Paseo de la Reforma 405', 'Cliente corporativo con crédito 30 días').lastInsertRowid);
  const c2 = Number(insertClient.run(comp1Id, 'Dra. Mariana Valenzuela', 'CURP VAM881020', 'mariana.val@gmail.com', '+1 555-882-9911', 'Av. Las Palmas 55, Depto 302', 'Particular, prefiere pagar con tarjeta').lastInsertRowid);
  const c3 = Number(insertClient.run(comp1Id, 'Estudio Creativo Alpha', 'RFC ECA190415', 'hola@alphacreative.io', '+1 555-332-1144', 'Calle Berlín 89, Col. Juárez', 'Comprador frecuente de periféricos').lastInsertRowid);

  // Registrar ventas iniciales Empresa 1
  const insertSale = db.prepare(`
    INSERT INTO sales (company_id, user_id, client_id, invoice_number, payment_method, subtotal, tax_amount, discount_amount, total, amount_paid, change_returned, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
  `);
  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost_price, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (company_id, product_id, user_id, type, quantity, previous_stock, new_stock, reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Venta 1 TechNova
  const sale1 = insertSale.run(comp1Id, seller1Id, c1, 'TN-2026-0001', 'transfer', 2348.00, 375.68, 100.00, 2623.68, 2623.68, 0.00, 'Equipamiento sala de diseño', 'completed');
  const sale1Id = Number(sale1.lastInsertRowid);
  insertSaleItem.run(sale1Id, p1, 'MacBook Air M2 13.6" 256GB', 2, 1099.00, 850.00, 2198.00);
  insertSaleItem.run(sale1Id, p4, 'Teclado Mecánico Keychron K2 Pro', 1, 150.00, 70.00, 150.00);
  insertMovement.run(comp1Id, p1, seller1Id, 'sale', -2, 14, 12, 'TN-2026-0001');

  // Venta 2 TechNova (Hoy)
  const insertSaleToday = db.prepare(`
    INSERT INTO sales (company_id, user_id, client_id, invoice_number, payment_method, subtotal, tax_amount, discount_amount, total, amount_paid, change_returned, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  const sale2 = insertSaleToday.run(comp1Id, admin1Id, c2, 'TN-2026-0002', 'card', 448.99, 71.84, 0.00, 520.83, 520.83, 0.00, 'Entrega inmediata en tienda', 'completed');
  const sale2Id = Number(sale2.lastInsertRowid);
  insertSaleItem.run(sale2Id, p5, 'Audífonos Sony WH-1000XM5 ANC', 1, 349.00, 240.00, 349.00);
  insertSaleItem.run(sale2Id, p3, 'Mouse Logitech MX Master 3S', 1, 99.99, 65.00, 99.99);


  // 2. EMPRESA 2: Café & Delicias Gourmet
  const resComp2 = insertCompany.run(
    'Café & Delicias Gourmet',
    'cafe-delicias-gourmet',
    'NIF-B98127364',
    'hola@cafedelicias.es',
    '+34 912 345 678',
    'Calle Mayor 45, Barrio de las Letras, Madrid',
    '€',
    'EUR',
    10.0,
    '¡Esperamos que disfrutes tu café de especialidad! Vuelve pronto.'
  );
  const comp2Id = Number(resComp2.lastInsertRowid);

  // Usuarios Empresa 2
  const user2Admin = insertUser.run(comp2Id, 'Valentina Rossi (Directora Café)', 'admin@cafedelicias.com', adminPasswordHash, 'admin');
  const user2Seller = insertUser.run(comp2Id, 'Lucía Serrano (Barista)', 'lucia@cafedelicias.com', sellerPasswordHash, 'vendedor');

  const admin2Id = Number(user2Admin.lastInsertRowid);
  const seller2Id = Number(user2Seller.lastInsertRowid);

  // Categorías Empresa 2
  const cat2Bebidas = Number(insertCat.run(comp2Id, 'Café de Especialidad & Bebidas', '#78350f').lastInsertRowid);
  const cat2Pan = Number(insertCat.run(comp2Id, 'Panadería & Pastelería Francesa', '#d97706').lastInsertRowid);
  const cat2Granos = Number(insertCat.run(comp2Id, 'Café en Grano & Métodos', '#059669').lastInsertRowid);

  // Productos Empresa 2
  const p2_1 = Number(insertProd.run(comp2Id, cat2Bebidas, 'CAF-ESP-01', '8401001001', 'Espresso Doble Etíope Yirgacheffe', 'Notas florales de jazmín y bergamota con acidez brillante', 0.60, 3.20, 150, 20, 'unidad').lastInsertRowid);
  const p2_2 = Number(insertProd.run(comp2Id, cat2Bebidas, 'CAF-FLAT-02', '8401001002', 'Flat White con Leche de Avena', 'Doble ristretto con leche vegetal texturizada sedosa', 0.85, 4.10, 120, 15, 'unidad').lastInsertRowid);
  const p2_3 = Number(insertProd.run(comp2Id, cat2Pan, 'PAN-CRO-03', '8401001003', 'Croissant Artesanal de Mantequilla', 'Hojaldre 100% mantequilla DOP normanda fermentado 24h', 0.70, 2.80, 45, 10, 'unidad').lastInsertRowid);
  const p2_4 = Number(insertProd.run(comp2Id, cat2Pan, 'PAN-TAR-04', '8401001004', 'Tarta de Pistacho y Frambuesas', 'Base sablée, crema de pistacho de Bronte y frambuesas frescas', 1.80, 5.50, 14, 5, 'unidad').lastInsertRowid);
  const p2_5 = Number(insertProd.run(comp2Id, cat2Granos, 'GRA-GEI-05', '8401001005', 'Café Panamá Geisha Boquete 250g', 'Lote de altura premium proceso lavado, tueste omni para filtro', 14.00, 28.00, 8, 3, 'unidad').lastInsertRowid);

  // Clientes Empresa 2
  const c2_1 = Number(insertClient.run(comp2Id, 'Agencia de Publicidad Bloom', 'CIF B87654321', 'eventos@agenciabloom.es', '+34 911 223 344', 'Calle Fuencarral 120, Planta 2', 'Pedidos semanales de catering para reuniones').lastInsertRowid);
  const c2_2 = Number(insertClient.run(comp2Id, 'David Hernández', '', 'david.hdez@outlook.es', '+34 600 112 233', 'Gran Vía 14', 'Cliente habitual matutino').lastInsertRowid);

  // Venta Empresa 2
  const saleComp2 = insertSaleToday.run(comp2Id, seller2Id, c2_1, 'CDG-2026-0001', 'cash', 43.60, 4.36, 0.00, 47.96, 50.00, 2.04, 'Desayuno corporativo para equipo creativo', 'completed');
  const saleComp2Id = Number(saleComp2.lastInsertRowid);
  insertSaleItem.run(saleComp2Id, p2_2, 'Flat White con Leche de Avena', 4, 4.10, 0.85, 16.40);
  insertSaleItem.run(saleComp2Id, p2_3, 'Croissant Artesanal de Mantequilla', 6, 2.80, 0.70, 16.80);
  insertSaleItem.run(saleComp2Id, p2_4, 'Tarta de Pistacho y Frambuesas', 2, 5.50, 1.80, 11.00);

  console.log('✅ Base de datos sembrada con éxito:');
  console.log(' - Empresa 1: TechNova Solutions ($)');
  console.log('   Admin: admin@technova.com / admin123');
  console.log('   Vendedor: vendedor@technova.com / vendedor123');
  console.log(' - Empresa 2: Café & Delicias Gourmet (€)');
  console.log('   Admin: admin@cafedelicias.com / admin123');
  console.log('   Vendedor: lucia@cafedelicias.com / vendedor123');
}

seed().catch(err => {
  console.error('Error sembrando base de datos:', err);
});
