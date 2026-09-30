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
  Repeat,
  CreditCard,
  Banknote,
  CalendarDays,
  Info,
  AlertTriangle,
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
import { formatCurrency, formatCnpj, formatDate } from '../utils/formatters';
import { parseNfeXml } from '../utils/nfeParser';
import { parseNotaFiscalPdf } from '../utils/pdfParser';
import { MODELOS_COMPRAS_RAPIDAS, type ModeloCompraRapida } from '../utils/presetsCompras';
import { verificarDuplicidade, type ResultadoDuplicidade } from '../utils/duplicidadeDetector';

export interface CompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  compraEmEdicao?: Compra | null;
  onSalvar: (compra: CompraInput | Compra | CompraInput[]) => Promise<void>;
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

type ModalidadePagamento = 'a_vista' | 'parcelado' | 'recorrente_mensal';
type DuracaoRecorrencia = 'fim_do_ano' | '12_meses' | '6_meses' | 'personalizado';

/**
 * Adiciona meses a uma data YYYY-MM-DD com segurança contra estouro de dias
 */
function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const date = new Date(year, month + months, day);
  if (date.getDate() !== day) {
    date.setDate(0); // Último dia do mês correto
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calcula quantidade de meses restantes até dezembro a partir de uma data
 */
function calcularMesesRestantesAno(dataStr: string): number {
  if (!dataStr) return 12;
  const mes = parseInt(dataStr.split('-')[1], 10);
  if (isNaN(mes)) return 12;
  return Math.max(1, 12 - mes + 1);
}

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

  // Estados dos campos básicos do formulário
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
  const [garantia, setGarantia] = useState<string>('');
  const [linkNf, setLinkNf] = useState<string>('');
  const [nomeArquivoNf, setNomeArquivoNf] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Estados da Duração das Parcelas e Recorrência Mensal
  const [modalidadePagamento, setModalidadePagamento] = useState<ModalidadePagamento>('a_vista');
  const [numParcelas, setNumParcelas] = useState<number>(3);
  const [desmembrarParcelas, setDesmembrarParcelas] = useState<boolean>(true);
  const [duracaoRecorrencia, setDuracaoRecorrencia] = useState<DuracaoRecorrencia>('12_meses');
  const [mesesPersonalizados, setMesesPersonalizados] = useState<number>(12);
  const [gerarMensalidadesFuturas, setGerarMensalidadesFuturas] = useState<boolean>(true);

  // Estados de controle e feedback
  const [isSearchingCnpj, setIsSearchingCnpj] = useState<boolean>(false);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isParsingXml, setIsParsingXml] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ignorarAvisoDuplicidade, setIgnorarAvisoDuplicidade] = useState<boolean>(false);
  const [isConfirmandoDuplicidadeModal, setIsConfirmandoDuplicidadeModal] = useState<boolean>(false);

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
      setGarantia(compraEmEdicao.garantia ? compraEmEdicao.garantia.slice(0, 10) : '');
      setLinkNf(compraEmEdicao.link_nf || '');
      setNomeArquivoNf(compraEmEdicao.nome_arquivo_nf || '');
      setObservacoes(compraEmEdicao.observacoes || '');

      // Identifica modalidade existente
      const parc = (compraEmEdicao.parcelas || '').toLowerCase();
      if (parc.includes('recorrente') || compraEmEdicao.tipo === 'Assinatura Recorrente (SaaS)' || compraEmEdicao.tipo === 'Contrato Mensal') {
        setModalidadePagamento('recorrente_mensal');
      } else if (compraEmEdicao.status_pagamento === 'Parcelado' || parc.match(/\d+x/)) {
        setModalidadePagamento('parcelado');
      } else {
        setModalidadePagamento('a_vista');
      }
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
      setGarantia('');
      setLinkNf('');
      setNomeArquivoNf('');
      setObservacoes('');

      // Padrões de duração e recorrência
      setModalidadePagamento('a_vista');
      setNumParcelas(3);
      setDesmembrarParcelas(true);
      setDuracaoRecorrencia('12_meses');
      setMesesPersonalizados(12);
      setGerarMensalidadesFuturas(true);
    }
    setIgnorarAvisoDuplicidade(false);
    setIsConfirmandoDuplicidadeModal(false);
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

    if (raw.length === 14 && !fornecedor) {
      realizarBuscaCnpj(masked);
    }
  };

  // Quando o usuário seleciona ou digita o nome de um fornecedor conhecido
  const handleFornecedorChange = (novoNome: string) => {
    setFornecedor(novoNome);
    if (errors.fornecedor) setErrors((prev) => ({ ...prev, fornecedor: '' }));

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
      toast.info(`Dados de ${encontrado.nome} preenchidos do histórico!`);
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

    if (modelo.modalidadeSugerida) {
      setModalidadePagamento(modelo.modalidadeSugerida);
      if (modelo.modalidadeSugerida === 'parcelado') {
        setNumParcelas(modelo.duracaoMesesSugerida || 6);
        setStatusPagamento('Parcelado');
      } else if (modelo.modalidadeSugerida === 'recorrente_mensal') {
        setDuracaoRecorrencia('12_meses');
        setStatusPagamento('Pago');
      }
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
      setModalidadePagamento('a_vista');

      const descLower = (dadosNfe.descricao + ' ' + dadosNfe.fornecedor).toLowerCase();
      if (descLower.includes('toner') || descLower.includes('tinta') || descLower.includes('bobina') || descLower.includes('cartucho')) {
        setCategoria('Impressoras & Suprimentos (Toners, Peças)');
      } else if (descLower.includes('cabo') || descLower.includes('patch') || descLower.includes('rj45') || descLower.includes('switch') || descLower.includes('roteador')) {
        setCategoria('Redes & Conectividade (Switches, Roteadores, Cabos)');
      } else if (descLower.includes('ssd') || descLower.includes('memoria') || descLower.includes('notebook') || descLower.includes('computador') || descLower.includes('dell')) {
        setCategoria('Hardware (PCs, Notebooks, Servidores)');
      } else if (descLower.includes('licenca') || descLower.includes('software') || descLower.includes('antivirus')) {
        setCategoria('Software & Licenças (SaaS, SO, Antivírus)');
      }

      if (dadosNfe.dataVencimento) {
        setObservacoes(`Vencimento do Boleto / Duplicata: ${formatDate(dadosNfe.dataVencimento)}`);
      }

      toast.success(
        `✨ NF-e Nº ${dadosNfe.numeroNf || 'importada'} processada! ${dadosNfe.fornecedor} • ${formatCurrency(Number(dadosNfe.valor) || 0)}`
      );

      // Verificação imediata de duplicidade do XML
      setIgnorarAvisoDuplicidade(false);
      const dupCheckXml = verificarDuplicidade(
        {
          codigo_ti: dadosNfe.codigoTi,
          fornecedor: dadosNfe.fornecedor,
          cnpj: dadosNfe.cnpj,
          valor: dadosNfe.valor,
          data_compra: dadosNfe.dataCompra,
          nome_arquivo_nf: file.name,
        },
        comprasExistentes
      );
      if (dupCheckXml.isDuplicada) {
        toast.warning(
          `⚠️ Atenção: Esta Nota Fiscal já foi cadastrada anteriormente no sistema! (${dupCheckXml.compraExistente?.codigo_ti || 'NF Existente'})`,
          { duration: 6000 }
        );
      }

      setErrors({});

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
    // 1. Arquivo XML da NF-e
    if (file.name.toLowerCase().endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml') {
      await processarXmlNfe(file);
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('O arquivo é muito grande. O limite máximo permitido é 15MB.');
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      toast.error('Formato não suportado. Por favor, envie arquivos em formato XML (NF-e), PDF, PNG ou JPG.');
      return;
    }

    // 2. Arquivo PDF: Leitura inteligente (DANFE - Produtos ou DANFSe - Serviços)
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setIsParsingXml(true);
      try {
        const dadosPdf = await parseNotaFiscalPdf(file);
        if (dadosPdf && (dadosPdf.fornecedor || dadosPdf.numeroNf)) {
          if (dadosPdf.fornecedor) setFornecedor(dadosPdf.fornecedor);
          if (dadosPdf.cnpj) setCnpj(formatCnpj(dadosPdf.cnpj));
          if (dadosPdf.codigoTi) setCodigoTi(dadosPdf.codigoTi);
          if (dadosPdf.dataCompra) setDataCompra(dadosPdf.dataCompra);
          if (dadosPdf.descricao) setDescricao(dadosPdf.descricao);
          if (dadosPdf.valor) setValor(dadosPdf.valor);
          if (dadosPdf.formaPagamento) setFormaPagamento(dadosPdf.formaPagamento);
          if (dadosPdf.observacoes) setObservacoes(dadosPdf.observacoes);

          const descLower = (dadosPdf.descricao + ' ' + dadosPdf.fornecedor).toLowerCase();

          if (dadosPdf.tipoDocumento === 'NFE_PRODUTO') {
            setTipo('Produto');
            if (descLower.includes('toner') || descLower.includes('tinta') || descLower.includes('bobina') || descLower.includes('cartucho')) {
              setCategoria('Impressoras & Suprimentos (Toners, Peças)');
            } else if (descLower.includes('cabo') || descLower.includes('patch') || descLower.includes('rj45') || descLower.includes('switch') || descLower.includes('roteador')) {
              setCategoria('Redes & Conectividade (Switches, Roteadores, Cabos)');
            } else if (descLower.includes('ssd') || descLower.includes('memoria') || descLower.includes('notebook') || descLower.includes('computador') || descLower.includes('termica') || descLower.includes('elgin')) {
              setCategoria('Hardware (PCs, Notebooks, Servidores)');
            } else {
              setCategoria('Acessórios & Periféricos');
            }

            if (dadosPdf.numParcelas && dadosPdf.numParcelas > 1) {
              setModalidadePagamento('parcelado');
              setNumParcelas(dadosPdf.numParcelas);
              setStatusPagamento('Parcelado');
            } else {
              setModalidadePagamento('a_vista');
            }

            toast.success(
              `✨ DANFE (NF-e) Nº ${dadosPdf.numeroNf || 'importada'} lido com sucesso! ${dadosPdf.fornecedor} • ${formatCurrency(Number(dadosPdf.valor) || 0)}`
            );
          } else {
            // NFSE_SERVICO
            if (descLower.includes('contrato') || descLower.includes('manuten') || descLower.includes('mensal')) {
              setTipo('Contrato Mensal');
              setModalidadePagamento('recorrente_mensal');
            } else {
              setTipo('Serviço');
              setModalidadePagamento('a_vista');
            }
            setCategoria('Suporte & Serviços Especializados');
            toast.success(
              `✨ NFS-e Nº ${dadosPdf.numeroNf || 'importada'} lida com sucesso! ${dadosPdf.fornecedor} • ${formatCurrency(Number(dadosPdf.valor) || 0)}`
            );
          }

          // Verificação imediata de duplicidade do PDF
          setIgnorarAvisoDuplicidade(false);
          const dupCheckPdf = verificarDuplicidade(
            {
              codigo_ti: dadosPdf.codigoTi,
              fornecedor: dadosPdf.fornecedor,
              cnpj: dadosPdf.cnpj,
              valor: dadosPdf.valor,
              data_compra: dadosPdf.dataCompra,
              nome_arquivo_nf: file.name,
            },
            comprasExistentes
          );
          if (dupCheckPdf.isDuplicada) {
            toast.warning(
              `⚠️ Atenção: Esta Nota Fiscal já foi cadastrada anteriormente no sistema! (${dupCheckPdf.compraExistente?.codigo_ti || 'NF Existente'})`,
              { duration: 6000 }
            );
          }

          setErrors({});
        }
      } catch (pdfErr) {
        console.warn('Leitura de texto do PDF:', pdfErr);
      } finally {
        setIsParsingXml(false);
      }
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

  // Computações para a Modalidade Parcelada
  const valorNumerico = parseFloat(valor.replace(',', '.')) || 0;
  const valorParcelaCalculado = numParcelas > 0 ? valorNumerico / numParcelas : 0;
  const dataFinalParcelas = useMemo(() => {
    if (!dataCompra || numParcelas <= 1) return dataCompra;
    return addMonths(dataCompra, numParcelas - 1);
  }, [dataCompra, numParcelas]);

  // Computações para a Modalidade Recorrente Mensal
  const mesesRecorrentesCalculados = useMemo(() => {
    if (duracaoRecorrencia === 'fim_do_ano') {
      return calcularMesesRestantesAno(dataCompra);
    }
    if (duracaoRecorrencia === '6_meses') return 6;
    if (duracaoRecorrencia === 'personalizado') return Math.max(1, mesesPersonalizados || 1);
    return 12; // 12_meses
  }, [duracaoRecorrencia, dataCompra, mesesPersonalizados]);

  const valorTotalAnualRecorrente = valorNumerico * mesesRecorrentesCalculados;
  const dataFinalRecorrencia = useMemo(() => {
    if (!dataCompra || mesesRecorrentesCalculados <= 1) return dataCompra;
    return addMonths(dataCompra, mesesRecorrentesCalculados - 1);
  }, [dataCompra, mesesRecorrentesCalculados]);

  // Verificação inteligente de duplicidade em tempo real
  const duplicidadeAtual: ResultadoDuplicidade = useMemo(() => {
    if (compraEmEdicao?.id) return { isDuplicada: false };
    if (!fornecedor.trim() && !codigoTi.trim() && !nomeArquivoNf.trim()) return { isDuplicada: false };

    return verificarDuplicidade(
      {
        codigo_ti: codigoTi,
        fornecedor,
        cnpj,
        valor: valorNumerico,
        data_compra: dataCompra,
        nome_arquivo_nf: nomeArquivoNf,
      },
      comprasExistentes,
      compraEmEdicao?.id
    );
  }, [compraEmEdicao, fornecedor, codigoTi, cnpj, valorNumerico, dataCompra, nomeArquivoNf, comprasExistentes]);

  // Validação do formulário
  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!fornecedor.trim()) {
      novosErros.fornecedor = 'A razão social ou nome do fornecedor é obrigatório.';
    }

    if (!descricao.trim()) {
      novosErros.descricao = 'A descrição detalhada da compra é obrigatória.';
    }

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

  // Executa o salvamento no banco Supabase
  const executarSalvamento = async () => {
    setIsSaving(true);
    try {
      const isEditing = Boolean(compraEmEdicao?.id);

      // CASO 1: Edição de Registro Unitário Existente
      if (isEditing) {
        let parcelasFormatada = 'À vista';
        if (modalidadePagamento === 'parcelado') {
          parcelasFormatada = `${numParcelas}x de ${formatCurrency(valorParcelaCalculado)}`;
        } else if (modalidadePagamento === 'recorrente_mensal') {
          parcelasFormatada = `Recorrente Mensal (${mesesRecorrentesCalculados} meses)`;
        }

        const payload: Compra = {
          id: compraEmEdicao!.id,
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
          parcelas: parcelasFormatada,
          garantia: garantia ? garantia : null,
          link_nf: linkNf || null,
          nome_arquivo_nf: nomeArquivoNf || null,
          observacoes: observacoes.trim() || null,
        };

        await onSalvar(payload);
        toast.success('Lançamento atualizado com sucesso!');
        onClose();
        return;
      }

      // CASO 2: Nova Compra Parcelada com Desmembramento Automático em Lote
      if (modalidadePagamento === 'parcelado' && desmembrarParcelas && numParcelas > 1) {
        const baseParcela = Math.floor((valorNumerico / numParcelas) * 100) / 100;
        const restoCentavos = Number((valorNumerico - baseParcela * numParcelas).toFixed(2));

        const loteCompras: CompraInput[] = [];

        for (let i = 0; i < numParcelas; i++) {
          const valorDestaParcela = i === 0 ? Number((baseParcela + restoCentavos).toFixed(2)) : baseParcela;
          const dataDestaParcela = addMonths(dataCompra, i);
          const indicadorParcela = `${i + 1}/${numParcelas}`;

          loteCompras.push({
            codigo_ti: codigoTi.trim() ? `${codigoTi.trim()} (${indicadorParcela})` : null,
            data_compra: dataDestaParcela,
            tipo: tipo || 'Produto',
            fornecedor: fornecedor.trim(),
            cnpj: cnpj.replace(/\D/g, '') ? cnpj.trim() : null,
            descricao: `${descricao.trim()} (Parcela ${indicadorParcela})`,
            categoria: categoria.trim(),
            centro_custo: centroCusto.trim() || null,
            valor: valorDestaParcela,
            forma_pagamento: formaPagamento.trim() || null,
            status_pagamento: i === 0 ? statusPagamento : 'Pendente',
            parcelas: `Parcela ${indicadorParcela}`,
            garantia: garantia ? garantia : null,
            link_nf: linkNf || null,
            nome_arquivo_nf: nomeArquivoNf || null,
            observacoes: observacoes.trim() ? `${observacoes.trim()} | Parcelamento em ${numParcelas}x` : `Parcelamento em ${numParcelas}x`,
          });
        }

        await onSalvar(loteCompras);
        toast.success(`🎉 Lançamento desmembrado em ${numParcelas} parcelas mensais cadastradas com sucesso!`);
        onClose();
        return;
      }

      // CASO 3: Nova Despesa Recorrente Mensal com Geração Futura Automática
      if (modalidadePagamento === 'recorrente_mensal' && gerarMensalidadesFuturas && mesesRecorrentesCalculados > 1) {
        const loteRecorrente: CompraInput[] = [];

        for (let i = 0; i < mesesRecorrentesCalculados; i++) {
          const dataDesteMes = addMonths(dataCompra, i);
          const indicadorMes = `${i + 1}/${mesesRecorrentesCalculados}`;

          loteRecorrente.push({
            codigo_ti: codigoTi.trim() ? `${codigoTi.trim()} (${indicadorMes})` : null,
            data_compra: dataDesteMes,
            tipo: tipo || 'Contrato Mensal',
            fornecedor: fornecedor.trim(),
            cnpj: cnpj.replace(/\D/g, '') ? cnpj.trim() : null,
            descricao: `${descricao.trim()} (${indicadorMes})`,
            categoria: categoria.trim(),
            centro_custo: centroCusto.trim() || null,
            valor: valorNumerico,
            forma_pagamento: formaPagamento.trim() || null,
            status_pagamento: i === 0 ? statusPagamento : 'Pendente',
            parcelas: `Recorrente (${indicadorMes})`,
            garantia: garantia ? garantia : null,
            link_nf: i === 0 ? linkNf || null : null,
            nome_arquivo_nf: i === 0 ? nomeArquivoNf || null : null,
            observacoes: observacoes.trim()
              ? `${observacoes.trim()} | Recorrente Mensal (${mesesRecorrentesCalculados} meses)`
              : `Recorrência Mensal programada (${mesesRecorrentesCalculados} meses)`,
          });
        }

        await onSalvar(loteRecorrente);
        toast.success(`🔄 ${mesesRecorrentesCalculados} mensalidades recorrentes programadas no sistema!`);
        onClose();
        return;
      }

      // CASO 4: Lançamento Único Convencional (À vista ou registro consolidado)
      let parcelasFinal = 'À vista';
      if (modalidadePagamento === 'parcelado') {
        parcelasFinal = `${numParcelas}x de ${formatCurrency(valorParcelaCalculado)}`;
      } else if (modalidadePagamento === 'recorrente_mensal') {
        parcelasFinal = `Recorrente Mensal (${mesesRecorrentesCalculados} meses)`;
      }

      const payloadUnico: CompraInput = {
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
        parcelas: parcelasFinal,
        garantia: garantia ? garantia : null,
        link_nf: linkNf || null,
        nome_arquivo_nf: nomeArquivoNf || null,
        observacoes: observacoes.trim() || null,
      };

      await onSalvar(payloadUnico);
      toast.success('Compra cadastrada com sucesso!');
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar compra:', err);
      toast.error(err.message || 'Falha ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submissão do formulário com verificação e confirmação anti-duplicidade
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSaving || isUploadingFile || isParsingXml) return;

    if (!validarFormulario()) {
      toast.error('Preencha todos os campos obrigatórios destacados.');
      return;
    }

    // Se detectada duplicidade e o usuário ainda não confirmou explicitamente
    if (!compraEmEdicao && duplicidadeAtual.isDuplicada && !ignorarAvisoDuplicidade) {
      setIsConfirmandoDuplicidadeModal(true);
      return;
    }

    await executarSalvamento();
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
                  : 'Cadastre com 1 clique usando modelos, parcelamento inteligente ou despesas recorrentes mensais.'}
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
                
                {/* Botão de Importação XML / PDF da Nota Fiscal */}
                <div>
                  <input
                    ref={xmlInputRef}
                    type="file"
                    accept=".xml,application/pdf,text/xml,application/xml"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => xmlInputRef.current?.click()}
                    disabled={isParsingXml || isUploadingFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 shadow-xs transition-all hover:scale-[1.02]"
                    title="Selecione o arquivo .xml (NF-e) ou .pdf (NFS-e) para preencher tudo automaticamente sem digitar"
                  >
                    {isParsingXml ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
                    )}
                    <span>Importar Nota Fiscal (XML ou PDF)</span>
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

          {/* AVISO DE NOTA FISCAL DUPLICADA DETECTADA */}
          {duplicidadeAtual.isDuplicada && !ignorarAvisoDuplicidade && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-amber-950">
                      Atenção: Possível Nota Fiscal Duplicada Detectada!
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-200 text-amber-900 border border-amber-300">
                      Já Cadastrada
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                    {duplicidadeAtual.descricaoMotivo}
                  </p>

                  {duplicidadeAtual.compraExistente && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-white/90 border border-amber-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Lançamento Existente:</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {duplicidadeAtual.compraExistente.codigo_ti || 'Sem Código'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Data da Compra:</span>
                        <span className="font-semibold text-slate-700">
                          {formatDate(duplicidadeAtual.compraExistente.data_compra)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Valor Cadastrado:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {formatCurrency(duplicidadeAtual.compraExistente.valor)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCodigoTi('');
                        setFornecedor('');
                        setCnpj('');
                        setValor('');
                        setDataCompra(new Date().toISOString().split('T')[0]);
                        setDescricao('');
                        setLinkNf('');
                        setNomeArquivoNf('');
                        setObservacoes('');
                        setIgnorarAvisoDuplicidade(false);
                        toast.info('Formulário limpo para nova digitação.');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Limpar e Cancelar Importação
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIgnorarAvisoDuplicidade(true);
                        toast.warning('Aviso ignorado. O lançamento poderá ser cadastrado.');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Ignorar e Cadastrar Mesmo Assim (2ª Via / Nova Compra)
                    </button>
                  </div>
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
                  onChange={(e) => {
                    const novoTipo = e.target.value as TipoDespesa;
                    setTipo(novoTipo);
                    if (novoTipo === 'Assinatura Recorrente (SaaS)' || novoTipo === 'Contrato Mensal') {
                      setModalidadePagamento('recorrente_mensal');
                    }
                  }}
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

          {/* Seção 3: Valores, Prazos e Condição de Pagamento */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              Valores & Condições de Pagamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Valor (R$) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalidadePagamento === 'recorrente_mensal' ? 'Valor Mensal (R$)' : 'Valor Total (R$)'}{' '}
                  <span className="text-rose-500">*</span>
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

              {/* Data da Compra / 1ª Parcela */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalidadePagamento === 'a_vista' ? 'Data da Compra' : 'Data de Início (1º Mês)'}{' '}
                  <span className="text-rose-500">*</span>
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

              {/* Status do Pagamento (1º Mês / Compra) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status de Pagamento <span className="text-rose-500">*</span>
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

            {/* SELETOR INTERATIVO: MODALIDADE DE COBRANÇA & PERIODICIDADE */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Periodicidade & Duração do Pagamento:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Selecione apenas com 1 clique do mouse
                  </span>
                </label>

                {/* 3 Opções Principais com Botões Estilizados */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalidadePagamento('a_vista');
                      setStatusPagamento('Pago');
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      modalidadePagamento === 'a_vista'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>À Vista / Pagamento Único</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalidadePagamento('parcelado');
                      setStatusPagamento('Parcelado');
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      modalidadePagamento === 'parcelado'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Parcelado (X Vezes)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalidadePagamento('recorrente_mensal');
                      setStatusPagamento('Pago');
                      if (tipo === 'Produto') {
                        setTipo('Contrato Mensal');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      modalidadePagamento === 'recorrente_mensal'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                    <span>Recorrente Todo Mês</span>
                  </button>
                </div>
              </div>

              {/* SUBPAINEL: OPÇÕES DE PARCELAMENTO & DURAÇÃO */}
              {modalidadePagamento === 'parcelado' && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      Duração das Parcelas:
                    </span>

                    {/* Botões Rápidos de Parcelas */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[2, 3, 4, 5, 6, 10, 12].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNumParcelas(n)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            numParcelas === n
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}

                      {/* Campo para número de parcelas personalizado */}
                      <div className="flex items-center gap-1 ml-1">
                        <span className="text-[11px] text-slate-400 font-medium">Outro:</span>
                        <input
                          type="number"
                          min="2"
                          max="48"
                          value={numParcelas}
                          onChange={(e) => setNumParcelas(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-14 h-7 text-xs font-bold font-mono text-center rounded-md border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Cálculo da Parcela */}
                  {valorNumerico > 0 && (
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-blue-900 font-bold">
                          {numParcelas}x de {formatCurrency(valorParcelaCalculado)}/mês
                        </span>
                        <p className="text-[11px] text-blue-700">
                          Total acumulado: {formatCurrency(valorNumerico)} • Início em {dataCompra ? formatDate(dataCompra) : 'Hoje'} até {formatDate(dataFinalParcelas)}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-200/60 text-blue-800 text-[10px] font-bold self-start sm:self-auto">
                        Duração: {numParcelas} meses
                      </span>
                    </div>
                  )}

                  {/* Opção para desmembrar em lançamentos automáticos no sistema */}
                  {!isEditing && (
                    <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={desmembrarParcelas}
                        onChange={(e) => setDesmembrarParcelas(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-900">
                          Desmembrar e lançar automaticamente cada parcela no seu respectivo mês ({numParcelas} lançamentos)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Cria as parcelas nos meses correspondentes com vencimentos automáticos. A 1ª parcela fica com status "{statusPagamento}" e as seguintes como "Pendente".
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {/* SUBPAINEL: OPÇÕES DE RECORRÊNCIA MENSAL (TODO MÊS) */}
              {modalidadePagamento === 'recorrente_mensal' && (
                <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 pb-1 border-b border-indigo-100">
                    <Repeat className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-950">
                      Despesa Contínua / Contrato Mensal (Internet, SaaS, Manutenções)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Duração da Recorrência Mensal:
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setDuracaoRecorrencia('fim_do_ano')}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          duracaoRecorrencia === 'fim_do_ano'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Até o Fim do Ano</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          {calcularMesesRestantesAno(dataCompra)} meses restantes em {dataCompra ? dataCompra.slice(0, 4) : '2026'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDuracaoRecorrencia('12_meses')}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          duracaoRecorrencia === '12_meses'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                          <span>12 Meses (1 Ano)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Contrato anual padrão
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDuracaoRecorrencia('6_meses')}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          duracaoRecorrencia === '6_meses'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span>⏱️ 6 Meses</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Semestral
                        </p>
                      </button>

                      <div
                        className={`p-2 rounded-xl border text-xs transition-all ${
                          duracaoRecorrencia === 'personalizado'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <label
                          className="flex items-center gap-1 mb-1 font-bold cursor-pointer"
                          onClick={() => setDuracaoRecorrencia('personalizado')}
                        >
                          <span>Personalizado:</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={mesesPersonalizados}
                            onFocus={() => setDuracaoRecorrencia('personalizado')}
                            onChange={(e) => {
                              setDuracaoRecorrencia('personalizado');
                              setMesesPersonalizados(Math.max(1, parseInt(e.target.value) || 1));
                            }}
                            className="w-12 h-6 px-1 text-center font-bold text-xs bg-white border border-slate-300 rounded"
                          />
                          <span className="text-[10px] text-slate-500">meses</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Projeção Financeira do Custo Recorrente */}
                  {valorNumerico > 0 && (
                    <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-indigo-950 font-bold">
                          {formatCurrency(valorNumerico)} / mês durante {mesesRecorrentesCalculados} meses
                        </span>
                        <p className="text-[11px] text-indigo-800">
                          Previsão total de gastos: <strong>{formatCurrency(valorTotalAnualRecorrente)}</strong> (até {formatDate(dataFinalRecorrencia)})
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-900 text-[10px] font-bold self-start sm:self-auto">
                        {mesesRecorrentesCalculados} meses programados
                      </span>
                    </div>
                  )}

                  {/* Opção para gerar os lançamentos recorrentes no sistema */}
                  {!isEditing && (
                    <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={gerarMensalidadesFuturas}
                        onChange={(e) => setGerarMensalidadesFuturas(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-900">
                          Lançar automaticamente as {mesesRecorrentesCalculados} mensalidades no sistema para acompanhamento orçamentário
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Gera a despesa de cada mês automaticamente. O mês atual fica como "{statusPagamento}" e os meses seguintes ficam como "Pendente" para controle financeiro.
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Garantia e Código T.I */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Garantia / Licença até */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Garantia / Validade até (Opcional)
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
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {modalidadePagamento === 'parcelado' && desmembrarParcelas && !isEditing
                  ? `Serão gerados ${numParcelas} lançamentos mensais no Supabase.`
                  : modalidadePagamento === 'recorrente_mensal' && gerarMensalidadesFuturas && !isEditing
                  ? `Serão programadas ${mesesRecorrentesCalculados} mensalidades no Supabase.`
                  : 'Lançamento financeiro individual.'}
              </span>
            </div>

            <div className="flex items-center gap-2">
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
                    <span>
                      {isEditing
                        ? 'Salvar Alterações'
                        : modalidadePagamento === 'parcelado' && desmembrarParcelas
                        ? `Cadastrar ${numParcelas}x Parcelas`
                        : modalidadePagamento === 'recorrente_mensal' && gerarMensalidadesFuturas
                        ? `Programar ${mesesRecorrentesCalculados} Mensalidades`
                        : 'Confirmar & Cadastrar Compra'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Confirmação de Duplicidade */}
      {isConfirmandoDuplicidadeModal && duplicidadeAtual.compraExistente && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-amber-300 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Duplicidade de Nota Fiscal Detectada!
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Esta compra já possui um registro idêntico no banco.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-xs space-y-2 text-slate-700">
              <p className="font-semibold text-amber-900 leading-snug">
                {duplicidadeAtual.descricaoMotivo}
              </p>
              <div className="pt-2 border-t border-amber-200/80 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Código / NF:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {duplicidadeAtual.compraExistente.codigo_ti || 'S/N'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Valor Já Cadastrado:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(duplicidadeAtual.compraExistente.valor)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Data do Registro:</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(duplicidadeAtual.compraExistente.data_compra)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fornecedor:</span>
                  <span className="font-medium text-slate-700 truncate block" title={duplicidadeAtual.compraExistente.fornecedor}>
                    {duplicidadeAtual.compraExistente.fornecedor}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Deseja salvar mesmo assim (lançar nova via repetida) ou cancelar para evitar duplicidade financeira no relatório anual?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmandoDuplicidadeModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar e Não Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIgnorarAvisoDuplicidade(true);
                  setIsConfirmandoDuplicidadeModal(false);
                  executarSalvamento();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-colors cursor-pointer"
              >
                Sim, Salvar Lançamento Repetido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
