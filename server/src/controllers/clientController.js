const db = require('../config/db');

const clientController = {
  async getClients(req, res) {
    try {
      const { search } = req.query;
      let query = `
        SELECT c.*,
               (SELECT COUNT(*) FROM sales WHERE client_id = c.id AND status = 'completed') as sales_count,
               (SELECT COALESCE(SUM(total), 0) FROM sales WHERE client_id = c.id AND status = 'completed') as total_purchased
        FROM clients c
        WHERE c.company_id = ?
      `;
      let params = [req.user.companyId];

      if (search) {
        query += ' AND (c.name LIKE ? OR c.tax_id LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term, term, term);
      }

      query += ' ORDER BY c.name ASC';

      const clients = db.prepare(query).all(...params);
      return res.json({ clients });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener clientes: ' + error.message });
    }
  },

  async createClient(req, res) {
    try {
      const { name, tax_id, email, phone, address, notes } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
      }

      const result = db.prepare(`
        INSERT INTO clients (company_id, name, tax_id, email, phone, address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.companyId,
        name.trim(),
        tax_id ? tax_id.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        notes ? notes.trim() : null
      );

      const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json({ message: 'Cliente registrado exitosamente', client: newClient });
    } catch (error) {
      return res.status(500).json({ error: 'Error al registrar cliente: ' + error.message });
    }
  },

  async updateClient(req, res) {
    try {
      const { id } = req.params;
      const { name, tax_id, email, phone, address, notes } = req.body;

      const client = db.prepare('SELECT id FROM clients WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado.' });
      }

      db.prepare(`
        UPDATE clients
        SET name = ?,
            tax_id = ?,
            email = ?,
            phone = ?,
            address = ?,
            notes = ?
        WHERE id = ? AND company_id = ?
      `).run(
        name ? name.trim() : 'Cliente sin nombre',
        tax_id ? tax_id.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        notes ? notes.trim() : null,
        id,
        req.user.companyId
      );

      const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      return res.json({ message: 'Cliente actualizado con éxito', client: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Error al actualizar cliente: ' + error.message });
    }
  },

  async deleteClient(req, res) {
    try {
      const { id } = req.params;
      const client = db.prepare('SELECT id FROM clients WHERE id = ? AND company_id = ?').get(id, req.user.companyId);
      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado.' });
      }

      db.prepare('DELETE FROM clients WHERE id = ? AND company_id = ?').run(id, req.user.companyId);
      return res.json({ message: 'Cliente eliminado' });
    } catch (error) {
      return res.status(500).json({ error: 'Error al eliminar cliente: ' + error.message });
    }
  }
};

module.exports = clientController;
