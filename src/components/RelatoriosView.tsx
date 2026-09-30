import React, { useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Calendar,
  Layers,
  Building2,
  DollarSign,
  TrendingUp,
  Package,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import type { Compra } from '../types';
import { formatCurrency } from '../utils/formatters';
import { exportarParaExcel } from '../utils/exportExcel';

export interface RelatoriosViewProps {
  compras: Compra[];
  ano: number;
  anosDisponiveis?: number[];
  onMudarAno?: (ano: number) => void;
}

const MESES = [
  { nome: 'Janeiro', num: '01' },
  { nome: 'Fevereiro', num: '02' },
  { nome: 'Março', num: '03' },
  { nome: 'Abril', num: '04' },
  { nome: 'Maio', num: '05' },
  { nome: 'Junho', num: '06' },
  { nome: 'Julho', num: '07' },
  { nome: 'Agosto', num: '08' },
  { nome: 'Setembro', num: '09' },
  { nome: 'Outubro', num: '10' },
  { nome: 'Novembro', num: '11' },
  { nome: 'Dezembro', num: '12' },
];

const PALETA_CORES_CATEGORIA = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-500',
  'bg-cyan-600',
  'bg-rose-500',
  'bg-indigo-600',
  'bg-orange-500',
  'bg-teal-600',
  'bg-slate-600',
];

const PALETA_CORES_CENTRO = [
  'bg-indigo-600',
  'bg-teal-600',
  'bg-sky-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-slate-600',
];

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  compras,
  ano,
  anosDisponiveis,
  onMudarAno,
}) => {
  // 1. Filtrar compras do exercício selecionado
  const comprasDoAno = useMemo(() => {
    const anoStr = String(ano);
    return compras.filter((c) => c.data_compra && c.data_compra.startsWith(anoStr));
  }, [compras, ano]);

  // 2. Totais Gerais do Ano
  const totalGeralAno = useMemo(() => {
    return comprasDoAno.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [comprasDoAno]);

  const totalProdutosAno = useMemo(() => {
    return comprasDoAno
      .filter((c) => c.tipo === 'Produto')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [comprasDoAno]);

  const totalServicosAno = useMemo(() => {
    return comprasDoAno
      .filter((c) => c.tipo !== 'Produto')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [comprasDoAno]);

  const mediaMensal = totalGeralAno > 0 ? totalGeralAno / 12 : 0;

  // 3. Tabela 1: Consolidado Mês a Mês
  const dadosMensais = useMemo(() => {
    const anoStr = String(ano);
    return MESES.map((m) => {
      const prefix = `${anoStr}-${m.num}`;
      const itemsDoMes = comprasDoAno.filter(
        (c) => c.data_compra && c.data_compra.startsWith(prefix)
      );

      let produtos = 0;
      let servicos = 0;

      for (const item of itemsDoMes) {
        const val = Number(item.valor) || 0;
        if (item.tipo === 'Produto') {
          produtos += val;
        } else {
          servicos += val;
        }
      }

      const totalMes = produtos + servicos;
      const percentual = totalGeralAno > 0 ? (totalMes / totalGeralAno) * 100 : 0;

      return {
        mes: m.nome,
        num: m.num,
        produtos,
        servicos,
        totalMes,
        percentual,
        quantidade: itemsDoMes.length,
      };
    });
  }, [comprasDoAno, ano, totalGeralAno]);

  // 4. Tabela 2: Relatório por Categoria
  const dadosCategorias = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const item of comprasDoAno) {
      const cat = item.categoria?.trim() || 'Outros';
      const val = Number(item.valor) || 0;
      const current = map.get(cat) || { total: 0, count: 0 };
      map.set(cat, {
        total: current.total + val,
        count: current.count + 1,
      });
    }

    return Array.from(map.entries())
      .map(([categoria, d]) => ({
        categoria,
        total: d.total,
        count: d.count,
        percent: totalGeralAno > 0 ? (d.total / totalGeralAno) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [comprasDoAno, totalGeralAno]);

  // 5. Tabela 3: Relatório por Centro de Custo / Sub-setor
  const dadosCentrosCusto = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const item of comprasDoAno) {
      const centro = item.centro_custo?.trim() || 'Geral / Não atribuído';
      const val = Number(item.valor) || 0;
      const current = map.get(centro) || { total: 0, count: 0 };
      map.set(centro, {
        total: current.total + val,
        count: current.count + 1,
      });
    }

    return Array.from(map.entries())
      .map(([centroCusto, d]) => ({
        centroCusto,
        total: d.total,
        count: d.count,
        percent: totalGeralAno > 0 ? (d.total / totalGeralAno) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [comprasDoAno, totalGeralAno]);

  // Handler de Impressão
  const handleImprimir = () => {
    window.print();
  };

  // Handler de Exportação Excel
  const handleExportarExcel = () => {
    const hoje = new Date().toISOString().split('T')[0];
    exportarParaExcel(
      comprasDoAno,
      `Relatorio_Financeiro_TI_Agape_${ano}_${hoje}.xlsx`
    );
  };

  const dataEmissaoFormatada = useMemo(() => {
    const d = new Date();
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }, []);

  return (
    <div className="space-y-8 print:space-y-6">
      {/* =========================================================================
          CABEÇALHO INSTITUCIONAL EXCLUSIVO PARA IMPRESSÃO (@media print)
      ========================================================================= */}
      <div className="hidden print:block pb-4 mb-4 border-b-2 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              Á
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Colégio Ágape - Setor de T.I
              </h1>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Sistema Integrado de Gestão Contábil & Compras de Tecnologia
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-semibold text-slate-900">
              Exercício Contábil: {ano}
            </p>
            <p>Emissão: {dataEmissaoFormatada}</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CABEÇALHO DA TELA & CONTROLES DE AÇÃO (OCULTOS NA IMPRESSÃO)
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Título & Descritivo */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Relatório Financeiro & Demonstrativo Contábil ({ano})
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                Exercício {ano}
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">
              Consolidado mensal de desembolsos, distribuição orçamentária por
              categoria de T.I e alocação por centros de custo institucionais.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {/* Seletor rápido de ano caso fornecido */}
            {anosDisponiveis && onMudarAno && (
              <div className="relative inline-flex items-center">
                <label htmlFor="relatorio-ano-select" className="sr-only">
                  Selecionar Exercício do Relatório
                </label>
                <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <select
                  id="relatorio-ano-select"
                  aria-label="Selecionar Exercício do Relatório"
                  value={ano}
                  onChange={(e) => onMudarAno(Number(e.target.value))}
                  className="pl-8 pr-7 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer transition-all"
                >
                  {anosDisponiveis.map((a) => (
                    <option key={a} value={a}>
                      Ano {a}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Exportar Excel */}
            <button
              type="button"
              onClick={handleExportarExcel}
              title="Baixar planilha estruturada com todos os lançamentos do ano"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-2xs active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>

            {/* Botão Imprimir Relatório */}
            <button
              type="button"
              onClick={handleImprimir}
              title="Imprimir relatório formatado para folha A4 / Salvar em PDF"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs hover:shadow-sm shadow-blue-600/20 transition-all active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Resumo Rápido de Indicadores do Relatório */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>Total no Exercício</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {formatCurrency(totalGeralAno)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Equipamentos / Produtos</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-blue-900 mt-1">
              {formatCurrency(totalProdutosAno)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Headphones className="w-3.5 h-3.5 text-indigo-600" />
              <span>Serviços & Licenças</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-indigo-900 mt-1">
              {formatCurrency(totalServicosAno)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Média Mensal</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {formatCurrency(mediaMensal)}
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABELA 1: RELATÓRIO CONSOLIDADO MÊS A MÊS
      ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:shadow-none break-inside-avoid">
        {/* Cabeçalho da Seção */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                1. Relatório Consolidado Mês a Mês ({ano})
              </h3>
              <p className="text-xs text-slate-500">
                Demonstrativo comparativo de despesas mensais divididas por Produtos e Serviços/SaaS
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 print:border print:border-slate-400">
            12 Competências
          </span>
        </div>

        {/* Tabela Estruturada */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <th scope="col" className="py-3 px-4 sm:px-6">
                  Mês / Competência
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Produtos (R$)
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Serviços / SaaS (R$)
                </th>
                <th scope="col" className="py-3 px-4 text-right font-bold text-slate-900">
                  Total do Mês (R$)
                </th>
                <th scope="col" className="py-3 px-4 sm:px-6 text-right font-bold text-slate-900">
                  % Anual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dadosMensais.map((item, index) => {
                const temMovimento = item.totalMes > 0;
                return (
                  <tr
                    key={item.num}
                    className={`transition-colors ${
                      temMovimento
                        ? 'hover:bg-blue-50/40 text-slate-800'
                        : 'text-slate-400 bg-slate-50/20'
                    } ${index % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                  >
                    <td className="py-2.5 px-4 sm:px-6 font-medium flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 w-5">
                        {item.num}
                      </span>
                      <span className={temMovimento ? 'text-slate-900 font-semibold' : ''}>
                        {item.mes}
                      </span>
                      {item.quantidade > 0 && (
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 no-print">
                          {item.quantidade} {item.quantidade === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {formatCurrency(item.produtos)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {formatCurrency(item.servicos)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.totalMes)}
                    </td>
                    <td className="py-2.5 px-4 sm:px-6 text-right font-mono font-semibold text-slate-700">
                      {item.percentual.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Rodapé Destacado com Totais Gerais */}
            <tfoot className="border-t-2 border-slate-900 bg-slate-900 text-white font-bold text-sm print:bg-slate-200 print:text-black print:border-slate-800">
              <tr>
                <td className="py-3.5 px-4 sm:px-6 uppercase tracking-wider text-xs sm:text-sm">
                  TOTAL DO ANO ({ano})
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  {formatCurrency(totalProdutosAno)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  {formatCurrency(totalServicosAno)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-base font-extrabold text-blue-200 print:text-black">
                  {formatCurrency(totalGeralAno)}
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-extrabold text-base text-emerald-300 print:text-black">
                  100.0%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* =========================================================================
          TABELAS 2 & 3: CATEGORIAS E CENTROS DE CUSTO (GRID RESPONSIVO)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1 print:gap-6">
        {/* =====================================================================
            TABELA 2: RELATÓRIO POR CATEGORIA
        ===================================================================== */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:shadow-none break-inside-avoid">
          {/* Cabeçalho da Seção */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  2. Relatório por Categoria ({ano})
                </h3>
                <p className="text-xs text-slate-500">
                  Distribuição de investimentos por tipo de ativo ou serviço de T.I
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              {dadosCategorias.length} categorias
            </span>
          </div>

          {/* Tabela de Categorias */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-5">
                    Categoria de T.I
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Total Gasto (R$)
                  </th>
                  <th scope="col" className="py-3 px-4 sm:px-5 text-right w-44">
                    % Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dadosCategorias.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                      Nenhum lançamento registrado no exercício de {ano}.
                    </td>
                  </tr>
                ) : (
                  dadosCategorias.map((cat, idx) => {
                    const corBarra =
                      PALETA_CORES_CATEGORIA[idx % PALETA_CORES_CATEGORIA.length];
                    return (
                      <tr
                        key={cat.categoria}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 px-4 sm:px-5 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${corBarra} shrink-0`}
                            />
                            <span className="truncate max-w-xs" title={cat.categoria}>
                              {cat.categoria}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(cat.total)}
                        </td>
                        <td className="py-3 px-4 sm:px-5 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden print:border print:border-slate-300">
                              <div
                                className={`h-full rounded-full ${corBarra}`}
                                style={{
                                  width: `${Math.min(Math.max(cat.percent, 0), 100)}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-xs text-slate-700 min-w-11 text-right">
                              {cat.percent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-slate-800 font-bold text-xs">
                <tr>
                  <td className="py-2.5 px-4 sm:px-5 uppercase">Total Consolidado</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm">
                    {formatCurrency(totalGeralAno)}
                  </td>
                  <td className="py-2.5 px-4 sm:px-5 text-right font-mono text-sm">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* =====================================================================
            TABELA 3: RELATÓRIO POR CENTRO DE CUSTO / SUB-SETOR
        ===================================================================== */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:shadow-none break-inside-avoid">
          {/* Cabeçalho da Seção */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  3. Relatório por Centro de Custo ({ano})
                </h3>
                <p className="text-xs text-slate-500">
                  Alocação de orçamento por sub-setor e área demandante
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
              {dadosCentrosCusto.length} centros
            </span>
          </div>

          {/* Tabela de Centros de Custo */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-5">
                    Sub-setor / Centro de Custo
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Total Gasto (R$)
                  </th>
                  <th scope="col" className="py-3 px-4 sm:px-5 text-right w-44">
                    % Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dadosCentrosCusto.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                      Nenhum centro de custo computado no exercício de {ano}.
                    </td>
                  </tr>
                ) : (
                  dadosCentrosCusto.map((cc, idx) => {
                    const corBarra =
                      PALETA_CORES_CENTRO[idx % PALETA_CORES_CENTRO.length];
                    return (
                      <tr
                        key={cc.centroCusto}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 px-4 sm:px-5 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${corBarra} shrink-0`}
                            />
                            <span className="truncate max-w-xs" title={cc.centroCusto}>
                              {cc.centroCusto}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(cc.total)}
                        </td>
                        <td className="py-3 px-4 sm:px-5 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden print:border print:border-slate-300">
                              <div
                                className={`h-full rounded-full ${corBarra}`}
                                style={{
                                  width: `${Math.min(Math.max(cc.percent, 0), 100)}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-xs text-slate-700 min-w-11 text-right">
                              {cc.percent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-slate-800 font-bold text-xs">
                <tr>
                  <td className="py-2.5 px-4 sm:px-5 uppercase">Total Consolidado</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm">
                    {formatCurrency(totalGeralAno)}
                  </td>
                  <td className="py-2.5 px-4 sm:px-5 text-right font-mono text-sm">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      {/* =========================================================================
          RODAPÉ DE ASSINATURA EXCLUSIVO PARA IMPRESSÃO (@media print)
      ========================================================================= */}
      <div className="hidden print:block pt-12 mt-8 border-t border-slate-300 break-inside-avoid">
        <div className="grid grid-cols-2 gap-16 text-center text-xs text-slate-700">
          <div>
            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
              Coordenação de Tecnologia da Informação
            </div>
            <p>Colégio Ágape</p>
          </div>
          <div>
            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
              Diretoria Administrativa & Financeira
            </div>
            <p>Aprovação / Visto Contábil</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosView;
