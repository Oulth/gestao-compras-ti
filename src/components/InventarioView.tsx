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
  PlusCircle,
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
  formatarLogEntradaEquipamento,
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

  // Modal de Ajuste de Estoque (Usar / Adicionar Unidades)
  const [equipamentoParaAjuste, setEquipamentoParaAjuste] = useState<Equipamento | null>(null);
  const [tipoAjuste, setTipoAjuste] = useState<'retirar' | 'adicionar'>('retirar');
  const [qtdAjuste, setQtdAjuste] = useState<number>(1);
  const [responsavelAjuste, setResponsavelAjuste] = useState<string>('');
  const [localAjuste, setLocalAjuste] = useState<string>('');
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');
  const [isSalvandoAjuste, setIsSalvandoAjuste] = useState<boolean>(false);

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

  // Abre o modal de ajuste de estoque (retirar ou adicionar)
  const handleAbrirModalAjuste = (item: Equipamento, tipo: 'retirar' | 'adicionar' = 'retirar') => {
    setEquipamentoParaAjuste(item);
    setTipoAjuste(tipo);
    setQtdAjuste(1);
    setResponsavelAjuste(item.responsavel || '');
    setLocalAjuste(item.localizacao || DEFAULT_LOCALIZACOES[0] || 'CPD / Servidores');
    setMotivoAjuste('');
  };

  // Executa o ajuste de estoque (retirada ou entrada)
  const handleConfirmarAjuste = async (rapido = false) => {
    if (!equipamentoParaAjuste) return;

    const qtdAtual = extrairQuantidadeEquipamento(equipamentoParaAjuste);
    const qtdOperacao = rapido ? 1 : Math.max(1, qtdAjuste);

    setIsSalvandoAjuste(true);
    try {
      let novaQtd = qtdAtual;
      let novoHistorico = equipamentoParaAjuste.observacoes;
      let novoStatus = equipamentoParaAjuste.status;

      if (tipoAjuste === 'retirar') {
        const qtdRetirar = Math.min(qtdOperacao, qtdAtual);
        novaQtd = Math.max(0, qtdAtual - qtdRetirar);
        novoHistorico = formatarLogUsoEquipamento(
          equipamentoParaAjuste.observacoes,
          qtdRetirar,
          novaQtd,
          rapido ? 'Equipe T.I (Baixa Rápida)' : responsavelAjuste,
          rapido ? equipamentoParaAjuste.localizacao : localAjuste,
          rapido ? 'Uso rotineiro imediato' : motivoAjuste
        );

        if (novaQtd === 0 && novoStatus === 'Disponível / Estoque') {
          novoStatus = 'Em Uso';
        }
      } else {
        // 'adicionar'
        novaQtd = qtdAtual + qtdOperacao;
        novoHistorico = formatarLogEntradaEquipamento(
          equipamentoParaAjuste.observacoes,
          qtdOperacao,
          novaQtd,
          rapido ? 'Equipe T.I (Entrada Rápida)' : responsavelAjuste,
          rapido ? 'Reposição rápida de estoque' : motivoAjuste
        );

        // Se estava zerado ou baixado, reativa como Disponível / Estoque
        if (qtdAtual === 0 || novoStatus === 'Baixado / Sucateado') {
          novoStatus = 'Disponível / Estoque';
        }
      }

      const novosSpecs = atualizarTextoComQuantidade(equipamentoParaAjuste.especificacoes, novaQtd);

      const payloadAtualizado: Equipamento = {
        ...equipamentoParaAjuste,
        especificacoes: novosSpecs,
        observacoes: novoHistorico,
        status: novoStatus,
        responsavel: rapido
          ? equipamentoParaAjuste.responsavel
          : responsavelAjuste.trim() || equipamentoParaAjuste.responsavel,
        localizacao: rapido
          ? equipamentoParaAjuste.localizacao
          : localAjuste.trim() || equipamentoParaAjuste.localizacao,
      };

      if (onSalvarEquipamento) {
        await onSalvarEquipamento(payloadAtualizado);
      }

      if (tipoAjuste === 'retirar') {
        toast.success(
          `✅ ${qtdOperacao} un de ${equipamentoParaAjuste.marca} ${equipamentoParaAjuste.modelo} utilizada. Novo saldo: ${novaQtd} un.`
        );
      } else {
        toast.success(
          `✅ +${qtdOperacao} un adicionada ao estoque de ${equipamentoParaAjuste.marca} ${equipamentoParaAjuste.modelo}! Novo saldo: ${novaQtd} un.`
        );
      }

      setEquipamentoParaAjuste(null);
    } catch (err: any) {
      console.error('Erro ao registrar ajuste de estoque:', err);
      toast.error(err.message || 'Falha ao atualizar estoque do item.');
    } finally {
      setIsSalvandoAjuste(false);
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

                    {/* Qtd / Estoque com Botões Usar 1 e +1 un */}
                    <td className="py-3.5 px-4 text-center">
                      {(() => {
                        const qtdAtual = extrairQuantidadeEquipamento(item);
                        return (
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
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

                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-xs p-0.5">
                              <button
                                type="button"
                                onClick={() => handleAbrirModalAjuste(item, 'retirar')}
                                disabled={qtdAtual <= 0}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 hover:text-white hover:bg-rose-600 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Usar 1 unidade / registrar saída do estoque"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                <span>Usar 1</span>
                              </button>
                              <span className="w-px h-3.5 bg-slate-200 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => handleAbrirModalAjuste(item, 'adicionar')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:text-white hover:bg-emerald-600 rounded transition-all cursor-pointer"
                                title="Aumentar / adicionar unidades ao estoque"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+1 un</span>
                              </button>
                            </div>
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

      {/* Modal de Ajuste de Estoque (Usar / Adicionar Unidades) */}
      {equipamentoParaAjuste && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                    tipoAjuste === 'retirar'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {tipoAjuste === 'retirar' ? (
                    <MinusCircle className="w-5 h-5" />
                  ) : (
                    <PlusCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {tipoAjuste === 'retirar'
                      ? 'Registrar Uso / Retirada do Estoque'
                      : 'Adicionar Unidades ao Estoque'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {equipamentoParaAjuste.patrimonio} • {equipamentoParaAjuste.marca} {equipamentoParaAjuste.modelo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEquipamentoParaAjuste(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador de Modo: Retirar vs Adicionar */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTipoAjuste('retirar')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  tipoAjuste === 'retirar'
                    ? 'bg-white text-rose-700 shadow-xs border border-rose-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                <span>Usar / Retirar (-)</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoAjuste('adicionar')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  tipoAjuste === 'adicionar'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Adicionar ao Estoque (+)</span>
              </button>
            </div>

            {/* Painel Visual de Saldo */}
            {(() => {
              const qtdAtual = extrairQuantidadeEquipamento(equipamentoParaAjuste);
              const novoSaldo =
                tipoAjuste === 'retirar'
                  ? Math.max(0, qtdAtual - qtdAjuste)
                  : qtdAtual + qtdAjuste;

              return (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between mb-4 ${
                    tipoAjuste === 'retirar'
                      ? 'border-rose-100 bg-rose-50/40'
                      : 'border-emerald-100 bg-emerald-50/40'
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-600 block">Estoque Atual:</span>
                    <span className="text-xl font-bold font-mono text-slate-800">
                      {qtdAtual} {qtdAtual === 1 ? 'unidade' : 'unidades'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-600 block">
                      {tipoAjuste === 'retirar' ? 'Novo Saldo Após Saída:' : 'Novo Saldo Após Entrada:'}
                    </span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        tipoAjuste === 'retirar' ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {novoSaldo} {novoSaldo === 1 ? 'unidade' : 'unidades'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Formulário com Campos */}
            <div className="space-y-3 mb-5 text-xs text-slate-700">
              {/* Quantidade */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {tipoAjuste === 'retirar' ? 'Quantidade a retirar:' : 'Quantidade a adicionar:'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQtdAjuste((prev) => Math.max(1, prev - 1))}
                    disabled={qtdAjuste <= 1}
                    className="w-9 h-9 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-base"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={tipoAjuste === 'retirar' ? extrairQuantidadeEquipamento(equipamentoParaAjuste) : 9999}
                    value={qtdAjuste}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (isNaN(v)) setQtdAjuste(1);
                      else if (tipoAjuste === 'retirar') {
                        setQtdAjuste(Math.max(1, Math.min(extrairQuantidadeEquipamento(equipamentoParaAjuste), v)));
                      } else {
                        setQtdAjuste(Math.max(1, v));
                      }
                    }}
                    className="w-16 h-9 text-center font-mono font-bold text-base text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tipoAjuste === 'retirar') {
                        setQtdAjuste((prev) =>
                          Math.min(extrairQuantidadeEquipamento(equipamentoParaAjuste), prev + 1)
                        );
                      } else {
                        setQtdAjuste((prev) => prev + 1);
                      }
                    }}
                    disabled={
                      tipoAjuste === 'retirar' &&
                      qtdAjuste >= extrairQuantidadeEquipamento(equipamentoParaAjuste)
                    }
                    className="w-9 h-9 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-base"
                  >
                    +
                  </button>
                  <span className="text-slate-400 text-xs ml-1">unidade(s)</span>
                </div>
              </div>

              {/* Responsável ou Origem */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {tipoAjuste === 'retirar'
                    ? 'Quem está utilizando / retirando?'
                    : 'Origem / Responsável pela entrada:'}
                </label>
                <input
                  type="text"
                  value={responsavelAjuste}
                  onChange={(e) => setResponsavelAjuste(e.target.value)}
                  placeholder={
                    tipoAjuste === 'retirar'
                      ? 'Ex: Nome do Colaborador, Professor, Coordenação...'
                      : 'Ex: Compra avulsa, Devolução de colaborador, Reposição Almoxarifado...'
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Localização / Sala */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {tipoAjuste === 'retirar'
                    ? 'Localização / Sala de Destino:'
                    : 'Localização de Armazenamento no Estoque:'}
                </label>
                <input
                  type="text"
                  list="loc-ajuste-list"
                  value={localAjuste}
                  onChange={(e) => setLocalAjuste(e.target.value)}
                  placeholder="Ex: Almoxarifado T.I, Sala dos Servidores, Secretaria..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <datalist id="loc-ajuste-list">
                  {DEFAULT_LOCALIZACOES.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>

              {/* Motivo */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo / Observação (Opcional):
                </label>
                <input
                  type="text"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder={
                    tipoAjuste === 'retirar'
                      ? 'Ex: Substituição de periférico danificado, instalação em PC...'
                      : 'Ex: Lote adicional recebido, devolução de equipamento...'
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmarAjuste(true)}
                disabled={isSalvandoAjuste || (tipoAjuste === 'retirar' && extrairQuantidadeEquipamento(equipamentoParaAjuste) <= 0)}
                className={`w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 ${
                  tipoAjuste === 'retirar'
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {tipoAjuste === 'retirar' ? '⚡ Baixa Rápida (-1 un)' : '⚡ Entrada Rápida (+1 un)'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEquipamentoParaAjuste(null)}
                  disabled={isSalvandoAjuste}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmarAjuste(false)}
                  disabled={isSalvandoAjuste || (tipoAjuste === 'retirar' && extrairQuantidadeEquipamento(equipamentoParaAjuste) <= 0)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 ${
                    tipoAjuste === 'retirar'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSalvandoAjuste ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : tipoAjuste === 'retirar' ? (
                    <MinusCircle className="w-3.5 h-3.5" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {tipoAjuste === 'retirar'
                      ? `Confirmar Retirada (-${qtdAjuste} un)`
                      : `Confirmar Entrada (+${qtdAjuste} un)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
