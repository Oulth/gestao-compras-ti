import React, { useState, useMemo } from 'react';
import {
  Laptop,
  CheckCircle2,
  PackageCheck,
  Wrench,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  QrCode,
  FileText,
  Pencil,
  Trash2,
  MapPin,
  User,
  X,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Boxes,
  MinusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Equipamento,
  EquipamentoInput,
  StatusEquipamento,
  Compra,
} from '../types';
import { DEFAULT_LOCALIZACOES } from '../services/equipamentos';
import { exportarInventarioParaExcel } from '../utils/exportInventarioExcel';
import { formatDate, formatCurrency } from '../utils/formatters';
import {
  extrairQuantidadeEquipamento,
  atualizarTextoComQuantidade,
  formatarLogUsoEquipamento,
} from '../utils/inventarioUtils';

interface InventarioViewProps {
  equipamentos: Equipamento[];
  compras?: Compra[];
  onNovoEquipamento: () => void;
  onEditarEquipamento: (equipamento: Equipamento) => void;
  onSalvarEquipamento?: (equipamento: EquipamentoInput | Equipamento) => Promise<void>;
  onExcluirEquipamento: (id: string) => Promise<void>;
  onAbrirTermo: (equipamento: Equipamento) => void;
  onAbrirEtiquetas: (equipamento?: Equipamento) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  equipamentos,
  compras = [],
  onNovoEquipamento,
  onEditarEquipamento,
  onSalvarEquipamento,
  onExcluirEquipamento,
  onAbrirTermo,
  onAbrirEtiquetas,
}) => {
  // Filtros
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modal de exclusão
  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState<Equipamento | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal de Usar 1 unidade / Dar Baixa no Estoque
  const [equipamentoParaUsar, setEquipamentoParaUsar] = useState<Equipamento | null>(null);
  const [qtdParaUsar, setQtdParaUsar] = useState<number>(1);
  const [responsavelUso, setResponsavelUso] = useState<string>('');
  const [localUso, setLocalUso] = useState<string>('');
  const [motivoUso, setMotivoUso] = useState<string>('');
  const [isUsando, setIsUsando] = useState<boolean>(false);

  // Mapa de compras para busca rápida por ID
  const comprasMap = useMemo(() => {
    const map = new Map<string, Compra>();
    compras.forEach((c) => map.set(c.id, c));
    return map;
  }, [compras]);

  // Listas únicas para os selects de filtro
  const tiposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    equipamentos.forEach((e) => {
      if (e.tipo) set.add(e.tipo);
    });
    return Array.from(set).sort();
  }, [equipamentos]);

  const localizacoesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    equipamentos.forEach((e) => {
      if (e.localizacao) set.add(e.localizacao);
    });
    return Array.from(set).sort();
  }, [equipamentos]);

  // Contadores para os KPI cards
  const stats = useMemo(() => {
    let emUso = 0;
    let estoque = 0;
    let manutencao = 0;
    let baixados = 0;
    let totalUnidades = 0;

    equipamentos.forEach((e) => {
      const qtd = extrairQuantidadeEquipamento(e);
      totalUnidades += qtd;

      if (e.status === 'Em Uso') emUso += qtd;
      else if (e.status === 'Disponível / Estoque') estoque += qtd;
      else if (e.status === 'Em Manutenção') manutencao += qtd;
      else if (e.status === 'Baixado / Sucateado') baixados += qtd;
    });

    return {
      total: equipamentos.length,
      totalUnidades,
      emUso,
      estoque,
      manutencao,
      baixados,
    };
  }, [equipamentos]);

  // Filtragem dos dados
  const equipamentosFiltrados = useMemo(() => {
    return equipamentos.filter((item) => {
      // Filtro texto
      if (buscaTexto.trim()) {
        const query = buscaTexto.toLowerCase().trim();
        const pat = (item.patrimonio || '').toLowerCase();
        const sn = (item.numero_serie || '').toLowerCase();
        const marca = (item.marca || '').toLowerCase();
        const modelo = (item.modelo || '').toLowerCase();
        const resp = (item.responsavel || '').toLowerCase();
        const loc = (item.localizacao || '').toLowerCase();
        const specs = (item.especificacoes || '').toLowerCase();

        const match =
          pat.includes(query) ||
          sn.includes(query) ||
          marca.includes(query) ||
          modelo.includes(query) ||
          resp.includes(query) ||
          loc.includes(query) ||
          specs.includes(query);

        if (!match) return false;
      }

      // Filtro tipo
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) {
        return false;
      }

      // Filtro localizacao
      if (filtroLocalizacao !== 'todas' && item.localizacao !== filtroLocalizacao) {
        return false;
      }

      // Filtro status
      if (filtroStatus !== 'todos' && item.status !== filtroStatus) {
        return false;
      }

      return true;
    });
  }, [equipamentos, buscaTexto, filtroTipo, filtroLocalizacao, filtroStatus]);

  const limparFiltros = () => {
    setBuscaTexto('');
    setFiltroTipo('todos');
    setFiltroLocalizacao('todas');
    setFiltroStatus('todos');
  };

  const temFiltroAtivo =
    buscaTexto.trim() !== '' ||
    filtroTipo !== 'todos' ||
    filtroLocalizacao !== 'todas' ||
    filtroStatus !== 'todos';

  const confirmarExclusao = async () => {
    if (!equipamentoParaExcluir) return;
    try {
      setIsDeleting(true);
      await onExcluirEquipamento(equipamentoParaExcluir.id);
      setEquipamentoParaExcluir(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Abre o modal para usar 1 ou mais unidades
  const handleAbrirModalUsar = (item: Equipamento) => {
    setEquipamentoParaUsar(item);
    setQtdParaUsar(1);
    setResponsavelUso(item.responsavel || '');
    setLocalUso(item.localizacao || DEFAULT_LOCALIZACOES[0] || 'CPD / Servidores');
    setMotivoUso('');
  };

  // Executa a baixa de uso e registra no histórico de observações
  const handleConfirmarUso = async (baixaRapida = false) => {
    if (!equipamentoParaUsar) return;

    const qtdAtual = extrairQuantidadeEquipamento(equipamentoParaUsar);
    const qtdRetirar = baixaRapida ? 1 : Math.max(1, Math.min(qtdParaUsar, qtdAtual));
    const novaQtd = Math.max(0, qtdAtual - qtdRetirar);

    setIsUsando(true);
    try {
      const novosSpecs = atualizarTextoComQuantidade(equipamentoParaUsar.especificacoes, novaQtd);
      const novoHistorico = formatarLogUsoEquipamento(
        equipamentoParaUsar.observacoes,
        qtdRetirar,
        novaQtd,
        baixaRapida ? 'Equipe T.I (Baixa Rápida)' : responsavelUso,
        baixaRapida ? equipamentoParaUsar.localizacao : localUso,
        baixaRapida ? 'Uso rotineiro imediato' : motivoUso
      );

      let novoStatus = equipamentoParaUsar.status;
      if (novaQtd === 0 && novoStatus === 'Disponível / Estoque') {
        novoStatus = 'Em Uso';
      }

      const payloadAtualizado: Equipamento = {
        ...equipamentoParaUsar,
        especificacoes: novosSpecs,
        observacoes: novoHistorico,
        status: novoStatus,
        responsavel: baixaRapida
          ? equipamentoParaUsar.responsavel
          : responsavelUso.trim() || equipamentoParaUsar.responsavel,
        localizacao: baixaRapida
          ? equipamentoParaUsar.localizacao
          : localUso.trim() || equipamentoParaUsar.localizacao,
      };

      if (onSalvarEquipamento) {
        await onSalvarEquipamento(payloadAtualizado);
      }

      toast.success(
        `✅ ${qtdRetirar} unidade de ${equipamentoParaUsar.marca} ${equipamentoParaUsar.modelo} utilizada! Novo saldo: ${novaQtd} un.`
      );
      setEquipamentoParaUsar(null);
    } catch (err: any) {
      console.error('Erro ao registrar uso do equipamento:', err);
      toast.error(err.message || 'Falha ao registrar uso do item.');
    } finally {
      setIsUsando(false);
    }
  };

  const renderStatusBadge = (status: StatusEquipamento) => {
    switch (status) {
      case 'Em Uso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Em Uso
          </span>
        );
      case 'Disponível / Estoque':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Disponível / Estoque
          </span>
        );
      case 'Em Manutenção':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Em Manutenção
          </span>
        );
      case 'Baixado / Sucateado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Baixado
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards do Inventário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total no Inventário
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                {stats.total} <span className="text-xs font-semibold text-slate-400 font-sans">itens</span>
              </h3>
              <p className="text-xs text-indigo-700 mt-1 font-semibold flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5" />
                <span>{stats.totalUnidades} unidades no total</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Laptop className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Em Uso */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Em Uso / Alocados
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 font-mono">
                {stats.emUso} <span className="text-xs font-semibold text-emerald-400 font-sans">un</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Com colaboradores ou salas
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Disponíveis no Estoque */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Disponíveis no Estoque
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-blue-600 mt-1 font-mono">
                {stats.estoque} <span className="text-xs font-semibold text-blue-400 font-sans">un</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Prontos para empréstimo / uso
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 4: Manutenção */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Em Manutenção / Suporte
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 font-mono">
                {stats.manutencao}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Revisão ou reparo técnico
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barra de Ações e Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Busca de texto */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar por patrimônio, S/N, modelo, responsável, local..."
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {buscaTexto && (
              <button
                type="button"
                onClick={() => setBuscaTexto('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => exportarInventarioParaExcel(equipamentosFiltrados)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all shadow-2xs"
              title="Exportar inventário filtrado para planilha Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => onAbrirEtiquetas()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all shadow-2xs"
              title="Gerar etiquetas com QR Code para os equipamentos listados"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Etiquetas QR</span>
            </button>

            <button
              type="button"
              onClick={onNovoEquipamento}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Equipamento</span>
            </button>
          </div>
        </div>

        {/* Dropdowns de Filtro */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </span>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:bg-white"
          >
            <option value="todos">Todos os Tipos</option>
            {tiposDisponiveis.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filtroLocalizacao}
            onChange={(e) => setFiltroLocalizacao(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:bg-white"
          >
            <option value="todas">Todas as Localizações</option>
            {localizacoesDisponiveis.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:bg-white"
          >
            <option value="todos">Todos os Status</option>
            <option value="Em Uso">Em Uso</option>
            <option value="Disponível / Estoque">Disponível / Estoque</option>
            <option value="Em Manutenção">Em Manutenção</option>
            <option value="Baixado / Sucateado">Baixado / Sucateado</option>
          </select>

          {temFiltroAtivo && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 ml-auto text-xs"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 3. Tabela de Equipamentos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Patrimônio</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Marca & Modelo</th>
                <th className="py-3 px-4 text-center">Qtd / Estoque</th>
                <th className="py-3 px-4">Nº de Série (S/N)</th>
                <th className="py-3 px-4">Localização</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {equipamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Laptop className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-slate-600">
                      Nenhum equipamento encontrado
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {temFiltroAtivo
                        ? 'Tente ajustar os filtros de busca acima.'
                        : 'Comece cadastrando o primeiro equipamento de T.I.'}
                    </p>
                    {temFiltroAtivo ? (
                      <button
                        type="button"
                        onClick={limparFiltros}
                        className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Limpar todos os filtros
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNovoEquipamento}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar Equipamento</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                equipamentosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Patrimônio */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {item.patrimonio}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.tipo}
                    </td>

                    {/* Marca e Modelo */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.marca} {item.modelo}</div>
                      {item.especificacoes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.especificacoes}
                        </div>
                      )}
                      {item.compra_id && comprasMap.get(item.compra_id) && (() => {
                        const compraVinculada = comprasMap.get(item.compra_id)!;
                        return (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                              title={`Aquisição em ${formatDate(compraVinculada.data_compra)} • ${formatCurrency(compraVinculada.valor)}`}
                            >
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>{compraVinculada.codigo_ti || 'NF vinculada'} • {compraVinculada.fornecedor}</span>
                            </span>
                            {compraVinculada.link_nf && (
                              <a
                                href={compraVinculada.link_nf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                title={compraVinculada.nome_arquivo_nf || 'Visualizar Comprovante / NF'}
                              >
                                <span>Ver NF</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Qtd / Estoque com Botão Usar 1 */}
                    <td className="py-3.5 px-4 text-center">
                      {(() => {
                        const qtdAtual = extrairQuantidadeEquipamento(item);
                        return (
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                                qtdAtual > 1
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : qtdAtual === 1
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                              title={`${qtdAtual} unidades registradas`}
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span>{qtdAtual} {qtdAtual === 1 ? 'un' : 'unidades'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleAbrirModalUsar(item)}
                              disabled={qtdAtual <= 0}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                              title="Usar 1 unidade deste produto / dar baixa no estoque"
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span>Usar 1</span>
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    {/* S/N */}
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.numero_serie || '—'}
                    </td>

                    {/* Localização */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.localizacao}</span>
                      </span>
                    </td>

                    {/* Responsável */}
                    <td className="py-3.5 px-4">
                      {item.responsavel ? (
                        <div>
                          <div className="inline-flex items-center gap-1 font-medium text-slate-900">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{item.responsavel}</span>
                          </div>
                          {item.funcao_responsavel && (
                            <div className="text-[11px] text-slate-400">
                              {item.funcao_responsavel}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Livre / Setor</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        {/* Gerar Termo */}
                        <button
                          type="button"
                          onClick={() => onAbrirTermo(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Gerar Termo de Responsabilidade / Cautela oficial do Ágape"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Etiqueta individual */}
                        <button
                          type="button"
                          onClick={() => onAbrirEtiquetas(item)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Imprimir etiqueta individual com QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => onEditarEquipamento(item)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar dados do equipamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => setEquipamentoParaExcluir(item)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir equipamento"
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

        {/* Rodapé da Tabela */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Exibindo <strong>{equipamentosFiltrados.length}</strong> de <strong>{equipamentos.length}</strong> equipamentos
          </div>
          <div className="flex items-center gap-3">
            <span>
              Em Uso: <strong className="text-emerald-600">{stats.emUso}</strong>
            </span>
            <span>•</span>
            <span>
              Estoque: <strong className="text-blue-600">{stats.estoque}</strong>
            </span>
            <span>•</span>
            <span>
              Manutenção: <strong className="text-amber-600">{stats.manutencao}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {equipamentoParaExcluir && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Equipamento</h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão patrimonial</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Tem certeza que deseja remover o equipamento{' '}
              <strong>{equipamentoParaExcluir.patrimonio} ({equipamentoParaExcluir.marca} {equipamentoParaExcluir.modelo})</strong>?
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEquipamentoParaExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Excluir Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Uso / Retirada do Estoque */}
      {equipamentoParaUsar && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                  <MinusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registrar Uso / Retirada do Estoque
                  </h3>
                  <p className="text-xs text-slate-500">
                    {equipamentoParaUsar.patrimonio} • {equipamentoParaUsar.marca} {equipamentoParaUsar.modelo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEquipamentoParaUsar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Painel Visual de Saldo */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-950 block">Estoque Atual:</span>
                <span className="text-xl font-bold font-mono text-indigo-700">
                  {extrairQuantidadeEquipamento(equipamentoParaUsar)} unidades
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 block">Novo Saldo Após Uso:</span>
                <span className="text-xl font-bold font-mono text-emerald-600">
                  {Math.max(0, extrairQuantidadeEquipamento(equipamentoParaUsar) - qtdParaUsar)} unidades
                </span>
              </div>
            </div>

            {/* Campos de Destino e Responsável */}
            <div className="space-y-3 mb-5 text-xs text-slate-700">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantidade a retirar:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQtdParaUsar((prev) => Math.max(1, prev - 1))}
                    disabled={qtdParaUsar <= 1}
                    className="w-8 h-8 rounded-lg border border-slate-300 bg-white font-bold flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-mono font-bold text-sm text-indigo-700">
                    {qtdParaUsar}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQtdParaUsar((prev) =>
                        Math.min(extrairQuantidadeEquipamento(equipamentoParaUsar), prev + 1)
                      )
                    }
                    disabled={qtdParaUsar >= extrairQuantidadeEquipamento(equipamentoParaUsar)}
                    className="w-8 h-8 rounded-lg border border-slate-300 bg-white font-bold flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-slate-400 text-[11px] ml-2">unidade(s)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quem está utilizando / retirando?
                </label>
                <input
                  type="text"
                  value={responsavelUso}
                  onChange={(e) => setResponsavelUso(e.target.value)}
                  placeholder="Ex: Nome do Colaborador, Professor, Coordenação..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Localização / Sala de Destino:
                </label>
                <input
                  type="text"
                  list="loc-uso-list"
                  value={localUso}
                  onChange={(e) => setLocalUso(e.target.value)}
                  placeholder="Ex: Secretaria, Recepção, Laboratório..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <datalist id="loc-uso-list">
                  {DEFAULT_LOCALIZACOES.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo / Observação (Opcional):
                </label>
                <input
                  type="text"
                  value={motivoUso}
                  onChange={(e) => setMotivoUso(e.target.value)}
                  placeholder="Ex: Substituição de cabo danificado, instalação em PC..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmarUso(true)}
                disabled={isUsando}
                className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                ⚡ Baixa Rápida (-1 un)
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEquipamentoParaUsar(null)}
                  disabled={isUsando}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmarUso(false)}
                  disabled={isUsando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUsando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MinusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar Retirada (-{qtdParaUsar} un)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
