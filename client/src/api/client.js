const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Si la sesión expiró o es inválida
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Error en la petición (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Autenticación y Empresas
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    me: () => request('/auth/me'),
    getDemoCompanies: () => request('/auth/companies')
  },

  // Configuración de la Empresa
  company: {
    get: () => request('/companies'),
    update: (payload) => request('/companies', { method: 'PUT', body: JSON.stringify(payload) })
  },

  // Gestión de Usuarios/Vendedores
  users: {
    getAll: () => request('/users'),
    create: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' })
  },

  // Catálogo de Productos y Categorías
  products: {
    getAll: (params = '') => request(`/products${params}`),
    getById: (id) => request(`/products/detail/${id}`),
    create: (payload) => request('/products', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    adjustStock: (id, payload) => request(`/products/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify(payload) }),
    getCategories: () => request('/products/categories/all'),
    createCategory: (payload) => request('/products/categories', { method: 'POST', body: JSON.stringify(payload) }),
    deleteCategory: (id) => request(`/products/categories/${id}`, { method: 'DELETE' })
  },

  // Clientes
  clients: {
    getAll: (params = '') => request(`/clients${params}`),
    create: (payload) => request('/clients', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: (id) => request(`/clients/${id}`, { method: 'DELETE' })
  },

  // Ventas y Punto de Venta
  sales: {
    create: (payload) => request('/sales', { method: 'POST', body: JSON.stringify(payload) }),
    getAll: (params = '') => request(`/sales${params}`),
    getById: (id) => request(`/sales/${id}`),
    cancel: (id, payload) => request(`/sales/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) })
  },

  // Dashboard & Métricas
  dashboard: {
    getMetrics: () => request('/dashboard/metrics')
  }
};
