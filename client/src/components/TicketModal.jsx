import React from 'react';
import { Printer, X, CheckCircle, Store, Calendar, User, FileText } from 'lucide-react';

export default function TicketModal({ sale, onClose }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = sale.company?.currency_symbol || '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera Modal (no visible en impresión) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">Comprobante de Venta</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor del Ticket (Imprimible) */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-800 bg-white" id="printable-ticket">
          {/* Datos Empresa */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
              {sale.company?.name || 'EMPRESA'}
            </h2>
            {sale.company?.tax_id && (
              <p className="text-[11px] text-slate-600 mt-0.5">Identificación: {sale.company.tax_id}</p>
            )}
            {sale.company?.address && (
              <p className="text-[11px] text-slate-600">{sale.company.address}</p>
            )}
            {sale.company?.phone && (
              <p className="text-[11px] text-slate-600">Tel: {sale.company.phone}</p>
            )}
          </div>

          {/* Datos Venta */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Factura N°:</span>
              <span className="font-bold text-slate-900">{sale.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha y Hora:</span>
              <span>{new Date(sale.created_at).toLocaleString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Atendido por:</span>
              <span className="font-medium">{sale.user_name || 'Vendedor'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-medium text-slate-900">{sale.client_name || 'Consumidor Final'}</span>
            </div>
            {sale.client_tax_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Doc. Cliente:</span>
                <span>{sale.client_tax_id}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Método de Pago:</span>
              <span className="font-bold uppercase text-indigo-700">
                {sale.payment_method === 'cash' ? 'Efectivo' :
                 sale.payment_method === 'card' ? 'Tarjeta' :
                 sale.payment_method === 'transfer' ? 'Transferencia' : 'Crédito'}
              </span>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-1">Cant</th>
                  <th className="py-1">Descripción</th>
                  <th className="py-1 text-right">P.Unit</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(sale.items || []).map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 font-bold">{item.quantity}</td>
                    <td className="py-1.5 pr-2 font-medium">{item.product_name}</td>
                    <td className="py-1.5 text-right">{currency}{Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">
                      {currency}{Number(item.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen de Totales */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{currency}{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Descuento aplicado:</span>
                <span>-{currency}{Number(sale.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {sale.tax_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Impuesto ({sale.company?.tax_rate || 0}%):</span>
                <span>{currency}{Number(sale.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-950 pt-1 border-t border-slate-200">
              <span>TOTAL A PAGAR:</span>
              <span className="text-base text-indigo-700">{currency}{Number(sale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Importe Recibido:</span>
              <span>{currency}{Number(sale.amount_paid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-semibold">
              <span>Cambio / Vuelto:</span>
              <span>{currency}{Number(sale.change_returned).toFixed(2)}</span>
            </div>
          </div>

          {/* Mensaje de Despedida */}
          <div className="text-center pt-4 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              {sale.company?.ticket_footer || '¡Gracias por su compra! Vuelva pronto.'}
            </p>
            <p className="text-[10px] text-slate-400">Software emitido por OmniVentas SaaS Cloud</p>
          </div>
        </div>

        {/* Botones de Acción (no se imprimen) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
}
