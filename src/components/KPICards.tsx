import React from 'react';
import {
  Wallet,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export interface KPICardsProps {
  totalAno: number;
  ano: number;
  totalMesAtual: number;
  mediaMensal: number;
  garantiasVencendoCount: number;
  isCarregando?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({
  totalAno,
  ano,
  totalMesAtual,
  mediaMensal,
  garantiasVencendoCount,
  isCarregando = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      {/* Card 1: Total no Ano */}
      <div className="group relative bg-white rounded-xl border border-slate-200/90 border-l-4 border-l-blue-600 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total no Ano ({ano})
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2">
          {isCarregando ? (
            <div className="h-8 w-32 bg-slate-200/70 animate-pulse rounded-md" />
          ) : (
            <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
              {formatCurrency(totalAno)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>Soma de todos os custos</span>
          </p>
        </div>
      </div>

      {/* Card 2: Gasto no Mês Atual */}
      <div className="group relative bg-white rounded-xl border border-slate-200/90 border-l-4 border-l-emerald-600 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Gasto no Mês Atual
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2">
          {isCarregando ? (
            <div className="h-8 w-28 bg-slate-200/70 animate-pulse rounded-md" />
          ) : (
            <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
              {formatCurrency(totalMesAtual)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>Competência vigente</span>
          </p>
        </div>
      </div>

      {/* Card 3: Média Mensal Estimada */}
      <div className="group relative bg-white rounded-xl border border-slate-200/90 border-l-4 border-l-cyan-600 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Média Mensal Estimada
          </span>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-200">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2">
          {isCarregando ? (
            <div className="h-8 w-28 bg-slate-200/70 animate-pulse rounded-md" />
          ) : (
            <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
              {formatCurrency(mediaMensal)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>Base anual / 12 meses</span>
          </p>
        </div>
      </div>

      {/* Card 4: Garantias / Vencendo (60d) */}
      <div
        className={`group relative bg-white rounded-xl border border-slate-200/90 border-l-4 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
          garantiasVencendoCount > 0 ? 'border-l-amber-500' : 'border-l-slate-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Garantias / Vencendo (60d)
          </span>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-200 ${
              garantiasVencendoCount > 0
                ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-600 group-hover:text-white'
            }`}
          >
            {garantiasVencendoCount > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
        </div>
        <div className="mt-2">
          {isCarregando ? (
            <div className="h-8 w-16 bg-slate-200/70 animate-pulse rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-[26px] font-bold tracking-tight ${
                  garantiasVencendoCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {garantiasVencendoCount}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {garantiasVencendoCount === 1 ? 'item sob atenção' : 'itens sob atenção'}
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Licenças e garantias
          </p>
        </div>
      </div>
    </div>
  );
};

export default KPICards;
