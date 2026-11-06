import React, { useState, useEffect } from 'react';
import { Building2, Plus, ShoppingCart, User, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Header({ currentTab, setCurrentTab }) {
  const { user, company, login } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await api.auth.getDemoCompanies();
        if (res.companies) {
          setCompanies(res.companies);
        }
      } catch (err) {
        console.error('Error al cargar empresas:', err);
      }
    }
    loadCompanies();
  }, []);

  const titles = {
    dashboard: 'Panel de Control & Analíticas',
    pos: 'Terminal de Punto de Venta (POS)',
    sales: 'Historial de Ventas y Comprobantes',
    products: 'Catálogo de Productos e Inventario',
    clients: 'Directorio de Clientes',
    users: 'Gestión de Equipo & Vendedores',
    settings: 'Configuración de la Empresa'
  };

  const handleSwitchCompany = async (targetCompany) => {
    if (targetCompany.id === company.id) {
      setShowCompanyMenu(false);
      return;
    }

    setSwitching(true);
    try {
      // Iniciar sesión usando el email del admin — la contraseña debe ingresarse en Login
      const email = targetCompany.admin_email || `admin@${targetCompany.slug}.com`;
      const demoPassword = process.env.VITE_DEMO_PASSWORD || '';
      await login(email, demoPassword, targetCompany.slug);
      setShowCompanyMenu(false);
      window.location.reload();
    } catch (err) {
      alert(`No se pudo cambiar de empresa automáticamente: ${err.message}. Puedes ingresar desde el inicio de sesión.`);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            {titles[currentTab] || 'OmniVentas SaaS'}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>Empresa activa:</span>
            <span className="font-semibold text-indigo-600">{company?.name}</span>
            {company?.tax_id && (
              <span className="text-slate-400 font-mono text-[11px]">({company.tax_id})</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Selector / Conmutador Multi-empresa */}
        <div className="relative">
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition border border-slate-200"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="truncate max-w-[120px]">{company?.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showCompanyMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Empresas Registradas en SQLite
              </div>
              <div className="py-1 max-h-56 overflow-y-auto space-y-1">
                {companies.map((comp) => {
                  const isCurrent = comp.id === company?.id;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => handleSwitchCompany(comp)}
                      disabled={switching}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition ${
                        isCurrent
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{comp.name}</span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {comp.currency_symbol} {comp.currency_code} • {comp.product_count} prods • {comp.sales_count} ventas
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-slate-100 px-2">
                <p className="text-[10px] text-slate-400 italic text-center">
                  Aislamiento total de datos por company_id
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botón rápido a POS */}
        {currentTab !== 'pos' && (
          <button
            onClick={() => setCurrentTab('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Punto de Venta</span>
          </button>
        )}

        {/* Perfil de Usuario */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
