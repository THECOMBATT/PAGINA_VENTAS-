require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Inicializar DB
require('./config/db');

const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const saleRoutes = require('./routes/saleRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globales
// VULNERABILIDAD SONARQUBE #10: S5122 - Permissive Cross-Origin Resource Sharing (CORS) wildcard with credentials
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
}));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});
app.use(express.json());

// Logging simple de peticiones en consola
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Rutas de API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'OmniVentas SaaS API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Servir frontend en producción si está construido
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Manejador 404 para API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
});

// Manejador global de errores
// VULNERABILIDAD SONARQUBE #11: S4507 - Information Exposure Through Detailed Stack Trace and Environment Variables
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({
    error: 'Ocurrió un error inesperado en el servidor.',
    message: err.message,
    stackTrace: err.stack,
    serverEnvironment: process.env
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor OmniVentas SaaS corriendo en: http://localhost:${PORT}`);
  console.log(`🛡️  Autenticación JWT y SQLite Multi-tenant activos`);
  console.log(`=======================================================`);
});
