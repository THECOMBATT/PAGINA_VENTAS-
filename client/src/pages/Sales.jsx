import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  XCircle,
  FileSpreadsheet,
  Calendar,
  Receipt,
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';

export default function Sales() {
  const { formatMoney, isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  // Modal para anulación de venta
  const [cancellingSaleId, setCancellingSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Error en cobro o devolución de cliente');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_method', paymentFilter);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.sales.getAll(queryString);
      setSales(res.sales || []);
    } catch (err) {
      console.error('Error al cargar ventas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  const handleViewReceipt = async (id) => {
    try {
      const res = await api.sales.getById(id);
      setSelectedSale(res.sale);
    } catch (err) {
      alert('Error al abrir comprobante: ' + err.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingSaleId) return;
    setSubmittingCancel(true);

    try {
      await api.sales.cancel(cancellingSaleId, { reason: cancelReason });
      setCancellingSaleId(null);
      fetchSales();
    } catch (err) {
      alert('Error al anular venta: ' + err.message);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const exportToCSV = () => {
    if (sales.length === 0) return;

    const headers = ['Factura', 'Fecha', 'Cliente', 'Vendedor', 'Metodo_Pago', 'Subtotal', 'Descuento', 'Impuesto', 'Total', 'Estado'];
    const rows = sales.map(s => [
      s.invoice_number,
      s.created_at,
      `"${s.client_name || 'Consumidor Final'}"`,
      `"${s.user_name || ''}"`,
      s.payment_method,
      s.subtotal,
      s.discount_amount,
      s.tax_amount,
      s.total,
      s.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Controles y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por factura o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>

          {/* Filtro Pago */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">Todos los Pagos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="credit">Crédito</option>
          </select>

          {/* Exportar CSV */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition"
            title="Exportar a CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Factura N°</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Atendido por</th>
                <th className="py-3 px-4">Pago</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Cargando ventas...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No hay ventas registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(sale.created_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {sale.client_name || 'Consumidor Final'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {sale.user_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-bold text-slate-700">
                        {sale.payment_method === 'cash' ? 'Efectivo' :
                         sale.payment_method === 'card' ? 'Tarjeta' :
                         sale.payment_method === 'transfer' ? 'Transferencia' : 'Crédito'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      {formatMoney(sale.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {sale.status === 'completed' ? 'Completada' : 'Anulada'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewReceipt(sale.id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Ver / Reimprimir Comprobante"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && sale.status === 'completed' && (
                          <button
                            onClick={() => setCancellingSaleId(sale.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Anular Venta y Restaurar Stock"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reimpresión */}
      {selectedSale && (
        <TicketModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}

      {/* Modal Confirmar Anulación */}
      {cancellingSaleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">¿Anular esta Venta?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Al anularla, los productos se devolverán al inventario automáticamente y se registrará la anulación contable.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo de Anulación</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingSaleId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={submittingCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow"
              >
                {submittingCancel ? 'Anulando...' : 'Sí, Anular y Devolver Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
