import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import type {
  DashboardData,
  MonthlyTotal,
  CategoryTotal,
  TopSupplier,
  UpcomingWarranty,
} from '../types';
import { formatCurrency, formatDate, formatCnpj } from '../utils/formatters';

const CATEGORY_COLORS = [
  '#2563eb', // Azul
  '#059669', // Esmeralda
  '#7c3aed', // Roxo
  '#d97706', // Âmbar
  '#0891b2', // Ciano
  '#e11d48', // Rosa
  '#4f46e5', // Índigo
  '#ea580c', // Laranja
  '#0d9488', // Teal
  '#64748b', // Slate
];

export interface DashboardViewProps {
  ano: number;
  data?: DashboardData;
  monthlyTotals?: MonthlyTotal[];
  categoryTotals?: CategoryTotal[];
  topSuppliers?: TopSupplier[];
  upcomingWarranties?: UpcomingWarranty[];
  isCarregando?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  ano,
  data,
  monthlyTotals: propMonthly,
  categoryTotals: propCategories,
  topSuppliers: propSuppliers,
  upcomingWarranties: propWarranties,
  isCarregando = false,
}) => {
  const monthlyTotals = data ? data.monthlyTotals : propMonthly || [];
  const categoryTotals = data ? data.categoryTotals : propCategories || [];
  const topSuppliers = data ? data.topSuppliers : propSuppliers || [];
  const upcomingWarranties = data ? data.upcomingWarranties : propWarranties || [];

  const temDadosGrafico = monthlyTotals.some((m) => m.total > 0);
  const temCategorias = categoryTotals.length > 0 && categoryTotals.some((c) => c.total > 0);

  // Tooltip customizado para o gráfico de barras mensal
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as MonthlyTotal;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700/80 min-w-[180px]">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/60 font-semibold text-slate-200">
            <span>Mês de {label}</span>
            <span className="text-slate-400 font-normal">{ano}</span>
          </div>
          <div className="text-sm font-bold text-blue-400 mb-1">
            {formatCurrency(item.total)}
          </div>
          {item.produtos > 0 && (
            <div className="flex justify-between text-slate-300 text-[11px] py-0.5">
              <span>Produtos:</span>
              <span className="font-medium text-slate-200">
                {formatCurrency(item.produtos)}
              </span>
            </div>
          )}
          {item.servicos > 0 && (
            <div className="flex justify-between text-slate-300 text-[11px] py-0.5">
              <span>Serviços / SaaS:</span>
              <span className="font-medium text-slate-200">
                {formatCurrency(item.servicos)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Tooltip customizado para o gráfico de pizza de categorias
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as CategoryTotal;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700/80 min-w-[190px]">
          <div className="font-semibold text-slate-200 line-clamp-2 mb-1">
            {item.categoria}
          </div>
          <div className="text-sm font-bold text-white mb-0.5">
            {formatCurrency(item.total)}
          </div>
          <div className="text-emerald-400 font-semibold text-[11px]">
            {Number(item.percent).toFixed(1)}% do total no ano
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Seção Superior: 2 Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Evolução Mensal (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Evolução Mensal dos Gastos ({ano})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Valores consolidados mês a mês no exercício
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            {isCarregando ? (
              <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl animate-pulse">
                <span className="text-xs font-medium text-slate-400">
                  Carregando evolução mensal...
                </span>
              </div>
            ) : !temDadosGrafico ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl">
                <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum gasto registrado em {ano}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Cadastre novas compras para visualizar a evolução financeira mensal da T.I.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyTotals}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => {
                      if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
                      return `R$ ${val}`;
                    }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="total"
                    name="Total Mensal"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Despesas por Categoria (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Despesas por Categoria
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Distribuição orçamentária por segmento de T.I
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            {isCarregando ? (
              <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl animate-pulse">
                <span className="text-xs font-medium text-slate-400">
                  Carregando categorias...
                </span>
              </div>
            ) : !temCategorias ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl">
                <PieIcon className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  Sem categorias computadas
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Adicione compras com categorias para acompanhar o gráfico de distribuição.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="48%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryTotals.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-slate-600 font-medium line-clamp-1 inline-block max-w-[140px] align-middle">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Seção Inferior: Tabela de Fornecedores (7 cols) e Alertas de Garantias (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Esquerda (7 cols): Principais Fornecedores & Prestadores */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Principais Fornecedores & Prestadores
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Parceiros de maior representatividade financeira no ano ({ano})
                  </p>
                </div>
              </div>
            </div>

            {isCarregando ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : topSuppliers.length === 0 ? (
              <div className="py-10 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum fornecedor registrado neste ano
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Os gastos agrupados por parceiro aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Fornecedor / Razão</th>
                      <th className="pb-3 font-semibold text-right">Total Investido</th>
                      <th className="pb-3 font-semibold pl-4 w-36 sm:w-44 text-right">
                        % do Exercício
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topSuppliers.map((supplier, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pr-2">
                          <div className="font-semibold text-slate-800">
                            {supplier.fornecedor}
                          </div>
                          {supplier.cnpj ? (
                            <div className="text-[11px] text-slate-400 font-mono">
                              CNPJ: {formatCnpj(supplier.cnpj)}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              Sem CNPJ informado
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(supplier.total)}
                        </td>
                        <td className="py-3 pl-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-semibold text-slate-600 w-11 text-right">
                              {Number(supplier.percent).toFixed(1)}%
                            </span>
                            <div className="w-16 sm:w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, Math.max(4, supplier.percent))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Direita (5 cols): Vencimento de Garantias & Licenças (60 dias) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Garantias & Licenças (60 dias)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Monitoramento preventivo de prazos e contratos
                  </p>
                </div>
              </div>
            </div>

            {isCarregando ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingWarranties.length === 0 ? (
              <div className="py-10 text-center bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200 p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-emerald-800">
                  Tudo em conformidade!
                </h4>
                <p className="text-xs text-emerald-700/80 mt-1 max-w-xs mx-auto">
                  Nenhuma garantia ou licença com vencimento programado para os próximos 60 dias.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {upcomingWarranties.map((item) => {
                  const isVencido = item.diasRestantes < 0;
                  const isHoje = item.diasRestantes === 0;
                  const isUrgente = item.diasRestantes <= 7;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {item.descricao}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {item.fornecedor}
                          </p>
                        </div>
                        {/* Badge de status */}
                        <div>
                          {isVencido ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Vencida há {Math.abs(item.diasRestantes)}d
                            </span>
                          ) : isHoje ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap animate-pulse">
                              <Clock className="w-3 h-3 text-red-600" />
                              Vence Hoje!
                            </span>
                          ) : isUrgente ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Vence em {item.diasRestantes} {item.diasRestantes === 1 ? 'dia' : 'dias'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              <Clock className="w-3 h-3 text-blue-500" />
                              {item.diasRestantes} dias
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Vencimento: {formatDate(item.garantia)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
