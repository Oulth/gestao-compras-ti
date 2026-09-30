import React from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  LayoutDashboard,
  ShoppingCart,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Mail,
} from 'lucide-react';

export type TabType = 'dashboard' | 'compras' | 'relatorios';

export interface NavbarProps {
  abaAtiva: TabType;
  onMudarAba: (aba: TabType) => void;
  anoSelecionado: number;
  anosDisponiveis?: number[];
  onMudarAno: (ano: number) => void;
  onRecarregar: () => void;
  isCarregando?: boolean;
  onNovaCompra: () => void;
  isRealtimeConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  abaAtiva,
  onMudarAba,
  anoSelecionado,
  anosDisponiveis = [2026, 2025, 2024, 2023],
  onMudarAno,
  onRecarregar,
  isCarregando = false,
  onNovaCompra,
  isRealtimeConnected = true,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
      {/* Barra Superior Institucional */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 border-b border-slate-100">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-100">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  Colégio Ágape
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Setor de T.I
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sistema de Gestão & Controle de Compras
              </p>
            </div>
          </div>

          {/* Status & Contato Institucional */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Status do Supabase Realtime */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs transition-colors duration-200 ${
                isRealtimeConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}
              title={
                isRealtimeConnected
                  ? 'Banco de dados Supabase sincronizado em tempo real via Realtime'
                  : 'Sincronizando / Conectando com Supabase...'
              }
            >
              <span className="relative flex h-2 w-2">
                {isRealtimeConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                )}
              </span>
              <CheckCircle2 className={`w-3.5 h-3.5 ${isRealtimeConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>{isRealtimeConnected ? 'Supabase Realtime Ativo' : 'Conectando Supabase...'}</span>
            </div>

            {/* Email Institucional */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-slate-600 bg-slate-100/90 border border-slate-200">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[11px]">gestao.ti@colegioagape.com.br</span>
            </div>
          </div>
        </div>

        {/* Barra de Controles e Navegação */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-3">
          {/* Navegação de Abas (Modern Pills) */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => onMudarAba('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 ${
                abaAtiva === 'dashboard'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => onMudarAba('compras')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 ${
                abaAtiva === 'compras'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Compras & Despesas</span>
            </button>

            <button
              type="button"
              onClick={() => onMudarAba('relatorios')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 ${
                abaAtiva === 'relatorios'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Relatórios</span>
            </button>
          </nav>

          {/* Controles de Ação (Ano, Recarregar, Nova Compra) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Seletor de Ano */}
            <div className="relative inline-flex items-center">
              <label htmlFor="ano-exercicio-select" className="sr-only">
                Selecionar Exercício
              </label>
              <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <select
                id="ano-exercicio-select"
                aria-label="Selecionar Ano de Exercício"
                value={anoSelecionado}
                onChange={(e) => onMudarAno(Number(e.target.value))}
                className="pl-8 pr-7 py-1.5 text-xs sm:text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer transition-all"
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    Exercício {ano}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Atualizar / Sincronizar */}
            <button
              type="button"
              onClick={onRecarregar}
              disabled={isCarregando}
              title="Recarregar dados do Supabase"
              aria-label="Recarregar dados do Supabase"
              className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-500 ${isCarregando ? 'animate-spin text-blue-600' : ''}`}
              />
            </button>

            {/* Botão Primário: Nova Compra */}
            <button
              type="button"
              onClick={onNovaCompra}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs hover:shadow-sm shadow-blue-600/20 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Compra</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
