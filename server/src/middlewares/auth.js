const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'omniventas_super_secret_jwt_key_2026_secure';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar que el usuario exista y siga activo
    const user = db.prepare('SELECT id, company_id, name, email, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Usuario no válido o cuenta inactiva.' });
    }

    // Verificar que la empresa pertenezca y siga activa
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(user.company_id);
    if (!company || company.status !== 'active') {
      return res.status(403).json({ error: 'La empresa asociada está inactiva o suspendida.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    };
    req.company = company;

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.', details: err.message });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso restringido. Se requiere uno de los siguientes roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
