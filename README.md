# OmniVentas SaaS - Gestión de Ventas Multi-Empresa

Plataforma SaaS profesional para la gestión de ventas, facturación, control de inventarios y punto de venta (POS) multi-tenant desarrollada con **Node.js**, **React**, **Tailwind CSS**, base de datos relacional **SQLite** y autenticación segura con **JWT**.

---

## 🚀 Características Principales

### 🏢 Arquitectura Multi-Empresa (Multi-Tenant)
- **Registro de múltiples empresas** en la base de datos SQLite con aislamiento estricto por `company_id`.
- Cada empresa gestiona de forma totalmente independiente:
  - Catálogo de productos e inventarios.
  - Clientes y directiva comercial.
  - Equipo de vendedores y supervisores.
  - Configuración monetaria personalizada (`$`, `€`, `S/`, etc.) e impuestos (`IVA %`).
  - Personalización de comprobantes / tickets térmicos.
- Conmutador rápido de empresas integrado en la interfaz.

### 🛡️ Autenticación y Seguridad con JWT
- Tokens **JSON Web Token (JWT)** firmados criptográficamente.
- Contraseñas cifradas con algoritmos **bcrypt**.
- Contexto de tenant incrustado en el payload (`userId`, `companyId`, `role`).
- Control de acceso basado en roles (**RBAC**): `admin`, `vendedor`, `supervisor`.
- Middleware de protección contra acceso cruzado entre empresas.

### 💳 Punto de Venta (POS) en Tiempo Real
- Búsqueda instantánea de productos por nombre, SKU o código de barras.
- Filtro interactivo por categorías.
- Carrito de compras reactivo con control de existencias en tiempo real.
- Métodos de pago múltiples: **Efectivo**, **Tarjeta**, **Transferencia** y **Crédito**.
- Calculadora de cambio / vuelto integrada.
- Descuentos dinámicos e impuestos automáticos.
- Emisión inmediata de **Comprobante / Ticket Térmico** listo para imprimir (`window.print`).

### 📦 Gestión de Inventario & Alertas de Stock
- Control de stock con alertas visuales de **Stock Bajo** (`stock <= min_stock`) y **Agotado**.
- Ajustes rápidos de inventario manual con registro de auditoría en `stock_movements`.
- Cálculo automático de márgenes de ganancia por producto.

### 📊 Dashboard Analítico & Reportes
- KPIs clave: Ventas del día, facturación del mes, transacciones cerradas.
- Gráficos interactivos de ingresos de los últimos 7 días.
- Distribución de ventas por método de pago.
- Top 5 productos más vendidos.
- Historial completo de ventas con opción de anulación y restitución de stock automática.
- Exportación del historial de facturación a formato **CSV**.

---

## 🔑 Credenciales de Acceso Demo

La base de datos SQLite incluye dos empresas de ejemplo precargadas para evaluación inmediata:

### 1. Empresa: TechNova Solutions ($ USD - Tienda de Tecnología)
- **Administrador**:
  - Correo: `admin@technova.com`
  - Contraseña: `admin123`
- **Vendedor**:
  - Correo: `vendedor@technova.com`
  - Contraseña: `vendedor123`

### 2. Empresa: Café & Delicias Gourmet (€ EUR - Cafetería de Especialidad)
- **Administrador**:
  - Correo: `admin@cafedelicias.com`
  - Contraseña: `admin123`
- **Vendedora**:
  - Correo: `lucia@cafedelicias.com`
  - Contraseña: `vendedor123`

> 💡 *En la pantalla de inicio de sesión tienes botones de **1-Click Demo** para ingresar al instante con cualquiera de estos roles.*

---

## 🛠️ Instalación y Ejecución

### Opción A: Modo Producción (Servidor y Cliente Unificado en 1 solo puerto)

El frontend de React ya se encuentra compilado en `client/dist`. El servidor Express sirve automáticamente tanto las rutas de API como la aplicación web:

```bash
# Iniciar la plataforma en http://localhost:5000
npm start
```

Abre en tu navegador: **http://localhost:5000**

---

### Opción B: Modo Desarrollo

Para trabajar en el código con recarga en vivo (HMR):

1. **Iniciar el Backend (API Express):**
   ```bash
   cd server
   npm run dev
   # Corriendo en http://localhost:5000
   ```

2. **Iniciar el Frontend (Vite + React + Tailwind):**
   ```bash
   cd client
   npm run dev
   # Corriendo en http://localhost:5173 (con proxy hacia el puerto 5000)
   ```

---

## 🗄️ Esquema de Base de Datos SQLite

La base de datos se almacena en el archivo local `server/data/ventas_saas.sqlite`:

- `companies`: Datos de la empresa (nombre, slug, RFC/NIF, moneda, tasa de impuesto, pie de ticket).
- `users`: Usuarios por empresa con hash bcrypt y roles.
- `categories`: Clasificación de productos.
- `products`: Catálogo con SKU, código de barras, precios y stock.
- `clients`: Clientes registrados y saldo acumulado.
- `sales`: Encabezado de ventas con consecutivo de factura único, totales y método de pago.
- `sale_items`: Detalle de productos vendidos y precios históricos.
- `stock_movements`: Registro de auditoría de entradas, salidas y devoluciones.
