import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  Calendar,
  CreditCard,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';

export default function Dashboard({ setCurrentTab }) {
  const { company, formatMoney } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const data = await api.dashboard.getMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const handleViewReceipt = async (saleId) => {
    try {
      const res = await api.sales.getById(saleId);
      setSelectedSale(res.sale);
    } catch (err) {
      alert('Error al cargar comprobante: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Cargando métricas de {company?.name}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
        Error al cargar métricas: {error}
      </div>
    );
  }

  // Máximo para el gráfico de barras de los últimos 7 días
  const maxTrend = Math.max(...(metrics.salesTrend?.map(d => d.total) || [1]), 100);

  return (
    <div className="space-y-6">
      {/* Alerta de Stock Bajo si existe */}
      {metrics.lowStockCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Atención: Hay {metrics.lowStockCount} producto(s) con inventario bajo o agotado
              </p>
              <p className="text-[11px] text-amber-700">
                Revisa los niveles de stock para evitar desabastecimiento en ventas.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('products')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition"
          >
            Ver Productos
          </button>
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ventas de Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatMoney(metrics.today?.total)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{metrics.today?.count || 0} operaciones cerradas hoy</span>
          </div>
        </div>

        {/* Ventas del Mes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ventas del Mes</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatMoney(metrics.month?.total)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{metrics.month?.count || 0} facturas este mes</span>
          </div>
        </div>

        {/* Productos Activos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Catálogo de Productos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {metrics.productsCount}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className={`font-semibold ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {metrics.lowStockCount} alertas de stock
            </span>
          </div>
        </div>

        {/* Clientes Registrados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Clientes Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {metrics.clientsCount}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className="text-purple-600 font-semibold">Directorio de empresa</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Ventas (7 Días) y Métodos de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 7 Días */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tendencia de Ingresos (Últimos 7 Días)</h2>
              <p className="text-xs text-slate-400">Total facturado por día en {company?.name}</p>
            </div>
            <button
              onClick={() => setCurrentTab('pos')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl transition"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Nueva Venta
            </button>
          </div>

          <div className="h-48 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {metrics.salesTrend?.map((item, idx) => {
              const heightPercent = Math.max(8, Math.round((item.total / maxTrend) * 100));
              const dayLabel = new Date(item.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {formatMoney(item.total)}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      item.total > 0
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300 shadow-sm'
                        : 'bg-slate-100'
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Métodos de Cobro</h2>
            <p className="text-xs text-slate-400 mb-5">Distribución acumulada de ventas</p>

            <div className="space-y-4">
              {metrics.paymentStats?.map((p, idx) => {
                const names = {
                  cash: 'Efectivo',
                  card: 'Tarjeta Débito/Crédito',
                  transfer: 'Transferencia Bancaria',
                  credit: 'Crédito a Cuenta'
                };
                const colors = {
                  cash: 'bg-emerald-500',
                  card: 'bg-indigo-500',
                  transfer: 'bg-amber-500',
                  credit: 'bg-purple-500'
                };

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{names[p.payment_method] || p.payment_method}</span>
                      <span className="font-bold text-slate-900">{formatMoney(p.total)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[p.payment_method] || 'bg-slate-400'} rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(10, (p.total / (metrics.month?.total || 1)) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">{p.count} transacciones registradas</p>
                  </div>
                );
              })}

              {(!metrics.paymentStats || metrics.paymentStats.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6">Sin ventas registradas aún.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">Impuesto configurado: {company?.tax_rate}%</p>
          </div>
        </div>
      </div>

      {/* Top Productos y Ventas Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Productos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Top Productos Más Vendidos</h2>
          <p className="text-xs text-slate-400 mb-4">Por volumen de unidades facturadas</p>

          <div className="divide-y divide-slate-100">
            {metrics.topProducts?.map((prod, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{prod.product_name}</p>
                    <p className="text-[11px] text-slate-400">{prod.units_sold} unidades vendidas</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-indigo-600">
                  {formatMoney(prod.total_revenue)}
                </span>
              </div>
            ))}

            {(!metrics.topProducts || metrics.topProducts.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No hay datos de ventas de productos aún.</p>
            )}
          </div>
        </div>

        {/* Ventas Recientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Últimas Transacciones</h2>
              <p className="text-xs text-slate-400">Movimientos en tiempo real</p>
            </div>
            <button
              onClick={() => setCurrentTab('sales')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
            >
              Ver todas →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics.recentSales?.map((sale) => (
              <div key={sale.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-[10px] font-bold">
                    {sale.payment_method === 'cash' ? 'EF' : sale.payment_method === 'card' ? 'TC' : 'TR'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{sale.invoice_number}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                        sale.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {sale.status === 'completed' ? 'Completada' : 'Anulada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {sale.client_name || 'Consumidor Final'} • {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900">
                    {formatMoney(sale.total)}
                  </span>
                  <button
                    onClick={() => handleViewReceipt(sale.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Ver Comprobante"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {(!metrics.recentSales || metrics.recentSales.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">Sin ventas recientes.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Comprobante / Ticket */}
      {selectedSale && (
        <TicketModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
}
