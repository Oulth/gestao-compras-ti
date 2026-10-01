import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PackagePlus,
  CheckCircle2,
  Loader2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Compra, EquipamentoInput, StatusEquipamento } from '../types';
import { DEFAULT_TIPOS_EQUIPAMENTO, DEFAULT_LOCALIZACOES } from '../services/equipamentos';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ItemExtraido {
  textoOriginal: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  tipoDetectado: string;
  marcaDetectada: string;
  modeloDetectado: string;
}

interface GerarEquipamentoCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  compra: Compra | null;
  onSalvar: (equipamento: EquipamentoInput) => Promise<void>;
  proximoPatrimonioSugerido: string;
}

/**
 * Tenta inferir o tipo do equipamento a partir do texto do produto
 */
function inferirTipo(texto: string): string {
  const t = texto.toLowerCase();
  if (t.includes('termica') || t.includes('impressora') || t.includes('impr') || t.includes('toner') || t.includes('cartucho')) {
    return 'Impressora / Térmica';
  }
  if (t.includes('notebook') || t.includes('laptop') || t.includes('macbook')) {
    return 'Notebook';
  }
  if (t.includes('computador') || t.includes('desktop') || t.includes('pc ') || t.includes('cpu')) {
    return 'Computador / Desktop';
  }
  if (t.includes('monitor') || t.includes('display') || t.includes('tela')) {
    return 'Monitor';
  }
  if (t.includes('switch') || t.includes('roteador') || t.includes('router') || t.includes('access point') || t.includes('poe')) {
    return 'Switch / Rede';
  }
  if (t.includes('servidor') || t.includes('server')) {
    return 'Servidor';
  }
  if (t.includes('cabo') || t.includes('adaptador') || t.includes('carreg') || t.includes('fonte') || t.includes('hdmi')) {
    return 'Acessório / Conectividade';
  }
  return 'Outro Equipamento';
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
    { termo: 'get', nome: 'GET' },
  ];

  for (const m of marcas) {
    if (t.includes(m.termo)) return m.nome;
  }
  return '';
}

export const GerarEquipamentoCompraModal: React.FC<GerarEquipamentoCompraModalProps> = ({
  isOpen,
  onClose,
  compra,
  onSalvar,
  proximoPatrimonioSugerido,
}) => {
  // Parsing de itens da descrição da compra
  const itensDisponiveis = useMemo<ItemExtraido[]>(() => {
    if (!compra?.descricao) return [];

    const linhas = compra.descricao
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const lista: ItemExtraido[] = [];

    for (const linha of linhas) {
      // Exemplo de linha: • 1x IMP TERMICA ELGIN USB MP4200 HS [R$ 796,00]
      const limpa = linha.replace(/^•\s*/, '').trim();

      // Extrai quantidade se houver (ex: 12x)
      const matchQtd = limpa.match(/^(\d+(?:[\.,]\d+)?)x\s+(.+)$/i);
      const qtd = matchQtd ? parseFloat(matchQtd[1].replace(',', '.')) : 1;
      const restoSemQtd = matchQtd ? matchQtd[2] : limpa;

      // Extrai valor se houver (ex: [R$ 754,29])
      const matchValor = restoSemQtd.match(/\[R\$\s*([\d\.\,]+)\]/i);
      const valorTotal = matchValor ? parseFloat(matchValor[1].replace(/\./g, '').replace(',', '.')) : compra.valor;
      const valorUnit = qtd > 0 ? valorTotal / qtd : valorTotal;

      const nomeProduto = restoSemQtd.replace(/\[R\$\s*[\d\.\,]+\]/i, '').replace(/^\*+/, '').trim();

      const tipo = inferirTipo(nomeProduto);
      const marca = inferirMarca(nomeProduto, compra.fornecedor);

      // Modelo: retira a marca do nome do produto se presente
      let modelo = nomeProduto;
      if (marca && modelo.toLowerCase().includes(marca.toLowerCase())) {
        modelo = modelo.replace(new RegExp(marca, 'gi'), '').trim();
      }

      lista.push({
        textoOriginal: linha,
        nome: nomeProduto || 'Equipamento adquirido',
        quantidade: Math.round(qtd) || 1,
        valorUnitario: Number(valorUnit.toFixed(2)),
        tipoDetectado: tipo,
        marcaDetectada: marca || 'Genérica / Não especificada',
        modeloDetectado: modelo.replace(/\s+/g, ' ').trim() || nomeProduto,
      });
    }

    // Se não encontrou formato de itens com bolinha, usa a descrição completa como 1 item
    if (lista.length === 0) {
      lista.push({
        textoOriginal: compra.descricao,
        nome: compra.descricao,
        quantidade: 1,
        valorUnitario: compra.valor,
        tipoDetectado: inferirTipo(compra.descricao),
        marcaDetectada: inferirMarca(compra.descricao, compra.fornecedor) || 'Genérica',
        modeloDetectado: compra.descricao,
      });
    }

    return lista;
  }, [compra]);

  const [itemSelecionadoIndex, setItemSelecionadoIndex] = useState<number>(0);

  // Estados dos campos do equipamento a ser cadastrado
  const [patrimonio, setPatrimonio] = useState<string>('');
  const [tipo, setTipo] = useState<string>('Computador / Desktop');
  const [marca, setMarca] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [numeroSerie, setNumeroSerie] = useState<string>('');
  const [localizacao, setLocalizacao] = useState<string>(DEFAULT_LOCALIZACOES[0] || 'CPD / Servidores');
  const [status, setStatus] = useState<StatusEquipamento>('Em Uso');
  const [responsavel, setResponsavel] = useState<string>('');
  const [funcaoResponsavel, setFuncaoResponsavel] = useState<string>('');
  const [valorEstimado, setValorEstimado] = useState<string>('');
  const [especificacoes, setEspecificacoes] = useState<string>('');
  const [acessorios, setAcessorios] = useState<string>('Fonte de alimentação / Cabos');
  const [observacoes, setObservacoes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sincroniza campos quando o modal abre ou o item selecionado muda
  useEffect(() => {
    if (!isOpen || !compra) return;

    setPatrimonio(proximoPatrimonioSugerido || 'PAT-001');

    const item = itensDisponiveis[itemSelecionadoIndex] || itensDisponiveis[0];
    if (item) {
      setTipo(item.tipoDetectado);
      setMarca(item.marcaDetectada);
      setModelo(item.modeloDetectado);
      setValorEstimado(String(item.valorUnitario || ''));
      setEspecificacoes(`Item importado da compra Nº ${compra.codigo_ti || compra.id.slice(0, 8)} (${compra.fornecedor})`);
      setObservacoes(
        `Vinculado à Nota Fiscal ${compra.codigo_ti || 'S/N'} de ${formatDate(compra.data_compra)}. Fornecedor: ${compra.fornecedor}`
      );
    }
  }, [isOpen, compra, itemSelecionadoIndex, itensDisponiveis, proximoPatrimonioSugerido]);

  if (!isOpen || !compra) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patrimonio.trim()) {
      toast.error('Informe o código de patrimônio.');
      return;
    }
    if (!marca.trim()) {
      toast.error('Informe a marca do equipamento.');
      return;
    }
    if (!modelo.trim()) {
      toast.error('Informe o modelo do equipamento.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: EquipamentoInput = {
        patrimonio: patrimonio.trim(),
        tipo: tipo.trim() || 'Outro Equipamento',
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim() || null,
        localizacao: localizacao.trim() || 'CPD / Servidores',
        status,
        responsavel: responsavel.trim() || null,
        funcao_responsavel: funcaoResponsavel.trim() || null,
        compra_id: compra.id,
        data_aquisicao: compra.data_compra || new Date().toISOString().split('T')[0],
        valor_estimado: parseFloat(valorEstimado.replace(',', '.')) || null,
        especificacoes: especificacoes.trim() || null,
        acessorios: acessorios.trim() || null,
        observacoes: observacoes.trim() || null,
      };

      await onSalvar(payload);
      toast.success(`🎉 Equipamento ${payload.patrimonio} (${payload.marca} ${payload.modelo}) cadastrado no Inventário com sucesso!`);
      onClose();
    } catch (err: any) {
      console.error('Erro ao gerar equipamento no inventário:', err);
      toast.error(err.message || 'Falha ao cadastrar equipamento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Gerar Equipamento no Inventário a partir da Compra
                </h2>
                {compra.codigo_ti && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                    {compra.codigo_ti}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {compra.fornecedor} • {formatCurrency(compra.valor)} em {formatDate(compra.data_compra)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5 flex-1 text-slate-800">
          {/* Seletor de Itens da Compra se houver mais de 1 */}
          {itensDisponiveis.length > 1 && (
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
              <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                📦 Selecione o item desta Nota Fiscal que deseja tombar no Inventário:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {itensDisponiveis.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setItemSelecionadoIndex(idx)}
                    className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-0.5 cursor-pointer ${
                      itemSelecionadoIndex === idx
                        ? 'border-indigo-600 bg-white shadow-xs text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                    }`}
                  >
                    <span className="truncate block font-semibold">{item.nome}</span>
                    <span className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                      <span>Qtd: {item.quantidade}x</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(item.valorUnitario)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dados Principais do Patrimônio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nº de Patrimônio <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value.toUpperCase())}
                placeholder="Ex: PAT-003"
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
                list="tipos-equipamento-sugestoes"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Selecione ou digite o tipo"
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                required
              />
              <datalist id="tipos-equipamento-sugestoes">
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
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusEquipamento)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="Em Uso">Em Uso</option>
                <option value="Disponível / Estoque">Disponível / Estoque</option>
                <option value="Em Manutenção">Em Manutenção</option>
                <option value="Baixado / Sucateado">Baixado / Sucateado</option>
              </select>
            </div>
          </div>

          {/* Marca, Modelo e Número de Série */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Marca / Fabricante <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
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
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
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
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Opcional: S/N do equipamento"
                className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Localização e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Localização / Sala
              </label>
              <input
                type="text"
                list="localizacoes-sugestoes"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex: Secretaria, Recepção, Lab 01"
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <datalist id="localizacoes-sugestoes">
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
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
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
                value={funcaoResponsavel}
                onChange={(e) => setFuncaoResponsavel(e.target.value)}
                placeholder="Ex: Coordenador, Professor, CPD"
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Valor de Aquisição e Acessórios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Valor de Aquisição (R$)
              </label>
              <input
                type="text"
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Acessórios Inclusos
              </label>
              <input
                type="text"
                value={acessorios}
                onChange={(e) => setAcessorios(e.target.value)}
                placeholder="Ex: Cabo de força, fonte, adaptador..."
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {/* Vínculo Fiscal (Somente Leitura para Transparência) */}
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

          {/* Rodapé com Botões */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Cadastrando no Inventário...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar & Tombamento no Inventário</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
