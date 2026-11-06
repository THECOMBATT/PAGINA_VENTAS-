const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const authController = {
  // Iniciar Sesión (Soporta inicio por correo y contraseña)
  async login(req, res) {
    try {
      const { email, password, companySlug } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
      }

      // Si se especifica el slug de la empresa, filtramos específicamente
      let userQuery = `
        SELECT u.id, u.company_id, u.name, u.email, u.password_hash, u.role, u.status,
               c.name as company_name, c.slug as company_slug, c.status as company_status,
               c.currency_symbol, c.currency_code, c.tax_rate
        FROM users u
        JOIN companies c ON u.company_id = c.id
        WHERE LOWER(u.email) = LOWER(?)
      `;
      let params = [email.trim()];

      if (companySlug) {
        userQuery += ' AND c.slug = ?';
        params.push(companySlug.trim());
      }

      const user = db.prepare(userQuery).get(...params);

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas. Usuario no encontrado.' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Tu cuenta de usuario se encuentra inactiva o bloqueada.' });
      }

      if (user.company_status !== 'active') {
        return res.status(403).json({ error: 'La empresa asociada está inactiva o suspendida.' });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
      }

      // Generar JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          companySlug: user.company_slug
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Obtener datos completos de la empresa
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(user.company_id);

      return res.json({
        message: 'Inicio de sesión exitoso',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.company_id
        },
        company
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ error: 'Error interno del servidor al autenticar.' });
    }
  },

  // Registrar una Nueva Empresa (SaaS Tenant Onboarding)
  async registerCompany(req, res) {
    try {
      const {
        companyName,
        taxId,
        companyEmail,
        companyPhone,
        address,
        currencySymbol = '$',
        currencyCode = 'USD',
        taxRate = 16.0,
        userName,
        userEmail,
        password
      } = req.body;

      if (!companyName || !userName || !userEmail || !password) {
        return res.status(400).json({
          error: 'Nombre de la empresa, nombre de usuario, correo y contraseña son obligatorios.'
        });
      }

      let slug = slugify(companyName);
      // Evitar colisión de slugs
      let existingSlug = db.prepare('SELECT id FROM companies WHERE slug = ?').get(slug);
      if (existingSlug) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // Crear Empresa
      const companyResult = db.prepare(`
        INSERT INTO companies (name, slug, tax_id, email, phone, address, currency_symbol, currency_code, tax_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        companyName.trim(),
        slug,
        taxId ? taxId.trim() : null,
        companyEmail ? companyEmail.trim() : userEmail.trim(),
        companyPhone ? companyPhone.trim() : null,
        address ? address.trim() : null,
        currencySymbol,
        currencyCode,
        parseFloat(taxRate) || 0
      );

      const companyId = Number(companyResult.lastInsertRowid);

      // Crear Usuario Administrador de la Empresa
      const userResult = db.prepare(`
        INSERT INTO users (company_id, name, email, password_hash, role)
        VALUES (?, ?, ?, ?, 'admin')
      `).run(companyId, userName.trim(), userEmail.trim(), passwordHash);

      const userId = Number(userResult.lastInsertRowid);

      // Categorías por defecto para la nueva empresa
      const insertCat = db.prepare('INSERT INTO categories (company_id, name, color) VALUES (?, ?, ?)');
      insertCat.run(companyId, 'General', '#4f46e5');
      insertCat.run(companyId, 'Servicios', '#10b981');
      insertCat.run(companyId, 'Productos Estrella', '#f59e0b');

      // Crear Cliente inicial "Consumidor Final"
      db.prepare(`
        INSERT INTO clients (company_id, name, tax_id, email, notes)
        VALUES (?, 'Consumidor Final', '00000000', 'general@mostrador.com', 'Ventas directas de mostrador')
      `).run(companyId);

      // Generar JWT
      const token = jwt.sign(
        {
          userId,
          email: userEmail.trim(),
          role: 'admin',
          companyId,
          companySlug: slug
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

      return res.status(201).json({
        message: '¡Empresa registrada exitosamente!',
        token,
        user: {
          id: userId,
          name: userName.trim(),
          email: userEmail.trim(),
          role: 'admin',
          companyId
        },
        company
      });
    } catch (error) {
      console.error('Error al registrar empresa:', error);
      return res.status(500).json({ error: 'Error al registrar la empresa: ' + error.message });
    }
  },

  // Perfil actual del usuario y su empresa
  async me(req, res) {
    try {
      const user = db.prepare('SELECT id, company_id, name, email, role, status FROM users WHERE id = ?').get(req.user.id);
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.companyId);

      return res.json({ user, company });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener sesión actual.' });
    }
  },

  // Listar empresas registradas (para demostración y acceso rápido en la plataforma)
  async listDemoCompanies(req, res) {
    try {
      const companies = db.prepare(`
        SELECT c.id, c.name, c.slug, c.currency_symbol, c.currency_code, c.tax_rate,
               (SELECT COUNT(*) FROM products WHERE company_id = c.id) as product_count,
               (SELECT COUNT(*) FROM sales WHERE company_id = c.id) as sales_count,
               (SELECT email FROM users WHERE company_id = c.id AND role = 'admin' LIMIT 1) as admin_email
        FROM companies c
        WHERE c.status = 'active'
        ORDER BY c.id ASC
      `).all();

      return res.json({ companies });
    } catch (error) {
      return res.status(500).json({ error: 'Error al listar empresas demo.' });
    }
  }
};

module.exports = authController;
