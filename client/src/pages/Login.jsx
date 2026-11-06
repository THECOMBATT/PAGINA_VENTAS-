import React, { useState } from 'react';
import { LogIn, Building2, Shield, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-2xl shadow-xl shadow-indigo-500/25 mb-4">
          O
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          OmniVentas SaaS
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Plataforma de gestión de ventas multi-empresa con aislamiento SQLite & JWT
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/30 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Acceso Rápido a Empresas Demo */}
          <div className="mt-6 pt-6 border-t border-slate-700/80">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Prueba Rápida con Empresas Demo
              </span>
            </div>

            <div className="space-y-2">
              {/* Empresa 1 */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">TechNova Solutions ($ USD)</p>
                  <p className="text-[10px] text-slate-400">Tienda de Computación & Gadgets</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleQuickDemo('admin@technova.com', 'admin123')}
                    disabled={loading}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-500/30 transition"
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => handleQuickDemo('vendedor@technova.com', 'vendedor123')}
                    disabled={loading}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition"
                  >
                    Vendedor
                  </button>
                </div>
              </div>

              {/* Empresa 2 */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Café & Delicias (€ EUR)</p>
                  <p className="text-[10px] text-slate-400">Cafetería & Panadería Gourmet</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleQuickDemo('admin@cafedelicias.com', 'admin123')}
                    disabled={loading}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-500/30 transition"
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => handleQuickDemo('lucia@cafedelicias.com', 'vendedor123')}
                    disabled={loading}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition"
                  >
                    Vendedora
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>¿Quieres registrar tu propia empresa?</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
