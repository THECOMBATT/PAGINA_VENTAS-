const bcrypt = require('bcryptjs');
const db = require('../config/db');

const userController = {
  // Listar usuarios de la empresa actual
  async getUsers(req, res) {
    try {
      const users = db.prepare(`
        SELECT id, company_id, name, email, role, status, created_at,
               (SELECT COUNT(*) FROM sales WHERE user_id = users.id) as sales_count
        FROM users
        WHERE company_id = ?
        ORDER BY created_at DESC
      `).all(req.user.companyId);

      return res.json({ users });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener usuarios: ' + error.message });
    }
  },

  // Crear nuevo colaborador/usuario en la empresa
  async createUser(req, res) {
    try {
      const { name, email, password, role = 'vendedor' } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos.' });
      }

      // Validar si el email ya existe en esta empresa
      const existing = db.prepare('SELECT id FROM users WHERE company_id = ? AND LOWER(email) = LOWER(?)')
        .get(req.user.companyId, email.trim());

      if (existing) {
        return res.status(400).json({ error: 'Ya existe un usuario con este correo en la empresa.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      const result = db.prepare(`
        INSERT INTO users (company_id, name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.companyId, name.trim(), email.trim(), passwordHash, role);

      const newUser = db.prepare('SELECT id, company_id, name, email, role, status, created_at FROM users WHERE id = ?')
        .get(result.lastInsertRowid);

      return res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
    } catch (error) {
      return res.status(500).json({ error: 'Error al crear usuario: ' + error.message });
    }
  },

  // Actualizar usuario
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, role, status, password } = req.body;

      // Verificar que el usuario pertenezca a la empresa
      const user = db.prepare('SELECT id, role FROM users WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      let query = 'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), status = COALESCE(?, status)';
      let params = [name ? name.trim() : null, role || null, status || null];

      if (password && password.trim()) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password.trim(), salt);
        query += ', password_hash = ?';
        params.push(hash);
      }

      query += ' WHERE id = ? AND company_id = ?';
      params.push(id, req.user.companyId);

      db.prepare(query).run(...params);

      const updated = db.prepare('SELECT id, company_id, name, email, role, status, created_at FROM users WHERE id = ?').get(id);
      return res.json({ message: 'Usuario actualizado con éxito', user: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Error al actualizar usuario: ' + error.message });
    }
  },

  // Eliminar o desactivar usuario
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de usuario en sesión.' });
      }

      const user = db.prepare('SELECT id FROM users WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      // Desactivar o eliminar
      db.prepare('DELETE FROM users WHERE id = ? AND company_id = ?').run(id, req.user.companyId);

      return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      return res.status(500).json({ error: 'Error al eliminar usuario: ' + error.message });
    }
  }
};

module.exports = userController;
