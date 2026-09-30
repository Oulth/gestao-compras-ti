import React, { useState, useEffect } from 'react';
import {
  X,
  Laptop,
  CheckCircle2,
  Tag,
  MapPin,
  Loader2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Equipamento,
  EquipamentoInput,
  StatusEquipamento,
  Compra,
} from '../types';
import {
  DEFAULT_TIPOS_EQUIPAMENTO,
  DEFAULT_LOCALIZACOES,
  getConfiguracoesEquipamentos,
} from '../services/equipamentos';

interface EquipamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamentoEmEdicao?: Equipamento | null;
  onSalvar: (equipamento: EquipamentoInput | Equipamento) => Promise<void>;
  compras?: Compra[];
  proximoPatrimonioSugerido?: string;
}

const STATUS_OPCOES: StatusEquipamento[] = [
  'Em Uso',
  'Disponível / Estoque',
  'Em Manutenção',
  'Baixado / Sucateado',
];

export const EquipamentoModal: React.FC<EquipamentoModalProps> = ({
  isOpen,
  onClose,
  equipamentoEmEdicao,
  onSalvar,
  compras = [],
  proximoPatrimonioSugerido = 'PAT-001',
}) => {
  const [tipos, setTipos] = useState<string[]>(DEFAULT_TIPOS_EQUIPAMENTO);
  const [localizacoes, setLocalizacoes] = useState<string[]>(DEFAULT_LOCALIZACOES);

  // Estados dos campos
  const [patrimonio, setPatrimonio] = useState<string>('');
  const [tipo, setTipo] = useState<string>(DEFAULT_TIPOS_EQUIPAMENTO[0]);
  const [marca, setMarca] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [numeroSerie, setNumeroSerie] = useState<string>('');
  const [localizacao, setLocalizacao] = useState<string>(DEFAULT_LOCALIZACOES[0]);
  const [status, setStatus] = useState<StatusEquipamento>('Em Uso');
  const [responsavel, setResponsavel] = useState<string>('');
  const [funcaoResponsavel, setFuncaoResponsavel] = useState<string>('');
  const [compraId, setCompraId] = useState<string>('');
  const [dataAquisicao, setDataAquisicao] = useState<string>('');
  const [valorEstimado, setValorEstimado] = useState<string>('');
  const [especificacoes, setEspecificacoes] = useState<string>('');
  const [acessorios, setAcessoriosTexto] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getConfiguracoesEquipamentos().then((res) => {
      setTipos(res.tipos);
      setLocalizacoes(res.localizacoes);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (equipamentoEmEdicao) {
      setPatrimonio(equipamentoEmEdicao.patrimonio || '');
      setTipo(equipamentoEmEdicao.tipo || DEFAULT_TIPOS_EQUIPAMENTO[0]);
      setMarca(equipamentoEmEdicao.marca || '');
      setModelo(equipamentoEmEdicao.modelo || '');
      setNumeroSerie(equipamentoEmEdicao.numero_serie || '');
      setLocalizacao(equipamentoEmEdicao.localizacao || DEFAULT_LOCALIZACOES[0]);
      setStatus(equipamentoEmEdicao.status || 'Em Uso');
      setResponsavel(equipamentoEmEdicao.responsavel || '');
      setFuncaoResponsavel(equipamentoEmEdicao.funcao_responsavel || '');
      setCompraId(equipamentoEmEdicao.compra_id || '');
      setDataAquisicao(
        equipamentoEmEdicao.data_aquisicao
          ? equipamentoEmEdicao.data_aquisicao.slice(0, 10)
          : ''
      );
      setValorEstimado(
        equipamentoEmEdicao.valor_estimado
          ? String(equipamentoEmEdicao.valor_estimado)
          : ''
      );
      setEspecificacoes(equipamentoEmEdicao.especificacoes || '');
      setAcessoriosTexto(equipamentoEmEdicao.acessorios || '');
      setObservacoes(equipamentoEmEdicao.observacoes || '');
    } else {
      setPatrimonio(proximoPatrimonioSugerido);
      setTipo(tipos[0] || 'Notebook');
      setMarca('');
      setModelo('');
      setNumeroSerie('');
      setLocalizacao(localizacoes[0] || 'CPD / Servidores');
      setStatus('Em Uso');
      setResponsavel('');
      setFuncaoResponsavel('');
      setCompraId('');
      setDataAquisicao(new Date().toISOString().split('T')[0]);
      setValorEstimado('');
      setEspecificacoes('');
      setAcessoriosTexto('Fonte / Carregador de energia');
      setObservacoes('');
    }
    setErrors({});
  }, [isOpen, equipamentoEmEdicao]);

  // Se o usuário selecionar uma compra existente, pré-preenche fornecedor, data e valor
  const handleCompraChange = (selectedCompraId: string) => {
    setCompraId(selectedCompraId);
    if (!selectedCompraId) return;

    const compra = compras.find((c) => c.id === selectedCompraId);
    if (compra) {
      if (compra.data_compra && !dataAquisicao) {
        setDataAquisicao(compra.data_compra.slice(0, 10));
      }
      if (compra.valor && !valorEstimado) {
        setValorEstimado(String(compra.valor));
      }
      if (!marca && compra.fornecedor) {
        // Sugere a marca pelo fornecedor se aplicável
        if (compra.fornecedor.toLowerCase().includes('dell')) setMarca('Dell');
        else if (compra.fornecedor.toLowerCase().includes('lenovo')) setMarca('Lenovo');
        else if (compra.fornecedor.toLowerCase().includes('hp')) setMarca('HP');
        else if (compra.fornecedor.toLowerCase().includes('samsung')) setMarca('Samsung');
      }
      toast.info(`Vinculado à compra: ${compra.descricao.slice(0, 40)}...`);
    }
  };

  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};
    if (!patrimonio.trim()) novosErros.patrimonio = 'Patrimônio é obrigatório.';
    if (!tipo.trim()) novosErros.tipo = 'Tipo é obrigatório.';
    if (!marca.trim()) novosErros.marca = 'Marca é obrigatória.';
    if (!modelo.trim()) novosErros.modelo = 'Modelo é obrigatório.';
    if (!localizacao.trim()) novosErros.localizacao = 'Localização é obrigatória.';
    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: EquipamentoInput | Equipamento = {
        ...(equipamentoEmEdicao?.id ? { id: equipamentoEmEdicao.id } : {}),
        patrimonio: patrimonio.trim().toUpperCase(),
        tipo: tipo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim() || null,
        localizacao: localizacao.trim(),
        status,
        responsavel: responsavel.trim() || null,
        funcao_responsavel: funcaoResponsavel.trim() || null,
        compra_id: compraId || null,
        data_aquisicao: dataAquisicao || null,
        valor_estimado: valorEstimado ? parseFloat(valorEstimado.replace(',', '.')) : 0,
        especificacoes: especificacoes.trim() || null,
        acessorios: acessorios.trim() || null,
        observacoes: observacoes.trim() || null,
      };

      await onSalvar(payload);
      toast.success(
        equipamentoEmEdicao
          ? 'Equipamento atualizado com sucesso!'
          : 'Novo equipamento registrado no inventário!'
      );
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar equipamento:', err);
      toast.error(err.message || 'Falha ao salvar equipamento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(equipamentoEmEdicao);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Equipamento do Inventário' : 'Cadastrar Novo Equipamento'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Controle patrimonial de hardware, estações e infraestrutura de T.I
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Identificação Patrimonial */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Identificação & Patrimônio</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tag de Patrimônio <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={patrimonio}
                    onChange={(e) => setPatrimonio(e.target.value.toUpperCase())}
                    placeholder="Ex: PAT-001 ou TI-042"
                    className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2 text-sm font-mono font-bold uppercase focus:ring-2 focus:bg-white transition-all ${
                      errors.patrimonio ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
                    }`}
                  />
                </div>
                {errors.patrimonio && <p className="text-[11px] text-rose-500 mt-1">{errors.patrimonio}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Equipamento <span className="text-rose-500">*</span>
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                >
                  {tipos.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Série (S/N)
                </label>
                <input
                  type="text"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  placeholder="Ex: 8XGT4Y2 ou S/N"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Marca, Modelo e Configurações */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-indigo-600" />
              <span>Especificações do Equipamento</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca / Fabricante <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ex: Dell, Lenovo, HP, Samsung, Furukawa"
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:bg-white ${
                    errors.marca ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
                  }`}
                />
                {errors.marca && <p className="text-[11px] text-rose-500 mt-1">{errors.marca}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ex: Latitude 3440 Core i5 ou Catalyst 2960"
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:bg-white ${
                    errors.modelo ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
                  }`}
                />
                {errors.modelo && <p className="text-[11px] text-rose-500 mt-1">{errors.modelo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Especificações Técnicas
                </label>
                <input
                  type="text"
                  value={especificacoes}
                  onChange={(e) => setEspecificacoes(e.target.value)}
                  placeholder="Ex: 16GB RAM, 512GB NVMe SSD, Core i5 13ª Geração"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Acessórios Inclusos (Para o Termo de Cautela)
                </label>
                <input
                  type="text"
                  value={acessorios}
                  onChange={(e) => setAcessoriosTexto(e.target.value)}
                  placeholder="Ex: Fonte/Carregador 65W, Cabo de força, Mouse óptico"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Localização, Status e Alocação */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Localização & Responsabilidade</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Localização / Sala <span className="text-rose-500">*</span>
                </label>
                <select
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                >
                  {localizacoes.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Operacional <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusEquipamento)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                >
                  {STATUS_OPCOES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsável / Usuário
                </label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Ex: Prof. Carlos Silva ou Lab 1"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Função / Cargo
                </label>
                <input
                  type="text"
                  value={funcaoResponsavel}
                  onChange={(e) => setFuncaoResponsavel(e.target.value)}
                  placeholder="Ex: Professor de Biologia"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Vínculo com Compras e Aquisição */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Origem da Compra & Valores (Opcional)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vincular a Compra Registrada
                </label>
                <select
                  value={compraId}
                  onChange={(e) => handleCompraChange(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white truncate"
                >
                  <option value="">Nenhum vínculo (Item Avulso/Legado)</option>
                  {compras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo_ti ? `[${c.codigo_ti}] ` : ''}{c.fornecedor} - {c.descricao.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Aquisição
                </label>
                <input
                  type="date"
                  value={dataAquisicao}
                  onChange={(e) => setDataAquisicao(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorEstimado}
                  onChange={(e) => setValorEstimado(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Adicionais
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Ex: Máquina revisada e formatada com Windows 11 Pro educacional."
                className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Rodapé do Formulário */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Atualizar Equipamento' : 'Salvar no Inventário'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
