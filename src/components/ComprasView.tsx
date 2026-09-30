import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  FileSpreadsheet,
  Printer,
  Plus,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
} from 'lucide-react';
import type { Compra, TipoDespesa, StatusPagamento } from '../types';
import { formatDate, formatCurrency, formatCnpj } from '../utils/formatters';
import { exportarParaExcel } from '../utils/exportExcel';
import { getConfiguracoes, DEFAULT_CONFIGURACOES } from '../services/compras';

export interface ComprasViewProps {
  compras: Compra[];
  isCarregando?: boolean;
  anoSelecionado?: number;
  onNovaCompra: () => void;
  onEditarCompra?: (compra: Compra) => void;
  onExcluirCompra?: (id: string) => Promise<void> | void;
  categorias?: string[];
}

const MESES = [
  { valor: 'todos', label: 'Todos os Meses' },
  { valor: '01', label: 'Janeiro' },
  { valor: '02', label: 'Fevereiro' },
  { valor: '03', label: 'Março' },
  { valor: '04', label: 'Abril' },
  { valor: '05', label: 'Maio' },
  { valor: '06', label: 'Junho' },
  { valor: '07', label: 'Julho' },
  { valor: '08', label: 'Agosto' },
  { valor: '09', label: 'Setembro' },
  { valor: '10', label: 'Outubro' },
  { valor: '11', label: 'Novembro' },
  { valor: '12', label: 'Dezembro' },
];

const TIPOS_DESPESA = [
  { valor: 'todos', label: 'Todos os Tipos' },
  { valor: 'Produto', label: 'Produto' },
  { valor: 'Serviço', label: 'Serviço' },
  { valor: 'Assinatura Recorrente (SaaS)', label: 'Assinatura Recorrente (SaaS)' },
  { valor: 'Contrato Mensal', label: 'Contrato Mensal' },
];

export const ComprasView: React.FC<ComprasViewProps> = ({
  compras,
  isCarregando = false,
  anoSelecionado,
  onNovaCompra,
  onEditarCompra,
  onExcluirCompra,
  categorias: categoriasProp,
}) => {
  // Filtros
  const [busca, setBusca] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [mesFiltro, setMesFiltro] = useState<string>('todos');
  const [anoFiltro, setAnoFiltro] = useState<string>(
    anoSelecionado ? String(anoSelecionado) : 'todos'
  );

  // Categorias disponíveis
  const [categoriasLista, setCategoriasLista] = useState<string[]>([]);

  // Estado do Modal de Exclusão
  const [compraParaExcluir, setCompraParaExcluir] = useState<Compra | null>(null);
  const [isExcluindo, setIsExcluindo] = useState<boolean>(false);

  // Sincroniza anoSelecionado se mudar pelo navbar
  useEffect(() => {
    if (anoSelecionado) {
      setAnoFiltro(String(anoSelecionado));
    }
  }, [anoSelecionado]);

  // Carrega categorias do banco / props
  useEffect(() => {
    if (categoriasProp && categoriasProp.length > 0) {
      setCategoriasLista(categoriasProp);
      return;
    }

    getConfiguracoes()
      .then((cfg) => {
        const catSet = new Set<string>([...cfg.categorias]);
        compras.forEach((c) => {
          if (c.categoria) catSet.add(c.categoria);
        });
        setCategoriasLista(Array.from(catSet));
      })
      .catch(() => {
        const catSet = new Set<string>([...DEFAULT_CONFIGURACOES.categorias]);
        compras.forEach((c) => {
          if (c.categoria) catSet.add(c.categoria);
        });
        setCategoriasLista(Array.from(catSet));
      });
  }, [categoriasProp, compras]);

  // Lista de anos extraídos das compras para o filtro de ano
  const anosDisponiveis = useMemo(() => {
    const anosSet = new Set<string>();
    if (anoSelecionado) anosSet.add(String(anoSelecionado));
    compras.forEach((c) => {
      if (c.data_compra) {
        const y = c.data_compra.slice(0, 4);
        if (y) anosSet.add(y);
      }
    });
    return Array.from(anosSet).sort((a, b) => b.localeCompare(a));
  }, [compras, anoSelecionado]);

  // Filtragem de dados
  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      // Filtro de Ano
      if (anoFiltro !== 'todos') {
        const anoCompra = c.data_compra ? c.data_compra.slice(0, 4) : '';
        if (anoCompra !== anoFiltro) return false;
      }

      // Filtro de Mês
      if (mesFiltro !== 'todos') {
        const mesCompra = c.data_compra ? c.data_compra.slice(5, 7) : '';
        if (mesCompra !== mesFiltro) return false;
      }

      // Filtro de Tipo
      if (tipoFiltro !== 'todos' && c.tipo !== tipoFiltro) {
        return false;
      }

      // Filtro de Categoria
      if (categoriaFiltro !== 'todos' && c.categoria !== categoriaFiltro) {
        return false;
      }

      // Busca textual (descrição, fornecedor, cnpj, código TI, centro de custo)
      if (busca.trim()) {
        const termo = busca.trim().toLowerCase();
        const termoNumerico = termo.replace(/\D/g, '');

        const descOk = c.descricao?.toLowerCase().includes(termo);
        const fornOk = c.fornecedor?.toLowerCase().includes(termo);
        const codOk = c.codigo_ti?.toLowerCase().includes(termo);
        const ccOk = c.centro_custo?.toLowerCase().includes(termo);

        const cnpjClean = c.cnpj ? c.cnpj.replace(/\D/g, '') : '';
        const cnpjOk =
          (c.cnpj && c.cnpj.toLowerCase().includes(termo)) ||
          (termoNumerico.length > 0 && cnpjClean.includes(termoNumerico));

        if (!descOk && !fornOk && !codOk && !ccOk && !cnpjOk) {
          return false;
        }
      }

      return true;
    });
  }, [compras, anoFiltro, mesFiltro, tipoFiltro, categoriaFiltro, busca]);

  // Totalizador filtrado
  const totalFiltrado = useMemo(() => {
    return comprasFiltradas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [comprasFiltradas]);

  // Indicador de filtros ativos
  const filtrosAtivos =
    busca.trim() !== '' ||
    tipoFiltro !== 'todos' ||
    categoriaFiltro !== 'todos' ||
    mesFiltro !== 'todos' ||
    (anoSelecionado ? anoFiltro !== String(anoSelecionado) : anoFiltro !== 'todos');

  const limparFiltros = () => {
    setBusca('');
    setTipoFiltro('todos');
    setCategoriaFiltro('todos');
    setMesFiltro('todos');
    setAnoFiltro(anoSelecionado ? String(anoSelecionado) : 'todos');
  };

  const handleExportarExcel = () => {
    const sufixo = anoFiltro !== 'todos' ? `_${anoFiltro}` : '';
    const hoje = new Date().toISOString().split('T')[0];
    const nome = `Compras_TI_Colegio_Agape${sufixo}_${hoje}.xlsx`;
    exportarParaExcel(comprasFiltradas, nome);
  };

  const handleImprimir = () => {
    window.print();
  };

  const confirmarExclusao = async () => {
    if (!compraParaExcluir) return;
    setIsExcluindo(true);
    try {
      if (onExcluirCompra) {
        await onExcluirCompra(compraParaExcluir.id);
      }
      setCompraParaExcluir(null);
    } finally {
      setIsExcluindo(false);
    }
  };

  // Badges estilizados por status
  const renderStatusBadge = (status: StatusPagamento) => {
    switch (status) {
      case 'Pago':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Pago
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        );
      case 'Parcelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3 h-3 text-indigo-600" />
            Parcelado
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Badges estilizados por tipo de despesa
  const renderTipoBadge = (tipo: TipoDespesa) => {
    switch (tipo) {
      case 'Produto':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
            Produto
          </span>
        );
      case 'Serviço':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
            Serviço
          </span>
        );
      case 'Assinatura Recorrente (SaaS)':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/80">
            SaaS
          </span>
        );
      case 'Contrato Mensal':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200/80">
            Contrato
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            {tipo}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho Institucional Exclusivo de Impressão */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Colégio Ágape • Setor de Tecnologia da Informação
            </h1>
            <p className="text-sm text-slate-600">
              Relatório de Compras, Despesas e Contratos
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <p>
              Emissão:{' '}
              <span className="font-semibold">
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </p>
            <p>
              Registros:{' '}
              <span className="font-semibold">{comprasFiltradas.length}</span>
            </p>
            <p className="text-sm font-bold text-slate-900">
              Total: {formatCurrency(totalFiltrado)}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas Superior (Oculta na Impressão) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Campo de Busca Geral */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição, fornecedor, CNPJ, código T.I..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportarExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-98"
              title="Exportar registros filtrados para planilha Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-98"
              title="Imprimir visualização ou salvar como PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onNovaCompra}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Compra</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros Combinados */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold uppercase tracking-wider text-[11px] mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filtros:</span>
          </div>

          {/* Filtro por Tipo */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {TIPOS_DESPESA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Filtro por Categoria */}
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium max-w-[220px] truncate focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="todos">Todas as Categorias</option>
            {categoriasLista.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filtro por Mês */}
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {MESES.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Filtro por Ano */}
          {anosDisponiveis.length > 0 && (
            <select
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="todos">Todos os Anos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  Ano {a}
                </option>
              ))}
            </select>
          )}

          {/* Botão Limpar Filtros */}
          {filtrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium ml-auto"
            >
              <X className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 select-none">
                <th scope="col" className="py-3.5 px-4 whitespace-nowrap">
                  Data
                </th>
                <th scope="col" className="py-3.5 px-3 whitespace-nowrap">
                  Tipo
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Fornecedor / CNPJ
                </th>
                <th scope="col" className="py-3.5 px-4 min-w-[200px]">
                  Descrição do Item / Serviço
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Categoria / Centro Custo
                </th>
                <th scope="col" className="py-3.5 px-4 text-right whitespace-nowrap">
                  Valor (R$)
                </th>
                <th scope="col" className="py-3.5 px-3 whitespace-nowrap">
                  Pgto / Status
                </th>
                <th scope="col" className="py-3.5 px-3 text-center whitespace-nowrap">
                  NF / Anexo
                </th>
                <th
                  scope="col"
                  className="no-print py-3.5 px-4 text-right whitespace-nowrap"
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isCarregando ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-sm font-medium">Carregando compras...</span>
                    </div>
                  </td>
                </tr>
              ) : comprasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">
                        Nenhum registro encontrado
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                        Não encontramos nenhuma compra correspondente aos filtros
                        aplicados. Tente ajustar os termos de busca ou filtros selecionados.
                      </p>
                      {filtrosAtivos && (
                        <button
                          type="button"
                          onClick={limparFiltros}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200/80"
                        >
                          <X className="w-3.5 h-3.5" />
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                comprasFiltradas.map((compra) => (
                  <tr
                    key={compra.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Data */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-xs font-medium">
                      {formatDate(compra.data_compra)}
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {renderTipoBadge(compra.tipo)}
                    </td>

                    {/* Fornecedor / CNPJ */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {compra.fornecedor}
                      </div>
                      {compra.cnpj ? (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatCnpj(compra.cnpj)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">-</span>
                      )}
                    </td>

                    {/* Descrição */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-1.5">
                        {compra.codigo_ti && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0 mt-0.5">
                            {compra.codigo_ti}
                          </span>
                        )}
                        <span className="text-slate-800 font-medium leading-relaxed">
                          {compra.descricao}
                        </span>
                      </div>
                      {compra.garantia && (
                        <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Garantia até {formatDate(compra.garantia)}</span>
                        </div>
                      )}
                    </td>

                    {/* Categoria / Centro de Custo */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-700">
                        {compra.categoria}
                      </div>
                      {compra.centro_custo && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-300" />
                          <span>{compra.centro_custo}</span>
                        </div>
                      )}
                    </td>

                    {/* Valor (R$) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(Number(compra.valor) || 0)}
                    </td>

                    {/* Pgto / Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {renderStatusBadge(compra.status_pagamento)}
                        {compra.forma_pagamento && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {compra.forma_pagamento}
                            {compra.parcelas ? ` • ${compra.parcelas}` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* NF / Anexo */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {compra.link_nf ? (
                        <a
                          href={compra.link_nf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-200/80"
                          title={compra.nome_arquivo_nf || 'Visualizar Comprovante / NF'}
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Ver NF</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">
                          Sem anexo
                        </span>
                      )}
                    </td>

                    {/* Ações (Editar / Excluir) */}
                    <td className="no-print py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditarCompra?.(compra)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar lançamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompraParaExcluir(compra)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela: Totalizador e Contagem */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="text-slate-600 text-xs sm:text-sm font-medium">
            Exibindo{' '}
            <span className="font-bold text-slate-900">
              {comprasFiltradas.length}
            </span>{' '}
            de{' '}
            <span className="font-bold text-slate-900">{compras.length}</span>{' '}
            registros
            {filtrosAtivos && (
              <span className="text-xs text-blue-600 ml-1 font-semibold">
                (Filtro aplicado)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Total Filtrado:
            </span>
            <span className="text-lg font-bold text-blue-700 font-mono">
              {formatCurrency(totalFiltrado)}
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {compraParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação é irreversível e excluirá o registro permanentemente.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 mb-5 space-y-1.5 text-xs text-slate-600">
              {compraParaExcluir.codigo_ti && (
                <div>
                  <span className="font-semibold text-slate-700">Código:</span>{' '}
                  <span className="font-mono">{compraParaExcluir.codigo_ti}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-700">Descrição:</span>{' '}
                <span className="font-medium text-slate-900">
                  {compraParaExcluir.descricao}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Fornecedor:</span>{' '}
                {compraParaExcluir.fornecedor}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Valor:</span>{' '}
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(Number(compraParaExcluir.valor) || 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCompraParaExcluir(null)}
                disabled={isExcluindo}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={isExcluindo}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs hover:shadow-rose-500/20 disabled:opacity-50"
              >
                {isExcluindo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
