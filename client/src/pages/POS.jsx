import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Send,
  CheckCircle,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  UserPlus,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';

export default function POS() {
  const { company, formatMoney } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Estado del Carrito
  const [cart, setCart] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Modales
  const [completedSale, setCompletedSale] = useState(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTaxId, setNewClientTaxId] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar datos
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, clientRes] = await Promise.all([
        api.products.getAll(),
        api.products.getCategories(),
        api.clients.getAll()
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setClients(clientRes.clients || []);

      // Auto-seleccionar Consumidor Final si existe
      const finalConsumer = (clientRes.clients || []).find(c => c.name.toLowerCase().includes('consumidor'));
      if (finalConsumer) {
        setSelectedClientId(String(finalConsumer.id));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Agregar al Carrito
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert(`No hay existencias de "${product.name}".`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`No puedes agregar más unidades de "${product.name}". Stock disponible: ${product.stock}`);
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        unit_price: product.sale_price,
        quantity: 1,
        maxStock: product.stock,
        subtotal: product.sale_price,
        sku: product.sku
      }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.maxStock) {
            alert(`Stock máximo alcanzado (${item.maxStock})`);
            return item;
          }
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.unit_price
          };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setAmountPaid('');
    setNotes('');
  };

  // Cálculos
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const discountVal = parseFloat(discount) || 0;
  const taxableBase = Math.max(0, subtotal - discountVal);
  const taxRate = parseFloat(company?.tax_rate) || 0;
  const taxAmount = (taxableBase * taxRate) / 100;
  const total = taxableBase + taxAmount;

  const paidAmountVal = amountPaid === '' ? total : parseFloat(amountPaid) || 0;
  const changeReturned = Math.max(0, paidAmountVal - total);

  // Procesar Venta
  const handleProcessSale = async () => {
    if (cart.length === 0) {
      alert('Agrega al menos un producto al carrito');
      return;
    }

    if (paymentMethod === 'cash' && paidAmountVal < total) {
      alert(`El importe recibido (${formatMoney(paidAmountVal)}) no puede ser menor al total (${formatMoney(total)}).`);
      return;
    }

    setSubmittingSale(true);
    setErrorMsg('');

    try {
      const payload = {
        client_id: selectedClientId ? parseInt(selectedClientId) : null,
        items: cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price
        })),
        payment_method: paymentMethod,
        amount_paid: paidAmountVal,
        discount_amount: discountVal,
        notes
      };

      const res = await api.sales.create(payload);
      setCompletedSale(res.sale);
      clearCart();
      // Recargar catálogo para refrescar existencias
      loadInitialData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingSale(false);
    }
  };

  // Registrar cliente rápido desde POS
  const handleQuickAddClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const res = await api.clients.create({
        name: newClientName.trim(),
        tax_id: newClientTaxId.trim()
      });
      setClients(prev => [...prev, res.client]);
      setSelectedClientId(String(res.client.id));
      setShowNewClientModal(false);
      setNewClientName('');
      setNewClientTaxId('');
    } catch (err) {
      alert('Error al registrar cliente: ' + err.message);
    }
  };

  // Filtro de productos
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesSearch = search
      ? p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      : true;
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7.5rem)]">
      {/* Columna Izquierda: Catálogo y Búsqueda */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Barra de Búsqueda y Filtros */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre, código de barra o SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCategory === null
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cuadrícula de Productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs font-semibold">
              Cargando catálogo...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No se encontraron productos coincidentes</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock <= prod.min_stock;
                return (
                  <button
                    key={prod.id}
                    onClick={() => !isOutOfStock && addToCart(prod)}
                    disabled={isOutOfStock}
                    className={`text-left p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between group ${
                      isOutOfStock
                        ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200/80 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: prod.category_color || '#4f46e5' }}
                        >
                          {prod.category_name || 'General'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-600'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {isOutOfStock ? 'Agotado' : `Stock: ${prod.stock}`}
                        </span>
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 line-clamp-2">
                        {prod.name}
                      </h3>
                      {/* VULNERABILIDAD SONARQUBE #12: S5131 / S6096 - Cross-Site Scripting (XSS) via dangerouslySetInnerHTML */}
                      {prod.description && (
                        <div
                          className="text-[10px] text-slate-500 line-clamp-1 mt-0.5"
                          dangerouslySetInnerHTML={{ __html: prod.description }}
                        />
                      )}
                      {prod.sku && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.sku}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatMoney(prod.sale_price)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Carrito y Cobro */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
        {/* Cabecera Carrito */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">
              Carrito de Venta ({cart.reduce((a, b) => a + b.quantity, 0)})
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 transition"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Selección de Cliente */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/30">
          <div className="flex items-center justify-between mb-1 text-[11px] text-slate-500 font-semibold">
            <span>Cliente Facturación</span>
            <button
              onClick={() => setShowNewClientModal(true)}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold text-[10px]"
            >
              <UserPlus className="w-3 h-3" />
              Nuevo
            </button>
          </div>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Consumidor Final (Venta sin registrar)</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.tax_id ? `(${c.tax_id})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Items en Carrito */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <ShoppingCart className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs font-semibold">Carrito vacío</p>
              <p className="text-[10px] text-slate-400">Haz clic en los productos para agregarlos</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex-1 pr-2">
                  <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {formatMoney(item.unit_price)} c/u
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1 hover:bg-slate-200 text-slate-600 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-bold text-slate-800 text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1 hover:bg-slate-200 text-slate-600 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-extrabold text-slate-900 min-w-[50px] text-right">
                    {formatMoney(item.subtotal)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel de Totales y Cobro */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          {/* Método de Pago */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'cash', label: 'Efectivo', icon: Banknote },
              { id: 'card', label: 'Tarjeta', icon: CreditCard },
              { id: 'transfer', label: 'Transf.', icon: Send },
              { id: 'credit', label: 'Crédito', icon: User }
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition ${
                    paymentMethod === m.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Descuento y Cálculo */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-700">{formatMoney(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>Descuento:</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">-</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-16 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between text-slate-500">
              <span>IVA / Impuesto ({taxRate}%):</span>
              <span className="font-semibold text-slate-700">{formatMoney(taxAmount)}</span>
            </div>

            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL:</span>
              <span className="text-lg text-indigo-600">{formatMoney(total)}</span>
            </div>

            {/* Calculadora de Vuelto para Efectivo */}
            {paymentMethod === 'cash' && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Importe Pagado:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <span>Cambio / Vuelto:</span>
                  <span>{formatMoney(changeReturned)}</span>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Botón Cobrar */}
          <button
            onClick={handleProcessSale}
            disabled={cart.length === 0 || submittingSale}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
          >
            {submittingSale ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Cobrar {formatMoney(total)}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Ticket Venta Completada */}
      {completedSale && (
        <TicketModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}

      {/* Modal Nuevo Cliente Rápido */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Registrar Nuevo Cliente</h3>
            <form onSubmit={handleQuickAddClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Identificación Fiscal (RFC/NIF)</label>
                <input
                  type="text"
                  value={newClientTaxId}
                  onChange={(e) => setNewClientTaxId(e.target.value)}
                  placeholder="Ej. 12345678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
