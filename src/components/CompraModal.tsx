import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  FileText,
  UploadCloud,
  ExternalLink,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle2,
  Tag,
  DollarSign,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Compra,
  CompraInput,
  TipoDespesa,
  StatusPagamento,
  ConfiguracoesApp,
} from '../types';
import { consultarCnpj } from '../services/brasilApi';
import { uploadComprovanteNf, deleteComprovanteNf } from '../services/storage';
import { DEFAULT_CONFIGURACOES, getConfiguracoes } from '../services/compras';
import { formatCurrency, formatCnpj } from '../utils/formatters';

export interface CompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  compraEmEdicao?: Compra | null;
  onSalvar: (compra: CompraInput | Compra) => Promise<void>;
  categorias?: string[];
  centrosCusto?: string[];
  formasPagamento?: string[];
}

const TIPOS_DESPESA: TipoDespesa[] = [
  'Produto',
  'Serviço',
  'Assinatura Recorrente (SaaS)',
  'Contrato Mensal',
];

const STATUS_PAGAMENTO: StatusPagamento[] = [
  'Pago',
  'Pendente',
  'Parcelado',
  'Cancelado',
];

export const CompraModal: React.FC<CompraModalProps> = ({
  isOpen,
  onClose,
  compraEmEdicao,
  onSalvar,
  categorias: categoriasProp,
  centrosCusto: centrosCustoProp,
  formasPagamento: formasPagamentoProp,
}) => {
  // Configurações dinâmicas
  const [config, setConfig] = useState<ConfiguracoesApp>({
    categorias: categoriasProp || DEFAULT_CONFIGURACOES.categorias,
    centrosCusto: centrosCustoProp || DEFAULT_CONFIGURACOES.centrosCusto,
    formasPagamento: formasPagamentoProp || DEFAULT_CONFIGURACOES.formasPagamento,
  });

  // Estados dos campos do formulário
  const [codigoTi, setCodigoTi] = useState<string>('');
  const [dataCompra, setDataCompra] = useState<string>('');
  const [tipo, setTipo] = useState<TipoDespesa>('Produto');
  const [fornecedor, setFornecedor] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('');
  const [centroCusto, setCentroCusto] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>('Pago');
  const [parcelas, setParcelas] = useState<string>('');
  const [garantia, setGarantia] = useState<string>('');
  const [linkNf, setLinkNf] = useState<string>('');
  const [nomeArquivoNf, setNomeArquivoNf] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Estados de controle e feedback
  const [isSearchingCnpj, setIsSearchingCnpj] = useState<boolean>(false);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega configurações se não vierem via props
  useEffect(() => {
    if (!categoriasProp || !centrosCustoProp || !formasPagamentoProp) {
      getConfiguracoes().then((res) => {
        setConfig({
          categorias: categoriasProp || res.categorias,
          centrosCusto: centrosCustoProp || res.centrosCusto,
          formasPagamento: formasPagamentoProp || res.formasPagamento,
        });
      });
    }
  }, [categoriasProp, centrosCustoProp, formasPagamentoProp]);

  // Bloqueio de scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Atalho de fechar via tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving && !isUploadingFile) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isUploadingFile, onClose]);

  // Inicializa formulário ao abrir ou alterar registro em edição
  useEffect(() => {
    if (!isOpen) return;

    if (compraEmEdicao) {
      // Modo Edição
      setCodigoTi(compraEmEdicao.codigo_ti || '');
      setDataCompra(compraEmEdicao.data_compra ? compraEmEdicao.data_compra.slice(0, 10) : '');
      setTipo(compraEmEdicao.tipo || 'Produto');
      setFornecedor(compraEmEdicao.fornecedor || '');
      setCnpj(compraEmEdicao.cnpj ? formatCnpj(compraEmEdicao.cnpj) : '');
      setDescricao(compraEmEdicao.descricao || '');
      setCategoria(compraEmEdicao.categoria || '');
      setCentroCusto(compraEmEdicao.centro_custo || '');
      setValor(compraEmEdicao.valor ? String(compraEmEdicao.valor) : '');
      setFormaPagamento(compraEmEdicao.forma_pagamento || '');
      setStatusPagamento(compraEmEdicao.status_pagamento || 'Pago');
      setParcelas(compraEmEdicao.parcelas || '');
      setGarantia(compraEmEdicao.garantia ? compraEmEdicao.garantia.slice(0, 10) : '');
      setLinkNf(compraEmEdicao.link_nf || '');
      setNomeArquivoNf(compraEmEdicao.nome_arquivo_nf || '');
      setObservacoes(compraEmEdicao.observacoes || '');
    } else {
      // Modo Criação: valores padrão
      const hoje = new Date().toISOString().split('T')[0];
      setCodigoTi('');
      setDataCompra(hoje);
      setTipo('Produto');
      setFornecedor('');
      setCnpj('');
      setDescricao('');
      setCategoria(config.categorias[0] || 'Hardware (PCs, Notebooks, Servidores)');
      setCentroCusto(config.centrosCusto[0] || 'T.I - Infraestrutura');
      setValor('');
      setFormaPagamento(config.formasPagamento[0] || 'PIX');
      setStatusPagamento('Pago');
      setParcelas('');
      setGarantia('');
      setLinkNf('');
      setNomeArquivoNf('');
      setObservacoes('');
    }
    setErrors({});
  }, [isOpen, compraEmEdicao, config]);

  // Aplica máscara de CNPJ enquanto o usuário digita
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    let masked = raw;
    if (raw.length > 12) {
      masked = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
    } else if (raw.length > 8) {
      masked = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4');
    } else if (raw.length > 5) {
      masked = raw.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (raw.length > 2) {
      masked = raw.replace(/^(\d{2})(\d{1,3})$/, '$1.$2');
    }
    setCnpj(masked);

    // Se completou 14 dígitos e o fornecedor ainda está vazio, faz busca automática suave
    if (raw.length === 14 && !fornecedor) {
      realizarBuscaCnpj(masked);
    }
  };

  // Consulta à BrasilAPI
  const realizarBuscaCnpj = async (cnpjValue?: string) => {
    const targetCnpj = (cnpjValue || cnpj).replace(/\D/g, '');
    if (targetCnpj.length !== 14) {
      toast.warning('Informe um CNPJ completo com 14 dígitos para buscar na Receita Federal.');
      return;
    }

    setIsSearchingCnpj(true);
    try {
      const resultado = await consultarCnpj(targetCnpj);
      if (resultado && resultado.razaoSocial) {
        setFornecedor(resultado.razaoSocial);
        const fantasia = resultado.nomeFantasia && resultado.nomeFantasia !== resultado.razaoSocial
          ? ` (${resultado.nomeFantasia})`
          : '';
        toast.success(`CNPJ localizado: ${resultado.razaoSocial}${fantasia}`);
        // Limpa erro do campo se existia
        setErrors((prev) => ({ ...prev, fornecedor: '' }));
      } else {
        toast.info('CNPJ não encontrado na base pública da Receita Federal. Preencha manualmente.');
      }
    } catch (err: any) {
      console.error('Erro ao consultar CNPJ:', err);
      toast.error('Não foi possível consultar a BrasilAPI no momento.');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  // Upload de arquivo para Supabase Storage
  const handleUploadFile = async (file: File) => {
    // Validação de tamanho (máximo 15MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('O arquivo é muito grande. O limite máximo permitido é 15MB.');
      return;
    }

    // Validação de tipo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      toast.error('Formato não suportado. Por favor, envie arquivos em formato PDF, PNG ou JPG.');
      return;
    }

    setIsUploadingFile(true);
    try {
      const res = await uploadComprovanteNf(file);
      setLinkNf(res.url);
      setNomeArquivoNf(res.nome);
      toast.success('Comprovante / NF enviado com sucesso ao Supabase Storage!');
    } catch (err: any) {
      console.error('Erro no upload do anexo:', err);
      toast.error(err.message || 'Erro ao fazer upload do arquivo.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remover anexo
  const handleRemoverAnexo = async () => {
    if (linkNf) {
      try {
        await deleteComprovanteNf(linkNf);
      } catch (err) {
        console.warn('Aviso ao remover arquivo:', err);
      }
    }
    setLinkNf('');
    setNomeArquivoNf('');
    toast.info('Anexo removido.');
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Validação do formulário
  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!fornecedor.trim()) {
      novosErros.fornecedor = 'A razão social ou nome do fornecedor é obrigatório.';
    }

    if (!descricao.trim()) {
      novosErros.descricao = 'A descrição detalhada da compra é obrigatória.';
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      novosErros.valor = 'Informe um valor válido e maior que zero (R$).';
    }

    if (!dataCompra) {
      novosErros.dataCompra = 'A data da compra é obrigatória.';
    }

    if (!categoria.trim()) {
      novosErros.categoria = 'Selecione uma categoria.';
    }

    if (!tipo) {
      novosErros.tipo = 'Selecione o tipo de despesa.';
    }

    if (!statusPagamento) {
      novosErros.statusPagamento = 'Selecione o status do pagamento.';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) {
      toast.error('Preencha todos os campos obrigatórios destacados.');
      return;
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'));

    const payload: CompraInput | Compra = {
      ...(compraEmEdicao?.id ? { id: compraEmEdicao.id } : {}),
      codigo_ti: codigoTi.trim() || null,
      data_compra: dataCompra,
      tipo,
      fornecedor: fornecedor.trim(),
      cnpj: cnpj.replace(/\D/g, '') ? cnpj.trim() : null,
      descricao: descricao.trim(),
      categoria: categoria.trim(),
      centro_custo: centroCusto.trim() || null,
      valor: valorNumerico,
      forma_pagamento: formaPagamento.trim() || null,
      status_pagamento: statusPagamento,
      parcelas: parcelas.trim() || null,
      garantia: garantia ? garantia : null,
      link_nf: linkNf || null,
      nome_arquivo_nf: nomeArquivoNf || null,
      observacoes: observacoes.trim() || null,
    };

    setIsSaving(true);
    try {
      await onSalvar(payload);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar compra:', err);
      toast.error(err.message || 'Falha ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(compraEmEdicao);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              {isEditing ? <FileText className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditing ? 'Editar Lançamento de Compra' : 'Nova Compra / Despesa de T.I'}
                </h2>
                {isEditing && compraEmEdicao?.codigo_ti && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                    {compraEmEdicao.codigo_ti}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing
                  ? 'Atualize as informações do registro e anexe os comprovantes fiscais.'
                  : 'Cadastre aquisições de produtos, serviços e contratos do setor de Tecnologia.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploadingFile}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6 space-y-6 flex-1 text-slate-800">
          {/* Seção 1: Dados do Fornecedor e Identificação */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Fornecedor & Identificação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* CNPJ com Auto-busca */}
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CNPJ do Fornecedor
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                      className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => realizarBuscaCnpj()}
                    disabled={isSearchingCnpj || cnpj.replace(/\D/g, '').length !== 14}
                    className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
                    title="Consultar Razão Social na Receita Federal via BrasilAPI"
                  >
                    {isSearchingCnpj ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span className="hidden sm:inline">Auto-buscar</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Digite os 14 números para preenchimento via BrasilAPI.
                </p>
              </div>

              {/* Razão Social / Fornecedor (Obrigatório) */}
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razão Social / Fornecedor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fornecedor}
                  onChange={(e) => {
                    setFornecedor(e.target.value);
                    if (errors.fornecedor) setErrors((prev) => ({ ...prev, fornecedor: '' }));
                  }}
                  placeholder="Ex: Dell Computadores do Brasil Ltda"
                  className={`w-full h-10 px-3 text-xs sm:text-sm rounded-xl border bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.fornecedor
                      ? 'border-rose-400 focus:border-rose-600'
                      : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.fornecedor && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.fornecedor}</p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Especificação e Categorização */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              Classificação & Detalhes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Tipo de Despesa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Despesa <span className="text-rose-500">*</span>
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoDespesa)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  {TIPOS_DESPESA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoria}
                  onChange={(e) => {
                    setCategoria(e.target.value);
                    if (errors.categoria) setErrors((prev) => ({ ...prev, categoria: '' }));
                  }}
                  className={`w-full h-10 px-3 text-xs sm:text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.categoria
                      ? 'border-rose-400 focus:border-rose-600'
                      : 'border-slate-300 focus:border-blue-600'
                  }`}
                >
                  <option value="" disabled>
                    Selecione uma categoria...
                  </option>
                  {config.categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.categoria && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.categoria}</p>
                )}
              </div>

              {/* Centro de Custo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Centro de Custo
                </label>
                <select
                  value={centroCusto}
                  onChange={(e) => setCentroCusto(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="">Não informado</option>
                  {config.centrosCusto.map((cc) => (
                    <option key={cc} value={cc}>
                      {cc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição Detalhada */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Detalhada dos Itens / Escopo <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (errors.descricao) setErrors((prev) => ({ ...prev, descricao: '' }));
                }}
                placeholder="Ex: 5x Notebooks Dell Latitude 3440 Core i5 16GB SSD 512GB para os novos laboratórios de informática..."
                className={`w-full p-3 text-xs sm:text-sm rounded-xl border bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-y ${
                  errors.descricao
                    ? 'border-rose-400 focus:border-rose-600'
                    : 'border-slate-300 focus:border-blue-600'
                }`}
              />
              {errors.descricao && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.descricao}</p>
              )}
            </div>
          </div>

          {/* Seção 3: Valores, Prazos e Condições Financeiras */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              Valores & Condições de Pagamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Valor Total R$ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Total (R$) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valor}
                    onChange={(e) => {
                      setValor(e.target.value);
                      if (errors.valor) setErrors((prev) => ({ ...prev, valor: '' }));
                    }}
                    placeholder="0,00"
                    className={`w-full h-10 pl-9 pr-3 text-xs sm:text-sm font-mono font-semibold rounded-xl border bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      errors.valor
                        ? 'border-rose-400 focus:border-rose-600'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>
                {errors.valor ? (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.valor}</p>
                ) : (
                  valor && (
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      {formatCurrency(parseFloat(valor.replace(',', '.')) || 0)}
                    </p>
                  )
                )}
              </div>

              {/* Data da Compra */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data da Compra <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataCompra}
                  onChange={(e) => {
                    setDataCompra(e.target.value);
                    if (errors.dataCompra) setErrors((prev) => ({ ...prev, dataCompra: '' }));
                  }}
                  className={`w-full h-10 px-3 text-xs sm:text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.dataCompra
                      ? 'border-rose-400 focus:border-rose-600'
                      : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.dataCompra && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.dataCompra}</p>
                )}
              </div>

              {/* Status do Pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status do Pagamento <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusPagamento}
                  onChange={(e) => setStatusPagamento(e.target.value as StatusPagamento)}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  {STATUS_PAGAMENTO.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="">Não informado</option>
                  {config.formasPagamento.map((fp) => (
                    <option key={fp} value={fp}>
                      {fp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Parcelas / Condições */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parcelas / Vencimentos
                </label>
                <input
                  type="text"
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  placeholder="Ex: 3x de R$ 450,00 ou À vista"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              {/* Término de Garantia / Licença */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Término de Garantia / Licença
                </label>
                <input
                  type="date"
                  value={garantia}
                  onChange={(e) => setGarantia(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Alimenta o monitor de alertas do Dashboard.
                </p>
              </div>

              {/* Código T.I (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Identificação T.I
                </label>
                <input
                  type="text"
                  value={codigoTi}
                  onChange={(e) => setCodigoTi(e.target.value)}
                  placeholder="Ex: TI-2026-001 (ou deixe em branco)"
                  className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Comprovante Fiscal / Nota Fiscal (Supabase Storage) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Comprovante / Nota Fiscal (Supabase Storage)
            </h3>

            {/* Input invisível de arquivo */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
            />

            {/* Card de anexo já carregado */}
            {linkNf ? (
              <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {nomeArquivoNf || 'Nota_Fiscal_Comprovante'}
                    </p>
                    <p className="text-[11px] text-blue-700 font-medium">
                      Armazenado no bucket seguro `comprovantes-nf`
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={linkNf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleRemoverAnexo}
                    disabled={isUploadingFile || isSaving}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 rounded-lg transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone para upload */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploadingFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-white'
                }`}
              >
                {isUploadingFile ? (
                  <div className="flex flex-col items-center justify-center py-2 gap-2 text-blue-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold">Enviando anexo para o Supabase Storage...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                      <UploadCloud className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">
                      Arraste e solte o comprovante / NF aqui, ou <span className="text-blue-600 font-bold underline">procure no computador</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Suporte a arquivos PDF, PNG e JPG (máximo 15MB)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 5: Observações Adicionais */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              Observações Adicionais / Chamados
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Chamado GLPI #45892 aberto para aquisição emergencial. Aprovado pela diretoria financeira..."
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-y"
            />
          </div>
        </form>

        {/* Rodapé de Ações do Modal */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            * Campos obrigatórios para registro fiscal
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isUploadingFile}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isUploadingFile}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Salvando Lançamento...</span>
                </>
              ) : isEditing ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Atualizar Lançamento</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Lançamento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompraModal;
