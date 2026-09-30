import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FileCode,
  Zap,
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
import { parseNfeXml } from '../utils/nfeParser';
import { MODELOS_COMPRAS_RAPIDAS, type ModeloCompraRapida } from '../utils/presetsCompras';

export interface CompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  compraEmEdicao?: Compra | null;
  onSalvar: (compra: CompraInput | Compra) => Promise<void>;
  categorias?: string[];
  centrosCusto?: string[];
  formasPagamento?: string[];
  comprasExistentes?: Compra[];
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
  comprasExistentes = [],
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
  const [isParsingXml, setIsParsingXml] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  // Histórico de fornecedores únicos para autocompletar e sugestões
  const fornecedoresHistorico = useMemo(() => {
    const mapa = new Map<string, { nome: string; cnpj: string; categoria: string; centroCusto: string; formaPagamento: string }>();
    comprasExistentes.forEach((c) => {
      const nomeTrim = c.fornecedor?.trim();
      if (nomeTrim && !mapa.has(nomeTrim.toLowerCase())) {
        mapa.set(nomeTrim.toLowerCase(), {
          nome: nomeTrim,
          cnpj: c.cnpj ? formatCnpj(c.cnpj) : '',
          categoria: c.categoria || '',
          centroCusto: c.centro_custo || '',
          formaPagamento: c.forma_pagamento || '',
        });
      }
    });
    return Array.from(mapa.values());
  }, [comprasExistentes]);

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
      if (e.key === 'Escape' && isOpen && !isSaving && !isUploadingFile && !isParsingXml) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isUploadingFile, isParsingXml, onClose]);

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
  }, [isOpen, compraEmEdicao]);

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

  // Quando o usuário seleciona ou digita o nome de um fornecedor conhecido
  const handleFornecedorChange = (novoNome: string) => {
    setFornecedor(novoNome);
    if (errors.fornecedor) setErrors((prev) => ({ ...prev, fornecedor: '' }));

    // Procura se já temos esse fornecedor no histórico
    const encontrado = fornecedoresHistorico.find(
      (f) => f.nome.toLowerCase() === novoNome.trim().toLowerCase()
    );
    if (encontrado) {
      if (encontrado.cnpj && !cnpj) {
        setCnpj(encontrado.cnpj);
      }
      if (encontrado.categoria && (!categoria || categoria === config.categorias[0])) {
        setCategoria(encontrado.categoria);
      }
      if (encontrado.centroCusto && (!centroCusto || centroCusto === config.centrosCusto[0])) {
        setCentroCusto(encontrado.centroCusto);
      }
      if (encontrado.formaPagamento && (!formaPagamento || formaPagamento === config.formasPagamento[0])) {
        setFormaPagamento(encontrado.formaPagamento);
      }
      toast.info(`Dados de ${encontrado.nome} recuperados do histórico!`);
    }
  };

  // Aplicação rápida de modelo predefinido (1 Clique)
  const aplicarModelo = (modelo: ModeloCompraRapida) => {
    setTipo(modelo.dados.tipo);
    setFornecedor(modelo.dados.fornecedor);
    if (modelo.dados.cnpj) setCnpj(modelo.dados.cnpj);
    setCategoria(modelo.dados.categoria);
    setCentroCusto(modelo.dados.centro_custo);
    setFormaPagamento(modelo.dados.forma_pagamento);
    setStatusPagamento(modelo.dados.status_pagamento);
    setDescricao(modelo.dados.descricao);
    if (modelo.dados.valorSugerido) {
      setValor(modelo.dados.valorSugerido);
    }
    setErrors({});
    toast.success(`⚡ Modelo "${modelo.nome}" aplicado com sucesso!`);
  };

  // Processa arquivo XML de NF-e
  const processarXmlNfe = async (file: File) => {
    setIsParsingXml(true);
    try {
      const xmlText = await file.text();
      const dadosNfe = parseNfeXml(xmlText);

      if (dadosNfe.fornecedor) setFornecedor(dadosNfe.fornecedor);
      if (dadosNfe.cnpj) setCnpj(formatCnpj(dadosNfe.cnpj));
      if (dadosNfe.valor) setValor(dadosNfe.valor);
      if (dadosNfe.dataCompra) setDataCompra(dadosNfe.dataCompra);
      if (dadosNfe.codigoTi) setCodigoTi(dadosNfe.codigoTi);
      if (dadosNfe.descricao) setDescricao(dadosNfe.descricao);
      if (dadosNfe.formaPagamento) setFormaPagamento(dadosNfe.formaPagamento);
      setTipo('Produto');

      // Tenta associar categoria mais provável por inteligência de palavras-chave
      const descLower = (dadosNfe.descricao + ' ' + dadosNfe.fornecedor).toLowerCase();
      if (descLower.includes('toner') || descLower.includes('tinta') || descLower.includes('bobina') || descLower.includes('cartucho')) {
        setCategoria('Insumos (Toners, Tintas, Bobinas)');
      } else if (descLower.includes('cabo') || descLower.includes('patch') || descLower.includes('rj45') || descLower.includes('switch') || descLower.includes('roteador') || descLower.includes('access point')) {
        setCategoria('Infraestrutura de Rede');
      } else if (descLower.includes('ssd') || descLower.includes('memoria') || descLower.includes('notebook') || descLower.includes('computador') || descLower.includes('dell') || descLower.includes('desktop')) {
        setCategoria('Hardware (PCs, Notebooks, Servidores)');
      } else if (descLower.includes('licenca') || descLower.includes('software') || descLower.includes('antivirus')) {
        setCategoria('Software & Licenças');
      }

      toast.success(
        `✨ NF-e Nº ${dadosNfe.numeroNf || 'importada'} processada! ${dadosNfe.fornecedor} • ${formatCurrency(Number(dadosNfe.valor) || 0)}`
      );

      // Limpa erros
      setErrors({});

      // Faz o upload do próprio arquivo XML para o Supabase Storage como comprovante oficial
      setIsUploadingFile(true);
      try {
        const res = await uploadComprovanteNf(file);
        setLinkNf(res.url);
        setNomeArquivoNf(res.nome);
        toast.info('Arquivo XML da NF-e salvo como comprovante fiscal.');
      } catch (storageErr) {
        console.warn('Erro ao salvar XML no storage:', storageErr);
      } finally {
        setIsUploadingFile(false);
      }
    } catch (err: any) {
      console.error('Erro ao processar XML da NF-e:', err);
      toast.error(err.message || 'Falha ao ler arquivo XML da Nota Fiscal.');
    } finally {
      setIsParsingXml(false);
      if (xmlInputRef.current) {
        xmlInputRef.current.value = '';
      }
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

  // Upload geral de arquivo (XML, PDF, Imagens)
  const handleUploadFile = async (file: File) => {
    // Se for arquivo XML, aciona leitura inteligente de NF-e
    if (file.name.toLowerCase().endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml') {
      await processarXmlNfe(file);
      return;
    }

    // Validação de tamanho (máximo 15MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('O arquivo é muito grande. O limite máximo permitido é 15MB.');
      return;
    }

    // Validação de tipo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      toast.error('Formato não suportado. Por favor, envie arquivos em formato XML (NF-e), PDF, PNG ou JPG.');
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
                  : 'Cadastre com 1 clique usando modelos prontos ou importando o XML da NF-e.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploadingFile || isParsingXml}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6 space-y-6 flex-1 text-slate-800">
          
          {/* PAINEL DE AUTOMAÇÕES E AGILIDADE (1 CLIQUE / XML) */}
          {!isEditing && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 p-4 rounded-2xl border border-blue-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    Automação Rápida: Zero Digitação Manual
                  </span>
                </div>
                
                {/* Botão de Importação XML da Nota Fiscal */}
                <div>
                  <input
                    ref={xmlInputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processarXmlNfe(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => xmlInputRef.current?.click()}
                    disabled={isParsingXml || isUploadingFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 shadow-xs transition-all hover:scale-[1.02]"
                    title="Selecione o arquivo .xml da Nota Fiscal para preencher tudo automaticamente"
                  >
                    {isParsingXml ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
                    )}
                    <span>Importar XML da Nota Fiscal (NF-e)</span>
                  </button>
                </div>
              </div>

              {/* Botões de Modelos Rápidos de 1 Clique */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
                  <span>⚡ Ou clique em uma despesa frequente para preencher em 1 clique:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MODELOS_COMPRAS_RAPIDAS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => aplicarModelo(m)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200/90 shadow-2xs transition-all hover:shadow-xs group cursor-pointer"
                    >
                      <span className="text-sm">{m.icone}</span>
                      <span>{m.nome}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 group-hover:bg-blue-500 group-hover:text-white text-slate-500 font-mono">
                        {m.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Seção 1: Dados do Fornecedor e Identificação */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Fornecedor & Identificação
              </h3>
              {fornecedoresHistorico.length > 0 && (
                <span className="text-[11px] text-blue-600 font-medium">
                  {fornecedoresHistorico.length} fornecedores no histórico
                </span>
              )}
            </div>

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
                  Digite os 14 números para autocompletar via BrasilAPI.
                </p>
              </div>

              {/* Razão Social / Fornecedor com Datalist Inteligente */}
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razão Social / Fornecedor <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="fornecedores-historico-lista"
                    value={fornecedor}
                    onChange={(e) => handleFornecedorChange(e.target.value)}
                    placeholder="Ex: Dell, Kalunga, Provedor Fibra, Kabum..."
                    className={`w-full h-10 px-3 text-xs sm:text-sm rounded-xl border bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      errors.fornecedor
                        ? 'border-rose-400 focus:border-rose-600'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  <datalist id="fornecedores-historico-lista">
                    {fornecedoresHistorico.map((f) => (
                      <option key={f.nome} value={f.nome}>
                        {f.cnpj ? `${f.cnpj} • ${f.categoria}` : f.categoria}
                      </option>
                    ))}
                  </datalist>
                </div>
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
                  Categoria Orçamentária <span className="text-rose-500">*</span>
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
                Descrição Detalhada dos Itens / Serviços <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (errors.descricao) setErrors((prev) => ({ ...prev, descricao: '' }));
                }}
                placeholder="Ex: Aquisição de 2x Nobreaks 1500VA para o rack principal e 5 bobinas térmicas..."
                className={`w-full p-3 text-xs sm:text-sm rounded-xl border bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
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

          {/* Seção 3: Valores, Prazos e Pagamento */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              Valores & Condições de Pagamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Valor (R$) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Total (R$) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
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
                    className={`w-full h-10 pl-9 pr-3 text-xs sm:text-sm font-mono font-bold rounded-xl border bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      errors.valor
                        ? 'border-rose-400 focus:border-rose-600'
                        : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>
                {errors.valor && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.valor}</p>
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
                  {config.formasPagamento.map((fp) => (
                    <option key={fp} value={fp}>
                      {fp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status do Pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status do Pagamento <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusPagamento}
                  onChange={(e) => setStatusPagamento(e.target.value as StatusPagamento)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  {STATUS_PAGAMENTO.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Parcelas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Condição / Parcelas
                </label>
                <input
                  type="text"
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  placeholder="Ex: À vista, 3x s/ juros, Mensal"
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              {/* Garantia / Licença até */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Garantia / Validade até
                </label>
                <input
                  type="date"
                  value={garantia}
                  onChange={(e) => setGarantia(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              {/* Código T.I / Nº NF */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código Interno / Nº NF
                </label>
                <input
                  type="text"
                  value={codigoTi}
                  onChange={(e) => setCodigoTi(e.target.value)}
                  placeholder="Ex: NF-12845 ou TI-2026-001"
                  className="w-full h-10 px-3 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Comprovante Fiscal e Anexo com Drag & Drop */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              Comprovante / Nota Fiscal (PDF, Imagem ou XML)
            </h3>

            {linkNf ? (
              // Arquivo já anexado
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-slate-800">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-emerald-950 truncate">
                      {nomeArquivoNf || 'Comprovante / Nota Fiscal anexado'}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Armazenado no bucket seguro Supabase Storage
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={linkNf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoverAnexo}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Dropzone para novo upload
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center">
                    {isUploadingFile || isParsingXml ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile || isParsingXml}
                      className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                    >
                      Clique para escolher o arquivo
                    </button>
                    <span className="text-xs sm:text-sm text-slate-500"> ou arraste aqui</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    <strong>Suporta XML da NF-e</strong> (preenche todos os dados automaticamente), PDF ou fotos da Nota/Recibo (até 15MB).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Observações Internas */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações Gerais (Opcional)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Aprovado pela diretoria em reunião, garantia estendida de 2 anos..."
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Rodapé com Botões de Ação */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isUploadingFile || isParsingXml}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingFile || isParsingXml}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações' : 'Confirmar & Cadastrar Compra'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
