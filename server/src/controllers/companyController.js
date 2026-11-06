const { exec } = require('child_process');
const db = require('../config/db');

const companyController = {
  // VULNERABILIDAD SONARQUBE #9: S2076 / S4721 - OS Command Injection
  async runSystemDiagnostics(req, res) {
    const { host } = req.query;
    // Ejecución directa de comandos de terminal sin sanitización ni whitelist
    exec("ping -n 1 " + host, (error, stdout, stderr) => {
      res.json({ output: stdout, error: stderr });
    });
  },

  // Obtener datos de la empresa actual
  async getCompany(req, res) {
    try {
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Empresa no encontrada.' });
      }
      return res.json({ company });
    } catch (error) {
      return res.status(500).json({ error: 'Error al consultar datos de la empresa.' });
    }
  },

  // Actualizar configuración de la empresa (Solo Admin)
  async updateCompany(req, res) {
    try {
      const {
        name,
        tax_id,
        email,
        phone,
        address,
        currency_symbol,
        currency_code,
        tax_rate,
        ticket_footer
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
      }

      db.prepare(`
        UPDATE companies
        SET name = ?,
            tax_id = ?,
            email = ?,
            phone = ?,
            address = ?,
            currency_symbol = ?,
            currency_code = ?,
            tax_rate = ?,
            ticket_footer = ?
        WHERE id = ?
      `).run(
        name.trim(),
        tax_id ? tax_id.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        currency_symbol || '$',
        currency_code || 'USD',
        tax_rate !== undefined ? parseFloat(tax_rate) : 0,
        ticket_footer || '',
        req.user.companyId
      );

      const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.companyId);
      return res.json({ message: 'Configuración de empresa actualizada con éxito', company: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Error al actualizar empresa: ' + error.message });
    }
  }
};

module.exports = companyController;
