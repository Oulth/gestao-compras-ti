import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PackagePlus,
  CheckCircle2,
  Loader2,
  FileText,
  Layers,
  ArrowRight,
  Sparkles,
  SkipForward,
  Check,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Compra, Equipamento, EquipamentoInput, StatusEquipamento } from '../types';
import { DEFAULT_TIPOS_EQUIPAMENTO, DEFAULT_LOCALIZACOES } from '../services/equipamentos';
import { formatCurrency, formatDate, parseMoedaParaNumero } from '../utils/formatters';

export interface ItemExtraido {
  indice: number;
  textoOriginal: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  tipoDetectado: string;
  marcaDetectada: string;
  modeloDetectado: string;
}

export interface ItemInventarioConfig {
  id: string;
  indiceOriginal: number;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  patrimonio: string;
  tipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  localizacao: string;
  status: StatusEquipamento;
  responsavel: string;
  funcaoResponsavel: string;
  acessorios: string;
  observacoes: string;
  incluir: boolean;
  salvo: boolean;
}

interface GerarEquipamentoCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  compra: Compra | null;
  onSalvar: (equipamento: EquipamentoInput) => Promise<void>;
  onSalvarLote?: (equipamentos: EquipamentoInput[]) => Promise<void>;
  proximoPatrimonioSugerido: string;
  equipamentosExistentes?: Equipamento[];
}

/**
 * Tenta inferir o tipo do equipamento a partir do texto do produto
 */
function inferirTipo(texto: string): string {
  const t = texto.toLowerCase();
  if (t.includes('termica') || t.includes('impressora') || t.includes('impr') || t.includes('toner') || t.includes('cartucho')) {
    return 'Impressora / Multifuncional';
  }
  if (t.includes('notebook') || t.includes('laptop') || t.includes('macbook')) {
    return 'Notebook';
  }
  if (t.includes('computador') || t.includes('desktop') || t.includes('pc ') || t.includes('cpu') || t.includes('i5') || t.includes('i7')) {
    return 'Desktop (Gabinete/PC)';
  }
  if (t.includes('monitor') || t.includes('display') || t.includes('tela') || t.includes('led')) {
    return 'Monitor';
  }
  if (t.includes('switch') || t.includes('roteador') || t.includes('router') || t.includes('access point') || t.includes('poe')) {
    return 'Switch de Rede';
  }
  if (t.includes('servidor') || t.includes('server')) {
    return 'Servidor';
  }
  if (t.includes('nobreak') || t.includes('estabilizador') || t.includes('bivolt') || t.includes('tomada') || t.includes('filtro')) {
    return 'Nobreak / Estabilizador';
  }
  if (t.includes('cabo') || t.includes('adaptador') || t.includes('carreg') || t.includes('fonte') || t.includes('hdmi') || t.includes('usb') || t.includes('rj45') || t.includes('conector') || t.includes('teclado') || t.includes('mouse') || t.includes('headset')) {
    return 'Periférico / Acessório';
  }
  return 'Outro';
}

/**
 * Tenta inferir a marca a partir do texto do produto
 */
function inferirMarca(texto: string, fornecedor?: string): string {
  const t = `${texto} ${fornecedor || ''}`.toLowerCase();
  const marcas = [
    { termo: 'elgin', nome: 'Elgin' },
    { termo: 'dell', nome: 'Dell' },
    { termo: 'lenovo', nome: 'Lenovo' },
    { termo: 'hp', nome: 'HP' },
    { termo: 'samsung', nome: 'Samsung' },
    { termo: 'lg', nome: 'LG' },
    { termo: 'tp-link', nome: 'TP-Link' },
    { termo: 'tplink', nome: 'TP-Link' },
    { termo: 'intelbras', nome: 'Intelbras' },
    { termo: 'epson', nome: 'Epson' },
    { termo: 'logitech', nome: 'Logitech' },
    { termo: 'kingston', nome: 'Kingston' },
    { termo: 'sandisk', nome: 'SanDisk' },
    { termo: 'cisco', nome: 'Cisco' },
    { termo: 'ubiquiti', nome: 'Ubiquiti' },
    { termo: 'mikrotik', nome: 'Mikrotik' },
    { termo: 'c3tech', nome: 'C3Tech' },
    { termo: 'get', nome: 'GET' },
  ];

  for (const m of marcas) {
    if (t.includes(m.termo)) return m.nome;
  }
  return '';
}

/**
 * Gera sequência numérica segura de patrimônios garantindo não colidir com códigos já cadastrados
 */
function gerarSequenciaPatrimonios(
  baseSugerida: string,
  quantidade: number,
  existentes: string[] = []
): string[] {
  const existentesSet = new Set(existentes.map((e) => e.toUpperCase().trim()));

  const match = baseSugerida.match(/^(.*?)(\d+)$/);
  const prefix = match ? match[1] : 'PAT-';
  let numAtual = match ? parseInt(match[2], 10) : 1;
  const padLength = match ? match[2].length : 3;

  const resultado: string[] = [];
  while (resultado.length < quantidade) {
    const formatado = `${prefix}${String(numAtual).padStart(padLength, '0')}`;
    if (!existentesSet.has(formatado)) {
      resultado.push(formatado);
      existentesSet.add(formatado);
    }
    numAtual++;
  }

  return resultado;
}

export const GerarEquipamentoCompraModal: React.FC<GerarEquipamentoCompraModalProps> = ({
  isOpen,
  onClose,
  compra,
  onSalvar,
  onSalvarLote,
  proximoPatrimonioSugerido,
  equipamentosExistentes = [],
}) => {
  // Extrai lista detalhada de itens da descrição da compra
  const itensExtraidos = useMemo<ItemExtraido[]>(() => {
    if (!compra?.descricao) return [];

    const linhas = compra.descricao
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const lista: ItemExtraido[] = [];

    linhas.forEach((linha, idx) => {
      // Exemplo de linha: • 1x IMP TERMICA ELGIN USB MP4200 HS [R$ 796,00]
      const limpa = linha.replace(/^•\s*/, '').trim();

      // Extrai quantidade se houver (ex: 12x)
      const matchQtd = limpa.match(/^(\d+(?:[\.,]\d+)?)x\s+(.+)$/i);
      const qtd = matchQtd ? parseFloat(matchQtd[1].replace(',', '.')) : 1;
      const restoSemQtd = matchQtd ? matchQtd[2] : limpa;

      // Extrai valor se houver (ex: [R$ 754,29])
      const matchValor = restoSemQtd.match(/\[R\$\s*([\d\.\,]+)\]/i);
      let valorTotal = compra.valor;
      if (matchValor) {
        valorTotal = parseMoedaParaNumero(matchValor[1]);
      }
      const valorUnit = qtd > 0 ? valorTotal / qtd : valorTotal;

      const nomeProduto = restoSemQtd.replace(/\[R\$\s*[\d\.\,]+\]/i, '').replace(/^\*+/, '').trim();

      const tipo = inferirTipo(nomeProduto);
      const marca = inferirMarca(nomeProduto, compra.fornecedor);

      let modelo = nomeProduto;
      if (marca && modelo.toLowerCase().includes(marca.toLowerCase())) {
        modelo = modelo.replace(new RegExp(marca, 'gi'), '').trim();
      }

      lista.push({
        indice: idx,
        textoOriginal: linha,
        nome: nomeProduto || 'Equipamento adquirido',
        quantidade: Math.round(qtd) || 1,
        valorUnitario: Number(valorUnit.toFixed(2)),
        valorTotal: Number(valorTotal.toFixed(2)),
        tipoDetectado: tipo,
        marcaDetectada: marca || 'Genérica',
        modeloDetectado: modelo.replace(/\s+/g, ' ').trim() || nomeProduto,
      });
    });

    if (lista.length === 0) {
      lista.push({
        indice: 0,
        textoOriginal: compra.descricao,
        nome: compra.descricao,
        quantidade: 1,
        valorUnitario: compra.valor,
        valorTotal: compra.valor,
        tipoDetectado: inferirTipo(compra.descricao),
        marcaDetectada: inferirMarca(compra.descricao, compra.fornecedor) || 'Genérica',
        modeloDetectado: compra.descricao,
      });
    }

    return lista;
  }, [compra]);

  // Lista de itens do inventário configurados para tombamento
  const [itensConfig, setItensConfig] = useState<ItemInventarioConfig[]>([]);

  // Aba ativa de exibição: 'lote' (todos de uma vez) ou 'passo_a_passo' (um por um)
  const [modoVisualizacao, setModoVisualizacao] = useState<'lote' | 'passo_a_passo'>('lote');

  // Índice do item atualmente selecionado no modo passo a passo
  const [itemAtualIndex, setItemAtualIndex] = useState<number>(0);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Inicializa a configuração dos itens com números de patrimônio sequenciais ao abrir o modal
  useEffect(() => {
    if (!isOpen || !compra || itensExtraidos.length === 0) return;

    const codigosExistentes = equipamentosExistentes.map((e) => e.patrimonio);
    const patrimoniosSequenciais = gerarSequenciaPatrimonios(
      proximoPatrimonioSugerido || 'PAT-001',
      itensExtraidos.length,
      codigosExistentes
    );

    const configs: ItemInventarioConfig[] = itensExtraidos.map((item, idx) => ({
      id: `item-${idx}`,
      indiceOriginal: idx,
      nome: item.nome,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      patrimonio: patrimoniosSequenciais[idx] || `PAT-${String(idx + 1).padStart(3, '0')}`,
      tipo: item.tipoDetectado,
      marca: item.marcaDetectada,
      modelo: item.modeloDetectado,
      numeroSerie: '',
      localizacao: DEFAULT_LOCALIZACOES[0] || 'CPD / Servidores',
      status: 'Disponível / Estoque',
      responsavel: '',
      funcaoResponsavel: '',
      acessorios: item.quantidade > 1 ? `Lote com ${item.quantidade} unidades` : 'Cabos / Acessórios inclusos',
      observacoes: `Vinculado à Compra ${compra.codigo_ti || 'S/N'} (${compra.fornecedor}) de ${formatDate(compra.data_compra)}.`,
      incluir: true,
      salvo: false,
    }));

    setItensConfig(configs);
    setItemAtualIndex(0);

    // Se houver apenas 1 item, abre diretamente no modo passo a passo
    if (itensExtraidos.length === 1) {
      setModoVisualizacao('passo_a_passo');
    } else {
      setModoVisualizacao('lote');
    }
  }, [isOpen, compra, itensExtraidos, proximoPatrimonioSugerido, equipamentosExistentes]);

  if (!isOpen || !compra) return null;

  // Item ativo no modo passo a passo
  const itemAtivo = itensConfig[itemAtualIndex] || itensConfig[0];

  // Quantidade de itens selecionados e pendentes
  const itensParaSalvar = itensConfig.filter((item) => item.incluir && !item.salvo);
  const totalSalvos = itensConfig.filter((item) => item.salvo).length;

  // Atualiza um campo de um item específico na lista
  const handleAtualizarItem = (idx: number, campo: keyof ItemInventarioConfig, valor: any) => {
    setItensConfig((prev) => {
      const novos = [...prev];
      if (novos[idx]) {
        novos[idx] = { ...novos[idx], [campo]: valor };
      }
      return novos;
    });
  };

  // Salva TODOS os itens marcados de uma só vez (Lote)
  const handleSalvarTodosLote = async () => {
    if (itensParaSalvar.length === 0) {
      toast.info('Nenhum item pendente selecionado para tombamento.');
      return;
    }

    setIsSaving(true);
    try {
      const payloads: EquipamentoInput[] = itensParaSalvar.map((item) => ({
        patrimonio: item.patrimonio.trim().toUpperCase(),
        tipo: item.tipo.trim() || 'Outro',
        marca: item.marca.trim() || 'Genérica',
        modelo: item.modelo.trim() || item.nome,
        numero_serie: item.numeroSerie.trim() || null,
        localizacao: item.localizacao.trim() || 'CPD / Servidores',
        status: item.status,
        responsavel: item.responsavel.trim() || null,
        funcao_responsavel: item.funcaoResponsavel.trim() || null,
        compra_id: compra.id,
        data_aquisicao: compra.data_compra || new Date().toISOString().split('T')[0],
        valor_estimado: item.valorUnitario,
        especificacoes: `Item da Nota Fiscal ${compra.codigo_ti || 'S/N'} (${compra.fornecedor}) - Qtd: ${item.quantidade}x`,
        acessorios: item.acessorios.trim() || null,
        observacoes: item.observacoes.trim() || null,
      }));

      if (onSalvarLote) {
        await onSalvarLote(payloads);
      } else {
        for (const p of payloads) {
          await onSalvar(p);
        }
      }

      toast.success(
        `🎉 ${payloads.length} ${payloads.length === 1 ? 'item tombado' : 'itens tombados'} no Inventário com sucesso!`
      );
      onClose();
    } catch (err: any) {
      console.error('Erro ao cadastrar lote de equipamentos:', err);
      toast.error(err.message || 'Falha ao cadastrar equipamentos no inventário.');
    } finally {
      setIsSaving(false);
    }
  };

  // Salva o item atual no modo Passo a Passo e avança para o próximo
  const handleSalvarItemAtualEAvancar = async () => {
    if (!itemAtivo) return;

    if (!itemAtivo.patrimonio.trim()) {
      toast.error('Informe o código de patrimônio deste item.');
      return;
    }
    if (!itemAtivo.marca.trim()) {
      toast.error('Informe a marca do equipamento.');
      return;
    }
    if (!itemAtivo.modelo.trim()) {
      toast.error('Informe o modelo do equipamento.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: EquipamentoInput = {
        patrimonio: itemAtivo.patrimonio.trim().toUpperCase(),
        tipo: itemAtivo.tipo.trim() || 'Outro',
        marca: itemAtivo.marca.trim(),
        modelo: itemAtivo.modelo.trim(),
        numero_serie: itemAtivo.numeroSerie.trim() || null,
        localizacao: itemAtivo.localizacao.trim() || 'CPD / Servidores',
        status: itemAtivo.status,
        responsavel: itemAtivo.responsavel.trim() || null,
        funcao_responsavel: itemAtivo.funcaoResponsavel.trim() || null,
        compra_id: compra.id,
        data_aquisicao: compra.data_compra || new Date().toISOString().split('T')[0],
        valor_estimado: itemAtivo.valorUnitario,
        especificacoes: `Item ${itemAtualIndex + 1} de ${itensConfig.length} da NF ${compra.codigo_ti || 'S/N'} (${compra.fornecedor}) - Qtd: ${itemAtivo.quantidade}x`,
        acessorios: itemAtivo.acessorios.trim() || null,
        observacoes: itemAtivo.observacoes.trim() || null,
      };

      await onSalvar(payload);

      // Marca o item como salvo
      handleAtualizarItem(itemAtualIndex, 'salvo', true);

      toast.success(
        `✅ Item ${itemAtualIndex + 1} (${payload.patrimonio} - ${payload.marca} ${payload.modelo}) cadastrado no Inventário!`
      );

      // Se ainda houver itens seguintes na lista, avança para o próximo
      if (itemAtualIndex < itensConfig.length - 1) {
        setItemAtualIndex((prev) => prev + 1);
      } else {
        // Se era o último item, fecha o modal
        toast.success('🎉 Todos os itens da Nota Fiscal foram tombados no Inventário com sucesso!');
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao salvar equipamento individual:', err);
      toast.error(err.message || 'Falha ao cadastrar equipamento.');
    } finally {
      setIsSaving(false);
    }
  };

  // Pula o item atual sem cadastrar no inventário
  const handlePularItemAtual = () => {
    handleAtualizarItem(itemAtualIndex, 'incluir', false);
    toast.info(`Item ${itemAtualIndex + 1} ignorado.`);
    if (itemAtualIndex < itensConfig.length - 1) {
      setItemAtualIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Tombar Produtos no Inventário de Equipamentos
                </h2>
                {compra.codigo_ti && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                    {compra.codigo_ti}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {compra.fornecedor} • {itensConfig.length} {itensConfig.length === 1 ? 'item detectado' : 'itens detectados'} • Total: {formatCurrency(compra.valor)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Modo: Cadastrar Todos de Uma Vez (Lote) vs Passo a Passo (Item por Item) */}
        {itensConfig.length > 1 && (
          <div className="bg-slate-100/80 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('lote')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modoVisualizacao === 'lote'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cadastrar Todos de Uma Vez ({itensConfig.length} itens)</span>
              </button>

              <button
                type="button"
                onClick={() => setModoVisualizacao('passo_a_passo')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modoVisualizacao === 'passo_a_passo'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Revisar Item por Item ({itemAtualIndex + 1}/{itensConfig.length})</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <Check className="w-3.5 h-3.5" /> {totalSalvos} tombados
              </span>
              <span>•</span>
              <span className="text-slate-500">
                {itensParaSalvar.length} pendentes
              </span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODO 1: CADASTRO DE TODOS OS ITENS DE UMA VEZ (LOTE)          */}
        {/* ============================================================ */}
        {modoVisualizacao === 'lote' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1 text-slate-800">
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950">
                <p className="font-bold">
                  Tombamento Inteligente em Lote: {itensConfig.length} produtos identificados nesta Nota Fiscal.
                </p>
                <p className="text-indigo-800/90 mt-0.5">
                  Cada produto foi associado a um código de patrimônio sequencial automático. Você pode ajustar qualquer dado diretamente antes de confirmar.
                </p>
              </div>
            </div>

            {/* Lista dos Itens em Cards/Tabela Editável */}
            <div className="space-y-3">
              {itensConfig.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.salvo
                      ? 'border-emerald-300 bg-emerald-50/40 opacity-75'
                      : item.incluir
                      ? 'border-slate-200 bg-white shadow-xs hover:border-indigo-300'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      {!item.salvo && (
                        <input
                          type="checkbox"
                          checked={item.incluir}
                          onChange={(e) => handleAtualizarItem(idx, 'incluir', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                      )}
                      {item.salvo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Tombado
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {item.nome}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Qtd: <strong>{item.quantidade}x</strong></span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold font-mono">
                            Unitário: {formatCurrency(item.valorUnitario)}
                          </span>
                          <span>•</span>
                          <span className="text-slate-600 font-mono">
                            Total: {formatCurrency(item.valorTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          Patrimônio:
                        </label>
                        <input
                          type="text"
                          value={item.patrimonio}
                          disabled={item.salvo}
                          onChange={(e) => handleAtualizarItem(idx, 'patrimonio', e.target.value.toUpperCase())}
                          className="w-28 h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setItemAtualIndex(idx);
                          setModoVisualizacao('passo_a_passo');
                        }}
                        className="p-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar detalhes completos deste item"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Campos Rápidos do Item */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Tipo
                      </label>
                      <input
                        type="text"
                        list={`tipos-lista-${idx}`}
                        value={item.tipo}
                        disabled={item.salvo}
                        onChange={(e) => handleAtualizarItem(idx, 'tipo', e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <datalist id={`tipos-lista-${idx}`}>
                        {DEFAULT_TIPOS_EQUIPAMENTO.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={item.marca}
                        disabled={item.salvo}
                        onChange={(e) => handleAtualizarItem(idx, 'marca', e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Modelo
                      </label>
                      <input
                        type="text"
                        value={item.modelo}
                        disabled={item.salvo}
                        onChange={(e) => handleAtualizarItem(idx, 'modelo', e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Localização / Setor
                      </label>
                      <select
                        value={item.localizacao}
                        disabled={item.salvo}
                        onChange={(e) => handleAtualizarItem(idx, 'localizacao', e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {DEFAULT_LOCALIZACOES.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé de Ações do Modo em Lote */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setModoVisualizacao('passo_a_passo')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Prefere revisar e preencher número de série item por item? Clique aqui ➜</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={handleSalvarTodosLote}
                  disabled={isSaving || itensParaSalvar.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Cadastrando {itensParaSalvar.length} itens no Inventário...</span>
                    </>
                  ) : (
                    <>
                      <Boxes className="w-4 h-4" />
                      <span>
                        Cadastrar Todos os {itensParaSalvar.length} Itens no Inventário
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODO 2: PASSO A PASSO (ITEM POR ITEM)                        */}
        {/* ============================================================ */}
        {modoVisualizacao === 'passo_a_passo' && itemAtivo && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSalvarItemAtualEAvancar();
            }}
            className="overflow-y-auto px-6 py-5 space-y-5 flex-1 text-slate-800"
          >
            {/* Stepper Horizontal com os Itens da Nota */}
            {itensConfig.length > 1 && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    Processando Item {itemAtualIndex + 1} de {itensConfig.length}
                  </span>
                  <span className="text-slate-500 font-normal">
                    {totalSalvos} de {itensConfig.length} tombados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                  {itensConfig.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setItemAtualIndex(idx)}
                      className={`px-2 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer flex flex-col gap-0.5 ${
                        itemAtualIndex === idx
                          ? 'border-indigo-600 bg-white font-bold text-indigo-950 shadow-xs ring-2 ring-indigo-500/20'
                          : item.salvo
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center justify-between font-mono">
                        <span>#{idx + 1}</span>
                        {item.salvo ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <span className="text-[10px] text-indigo-600">{item.patrimonio}</span>
                        )}
                      </span>
                      <span className="truncate block">{item.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Banner do Item em Foco */}
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Produto {itemAtualIndex + 1} de {itensConfig.length}:
                </span>
                <h3 className="text-sm font-bold text-indigo-950">
                  {itemAtivo.nome}
                </h3>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-emerald-700 block">
                  {formatCurrency(itemAtivo.valorUnitario)} un
                </span>
                <span className="text-[11px] text-slate-500">
                  Quantidade: {itemAtivo.quantidade}x
                </span>
              </div>
            </div>

            {/* Linha 1: Patrimônio, Tipo e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nº de Patrimônio <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemAtivo.patrimonio}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'patrimonio', e.target.value.toUpperCase())}
                  placeholder="Ex: PAT-001"
                  className="w-full h-10 px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 bg-white text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo do Equipamento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="tipos-equipamento-passo"
                  value={itemAtivo.tipo}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'tipo', e.target.value)}
                  placeholder="Selecione ou digite o tipo"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  required
                />
                <datalist id="tipos-equipamento-passo">
                  {DEFAULT_TIPOS_EQUIPAMENTO.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Atual <span className="text-rose-500">*</span>
                </label>
                <select
                  value={itemAtivo.status}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'status', e.target.value as StatusEquipamento)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                >
                  <option value="Em Uso">Em Uso</option>
                  <option value="Disponível / Estoque">Disponível / Estoque</option>
                  <option value="Em Manutenção">Em Manutenção</option>
                  <option value="Baixado / Sucateado">Baixado / Sucateado</option>
                </select>
              </div>
            </div>

            {/* Linha 2: Marca, Modelo e Número de Série */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marca / Fabricante <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemAtivo.marca}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'marca', e.target.value)}
                  placeholder="Ex: Elgin, Dell, Lenovo"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modelo Detalhado <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemAtivo.modelo}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'modelo', e.target.value)}
                  placeholder="Ex: MP4200 HS, Inspiron 15"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nº de Série (S/N)
                </label>
                <input
                  type="text"
                  value={itemAtivo.numeroSerie}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'numeroSerie', e.target.value)}
                  placeholder="Opcional: Nº de série do item"
                  className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            {/* Linha 3: Localização, Responsável e Função */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Localização / Sala
                </label>
                <input
                  type="text"
                  list="localizacoes-passo"
                  value={itemAtivo.localizacao}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'localizacao', e.target.value)}
                  placeholder="Ex: CPD / Servidores"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
                <datalist id="localizacoes-passo">
                  {DEFAULT_LOCALIZACOES.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsável Direto
                </label>
                <input
                  type="text"
                  value={itemAtivo.responsavel}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'responsavel', e.target.value)}
                  placeholder="Ex: Nome do Colaborador / Professor"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cargo / Função
                </label>
                <input
                  type="text"
                  value={itemAtivo.funcaoResponsavel}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'funcaoResponsavel', e.target.value)}
                  placeholder="Ex: Coordenador, Suporte T.I"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            {/* Linha 4: Valor Unitário e Acessórios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor de Aquisição (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={itemAtivo.valorUnitario}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'valorUnitario', parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Acessórios Inclusos
                </label>
                <input
                  type="text"
                  value={itemAtivo.acessorios}
                  onChange={(e) => handleAtualizarItem(itemAtualIndex, 'acessorios', e.target.value)}
                  placeholder="Ex: Cabos, fonte de alimentação, adaptador..."
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            {/* Vínculo Fiscal */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Vínculo Automático: <strong>{compra.codigo_ti || 'Compra registrada'}</strong> • Fornecedor: <strong>{compra.fornecedor}</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Data: {formatDate(compra.data_compra)}
              </span>
            </div>

            {/* Rodapé de Ações do Modo Passo a Passo */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                {itensConfig.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePularItemAtual}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Pular este item</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {itensConfig.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('lote')}
                    disabled={isSaving}
                    className="px-3 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Salvar Todos de Uma Vez ➜</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Salvando...</span>
                    </>
                  ) : itemAtualIndex < itensConfig.length - 1 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Salvar e Ir para o Próximo Item ({itemAtualIndex + 2} de {itensConfig.length}) ➜
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Finalizar Tombamento no Inventário ✅</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
