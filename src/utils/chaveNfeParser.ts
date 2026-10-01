import { Compra, StatusPagamento, TipoDespesa } from '../types';

/**
 * Utilitário universal para decodificação matemática e semântica de:
 * 1. Chaves de Acesso de NF-e (44 dígitos - Mercadorias / Produtos)
 * 2. Chaves de Acesso de NFS-e Padrão Nacional (50 dígitos - Serviços / Contratos)
 * 3. Linhas Digitáveis de Boletos Bancários (47 dígitos)
 * 4. Números sequenciais de Notas Fiscais (1 a 9 dígitos)
 * 5. Catálogo integrado de notas fiscais da instituição para preenchimento de itens e valores
 */

export type TipoDocumentoFiscal = 'NFE_PRODUTO' | 'NFSE_SERVICO' | 'BOLETO' | 'NUMERO_SIMPLES';

export interface ChaveNfeDecodificada {
  valida: boolean;
  chaveLimpa: string;
  tipoDocumento: TipoDocumentoFiscal;
  ufCodigo?: string;
  ufSigla?: string;
  ano?: string;
  mes?: string;
  cnpj?: string;
  modelo?: string;
  serie?: string;
  numeroNf: string;
  codigoTi: string;
  fornecedorSugerido?: string;
  tipoDespesaSugerido: TipoDespesa;
  categoriaSugerida?: string;
  centroCustoSugerido?: string;
  dataCompraSugerida?: string;
  valorSugerido?: string;
  descricaoSugerida?: string;
  formaPagamentoSugerida?: string;
  statusPagamentoSugerido?: StatusPagamento;
  modalidadeSugerida?: 'a_vista' | 'parcelado' | 'recorrente_mensal';
  numParcelasSugerido?: number;
  observacoesSugeridas?: string;
  mensagem: string;
}

const UF_MAP: Record<string, string> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
};

interface NotaConhecidaCatalogo {
  tipoDocumento: TipoDocumentoFiscal;
  numeroNf: string;
  codigoTi: string;
  fornecedor: string;
  cnpj: string;
  valor: string;
  dataCompra: string;
  descricao: string;
  categoria: string;
  centroCusto?: string;
  tipoDespesa: TipoDespesa;
  formaPagamento?: string;
  statusPagamento?: 'Pago' | 'Pendente' | 'Parcelado';
  modalidade?: 'a_vista' | 'parcelado' | 'recorrente_mensal';
  numParcelas?: number;
  observacoes?: string;
  ufSigla?: string;
  ufCodigo?: string;
}

/**
 * Catálogo inteligente de notas fiscais reais da instituição.
 * Permite identificar itens, descrições completas e valores totais diretamente
 * a partir da chave de acesso ou do número da nota fiscal.
 */
const CATALOGO_NOTAS_CONHECIDAS: Record<string, NotaConhecidaCatalogo> = {
  // 1. SAET MULTISERVICOS (NFS-e 4586 - PREDUCACIONAL)
  '23052331218408472000143000000000458626092953475112': {
    tipoDocumento: 'NFSE_SERVICO',
    numeroNf: '4586',
    codigoTi: 'NFS-4586',
    fornecedor: 'SAET MULTISERVICOS LTDA',
    cnpj: '18.408.472/0001-43',
    valor: '366.00',
    dataCompra: '2026-09-18',
    descricao: '• Contrato de Manutenção em Sistema (Assistência Técnica de T.I - SAET Multiserviços) [R$ 366,00]',
    categoria: 'Suporte & Serviços Especializados',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Contrato Mensal',
    formaPagamento: 'PIX',
    statusPagamento: 'Pago',
    modalidade: 'recorrente_mensal',
    observacoes: 'Chave PIX: atendimento@gruposaet.com.br | Banco Itaú Ag: 6378 CC: 13080-8',
    ufSigla: 'CE',
    ufCodigo: '23',
  },

  // 2. SAET MULTISERVICOS (NFS-e 4587 - MANA EDUCADORA)
  '23052331218408472000143000000000458726096048000560': {
    tipoDocumento: 'NFSE_SERVICO',
    numeroNf: '4587',
    codigoTi: 'NFS-4587',
    fornecedor: 'SAET MULTISERVICOS LTDA',
    cnpj: '18.408.472/0001-43',
    valor: '183.00',
    dataCompra: '2026-09-18',
    descricao: '• Contrato de Manutenção em Sistema (Assistência Técnica de T.I - SAET Multiserviços) [R$ 183,00]',
    categoria: 'Suporte & Serviços Especializados',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Contrato Mensal',
    formaPagamento: 'PIX',
    statusPagamento: 'Pago',
    modalidade: 'recorrente_mensal',
    observacoes: 'Chave PIX: atendimento@gruposaet.com.br | Banco Itaú Ag: 6378 CC: 13080-8',
    ufSigla: 'CE',
    ufCodigo: '23',
  },

  // 3. SAET MULTISERVICOS (NFS-e 4585 - RIKA EDUCACIONAL)
  '23052331218408472000143000000000458526095893861578': {
    tipoDocumento: 'NFSE_SERVICO',
    numeroNf: '4585',
    codigoTi: 'NFS-4585',
    fornecedor: 'SAET MULTISERVICOS LTDA',
    cnpj: '18.408.472/0001-43',
    valor: '366.00',
    dataCompra: '2026-09-18',
    descricao: '• Contrato de Manutenção em Sistema (Assistência Técnica de T.I - SAET Multiserviços) [R$ 366,00]',
    categoria: 'Suporte & Serviços Especializados',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Contrato Mensal',
    formaPagamento: 'PIX',
    statusPagamento: 'Pago',
    modalidade: 'recorrente_mensal',
    observacoes: 'Chave PIX: atendimento@gruposaet.com.br | Banco Itaú Ag: 6378 CC: 13080-8',
    ufSigla: 'CE',
    ufCodigo: '23',
  },

  // 4. TECNO INDUSTRIA (NF-e 1747050 - Impressora Térmica Elgin, Adaptadores, Cabos)
  '23260807272825000457550010017470501017470515': {
    tipoDocumento: 'NFE_PRODUTO',
    numeroNf: '1747050',
    codigoTi: 'NF-1747050',
    fornecedor: 'TECNO INDUSTRIA E COMERCIO DE COMPUTADORES LTDA',
    cnpj: '07.272.825/0004-57',
    valor: '2044.00',
    dataCompra: '2026-08-27',
    descricao:
      '• 1x IMP TERMICA ELGIN USB MP4200 HS [R$ 796,00]\n• 12x CABO ADAPT USB3 0 P RJ45 10 100 1000 GET [R$ 754,29]\n• 4x CABO HDMI 2 0 4K 3M 3D PVC GET [R$ 60,00]\n• 4x LIMPADOR DE TELAS 120ML GET [R$ 36,00]\n• 6x CARREG PAREDE 20W USB C +USB 3 0 BC GET [R$ 264,00]\n• 6x CABO USB 3 1 P USB C 1 5M PT GET [R$ 96,00]',
    categoria: 'Hardware (PCs, Notebooks, Servidores)',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Produto',
    formaPagamento: 'Boleto Bancário',
    statusPagamento: 'Parcelado',
    modalidade: 'parcelado',
    numParcelas: 2,
    observacoes: 'Duplicatas: Parc 001: 24/09/2026 R$ 1.022,00 | Parc 002: 08/10/2026 R$ 1.022,00',
    ufSigla: 'CE',
    ufCodigo: '23',
  },

  // 5. COMERCIAL BRASIL (NF-e 152636 - Adaptadores POE e Conectores RJ45)
  '23260809113843000683550010001526361410541487': {
    tipoDocumento: 'NFE_PRODUTO',
    numeroNf: '152636',
    codigoTi: 'NF-152636',
    fornecedor: 'COMERCIAL BRASIL DIST. EQUIP. DE INFORMATICA LTDA',
    cnpj: '09.113.843/0006-83',
    valor: '804.00',
    dataCompra: '2026-08-18',
    descricao:
      '• 32x ADAPTADOR POE UN [R$ 640,00]\n• 4x CONECTOR RJ45 CAT5E PASSAGEM PCT 50 UN [R$ 164,00]',
    categoria: 'Redes & Conectividade (Switches, Roteadores, Cabos)',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Produto',
    formaPagamento: 'Boleto Bancário',
    statusPagamento: 'Pago',
    modalidade: 'a_vista',
    observacoes: 'Vencimento do boleto: 17/09/2026',
    ufSigla: 'CE',
    ufCodigo: '23',
  },

  // 6. TOMAISZAP (NFS-e 17896 - Plataforma TomaisZap)
  '31432031253455724000196260000001789626090000489265': {
    tipoDocumento: 'NFSE_SERVICO',
    numeroNf: '17896',
    codigoTi: 'NFS-17896',
    fornecedor: 'TOMAISZAP PLATAFORMA DE COMUNICACAO LTDA',
    cnpj: '53.455.724/0001-96',
    valor: '273.90',
    dataCompra: '2026-09-25',
    descricao: 'Cessão de direito de uso de sistema - Licenciamento de software TomaisZap',
    categoria: 'Software & Licenças (SaaS, SO, Antivírus)',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Assinatura Recorrente (SaaS)',
    formaPagamento: 'Boleto Bancário',
    statusPagamento: 'Pago',
    modalidade: 'recorrente_mensal',
    ufSigla: 'MG',
    ufCodigo: '31',
  },

  // 7. BRISANET TELECOMUNICACOES (NF 7004701 - Internet Link Dedicado)
  '7004701': {
    tipoDocumento: 'NFSE_SERVICO',
    numeroNf: '7004701',
    codigoTi: 'NF-7004701',
    fornecedor: 'BRISANET SERVICOS DE TELECOMUNICACOES S.A.',
    cnpj: '04.601.397/0001-28',
    valor: '488.90',
    dataCompra: '2026-09-01',
    descricao: 'Serviço de Telecomunicação / Internet Fibra Óptica Corporativa Dedicada Brisanet',
    categoria: 'Redes & Conectividade (Switches, Roteadores, Cabos)',
    centroCusto: 'Tecnologia da Informação',
    tipoDespesa: 'Contrato Mensal',
    formaPagamento: 'Boleto Bancário',
    statusPagamento: 'Pago',
    modalidade: 'recorrente_mensal',
    ufSigla: 'CE',
    ufCodigo: '23',
  },
};

// Aliases pelo número da nota fiscal para preenchimento rápido
const ALIASES_NUMEROS: Record<string, string> = {
  '4586': '23052331218408472000143000000000458626092953475112',
  '4587': '23052331218408472000143000000000458726096048000560',
  '4585': '23052331218408472000143000000000458526095893861578',
  '17896': '31432031253455724000196260000001789626090000489265',
  '1747050': '23260807272825000457550010017470501017470515',
  '152636': '23260809113843000683550010001526361410541487',
};

/**
 * Decodifica uma chave de acesso de NF-e (44 dígitos), NFS-e Nacional (50 dígitos),
 * Boleto Bancário (47 dígitos) ou número simples de nota fiscal.
 * Consulta o catálogo de notas conhecidas e o histórico de compras para preencher produtos e valores.
 */
export function decodificarChaveNfe(
  chaveInput: string,
  comprasExistentes?: Compra[]
): ChaveNfeDecodificada | null {
  if (!chaveInput) return null;
  const limpa = chaveInput.replace(/\D/g, '');
  if (!limpa) return null;

  // 1. VERIFICAÇÃO NO CATÁLOGO INTEGRADO DE NOTAS CONHECIDAS (Pela chave exata ou número da NF)
  const chaveCatalogo = CATALOGO_NOTAS_CONHECIDAS[limpa] ? limpa : ALIASES_NUMEROS[limpa];
  if (chaveCatalogo && CATALOGO_NOTAS_CONHECIDAS[chaveCatalogo]) {
    const item = CATALOGO_NOTAS_CONHECIDAS[chaveCatalogo];
    const valorFormatado = Number(item.valor).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      valida: true,
      chaveLimpa: limpa,
      tipoDocumento: item.tipoDocumento,
      ufCodigo: item.ufCodigo,
      ufSigla: item.ufSigla,
      cnpj: item.cnpj,
      numeroNf: item.numeroNf,
      codigoTi: item.codigoTi,
      fornecedorSugerido: item.fornecedor,
      tipoDespesaSugerido: item.tipoDespesa,
      categoriaSugerida: item.categoria,
      centroCustoSugerido: item.centroCusto,
      dataCompraSugerida: item.dataCompra,
      valorSugerido: item.valor,
      descricaoSugerida: item.descricao,
      formaPagamentoSugerida: item.formaPagamento,
      statusPagamentoSugerido: item.statusPagamento,
      modalidadeSugerida: item.modalidade,
      numParcelasSugerido: item.numParcelas,
      observacoesSugeridas: item.observacoes,
      mensagem: `Nota localizada no catálogo: ${item.fornecedor} - R$ ${valorFormatado}. Dados e itens preenchidos!`,
    };
  }

  // 2. VERIFICAÇÃO NO HISTÓRICO DE COMPRAS SALVAS NO SISTEMA
  if (comprasExistentes && comprasExistentes.length > 0) {
    const compraHistorico = comprasExistentes.find((c) => {
      const codLimpo = (c.codigo_ti || '').replace(/\D/g, '');
      const arquivoLimpo = (c.nome_arquivo_nf || '').replace(/\D/g, '');
      const linkLimpo = (c.link_nf || '').replace(/\D/g, '');
      return (
        (codLimpo && codLimpo === limpa) ||
        (arquivoLimpo && arquivoLimpo.includes(limpa)) ||
        (linkLimpo && linkLimpo.includes(limpa)) ||
        (limpa.length >= 4 && (c.codigo_ti || '').toLowerCase().includes(limpa))
      );
    });

    if (compraHistorico) {
      const numNf = (compraHistorico.codigo_ti || '').replace(/\D/g, '') || limpa;
      const valorStr = String(compraHistorico.valor || '');
      const valorFormatado = Number(compraHistorico.valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return {
        valida: true,
        chaveLimpa: limpa,
        tipoDocumento: compraHistorico.tipo === 'Produto' ? 'NFE_PRODUTO' : 'NFSE_SERVICO',
        cnpj: compraHistorico.cnpj || undefined,
        numeroNf: numNf,
        codigoTi: compraHistorico.codigo_ti || `NF-${numNf}`,
        fornecedorSugerido: compraHistorico.fornecedor,
        tipoDespesaSugerido: compraHistorico.tipo,
        categoriaSugerida: compraHistorico.categoria,
        centroCustoSugerido: compraHistorico.centro_custo || undefined,
        dataCompraSugerida: compraHistorico.data_compra ? compraHistorico.data_compra.slice(0, 10) : undefined,
        valorSugerido: valorStr,
        descricaoSugerida: compraHistorico.descricao,
        formaPagamentoSugerida: compraHistorico.forma_pagamento || undefined,
        statusPagamentoSugerido: compraHistorico.status_pagamento,
        observacoesSugeridas: compraHistorico.observacoes || undefined,
        mensagem: `Dados carregados do histórico do sistema: ${compraHistorico.fornecedor} - R$ ${valorFormatado}.`,
      };
    }
  }

  // 3. DECODIFICAÇÃO MATEMÁTICA: NFS-e Padrão Nacional (50 dígitos)
  // Estrutura: 7 dígitos IBGE + 2 dígitos tipo/modelo + 14 dígitos CNPJ + 13 dígitos Nº NFS-e + 4 dígitos AAMM + 9 dígitos código + 1 dígito DV
  if (limpa.length === 50) {
    const ufCodigo = limpa.slice(0, 2);
    const cnpjRaw = limpa.slice(9, 23);
    const numRaw = limpa.slice(23, 36);
    const aamm = limpa.slice(36, 40);
    const ano = `20${aamm.slice(0, 2)}`;
    const mes = aamm.slice(2, 4);
    const numeroNf = String(parseInt(numRaw, 10) || numRaw);
    const cnpj = cnpjRaw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const ufSigla = UF_MAP[ufCodigo] || 'BR';

    // Busca fornecedor no histórico por CNPJ
    const compraMesmoCnpj = comprasExistentes?.find(
      (c) => c.cnpj && c.cnpj.replace(/\D/g, '') === cnpjRaw
    );

    return {
      valida: true,
      chaveLimpa: limpa,
      tipoDocumento: 'NFSE_SERVICO',
      ufCodigo,
      ufSigla,
      ano,
      mes,
      cnpj,
      numeroNf,
      codigoTi: `NFS-${numeroNf}`,
      fornecedorSugerido: compraMesmoCnpj?.fornecedor || undefined,
      tipoDespesaSugerido: compraMesmoCnpj?.tipo || 'Serviço',
      categoriaSugerida: compraMesmoCnpj?.categoria || 'Suporte & Serviços Especializados',
      centroCustoSugerido: compraMesmoCnpj?.centro_custo || 'Tecnologia da Informação',
      formaPagamentoSugerida: compraMesmoCnpj?.forma_pagamento || undefined,
      descricaoSugerida: compraMesmoCnpj?.descricao || `Prestação de Serviços Especializados de T.I (NFS-e Nº ${numeroNf})`,
      valorSugerido: compraMesmoCnpj?.valor ? String(compraMesmoCnpj.valor) : undefined,
      dataCompraSugerida: `${ano}-${mes}-01`,
      mensagem: `NFS-e Nacional decodificada: NFS-e Nº ${numeroNf} (${ufSigla}). Prestador CNPJ: ${cnpj}.`,
    };
  }

  // 4. DECODIFICAÇÃO MATEMÁTICA: NF-e Mercadorias / Produtos (44 dígitos)
  // Estrutura: 2 UF + 4 AAMM + 14 CNPJ + 2 Modelo + 3 Série + 9 Nº NF + 1 TpEmis + 8 Cód + 1 DV
  if (limpa.length === 44) {
    const ufCodigo = limpa.slice(0, 2);
    const aamm = limpa.slice(2, 6);
    const ano = `20${aamm.slice(0, 2)}`;
    const mes = aamm.slice(2, 4);
    const cnpjRaw = limpa.slice(6, 20);
    const modelo = limpa.slice(20, 22);
    const serie = limpa.slice(22, 25);
    const nNfRaw = limpa.slice(25, 34);
    const numeroNf = String(parseInt(nNfRaw, 10) || nNfRaw);
    const cnpj = cnpjRaw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const ufSigla = UF_MAP[ufCodigo] || 'BR';

    // Busca fornecedor no histórico por CNPJ
    const compraMesmoCnpj = comprasExistentes?.find(
      (c) => c.cnpj && c.cnpj.replace(/\D/g, '') === cnpjRaw
    );

    return {
      valida: true,
      chaveLimpa: limpa,
      tipoDocumento: 'NFE_PRODUTO',
      ufCodigo,
      ufSigla,
      ano,
      mes,
      cnpj,
      modelo,
      serie,
      numeroNf,
      codigoTi: `NF-${numeroNf}`,
      fornecedorSugerido: compraMesmoCnpj?.fornecedor || undefined,
      tipoDespesaSugerido: 'Produto',
      categoriaSugerida: compraMesmoCnpj?.categoria || 'Hardware (PCs, Notebooks, Servidores)',
      centroCustoSugerido: compraMesmoCnpj?.centro_custo || 'Tecnologia da Informação',
      formaPagamentoSugerida: compraMesmoCnpj?.forma_pagamento || undefined,
      descricaoSugerida: compraMesmoCnpj?.descricao || `Aquisição de Materiais / Equipamentos de T.I (NF Nº ${numeroNf})`,
      valorSugerido: compraMesmoCnpj?.valor ? String(compraMesmoCnpj.valor) : undefined,
      dataCompraSugerida: `${ano}-${mes}-01`,
      mensagem: `NF-e decodificada: NF Nº ${numeroNf} (${ufSigla}). Fornecedor CNPJ: ${cnpj}.`,
    };
  }

  // 5. Linha Digitável de Boleto Bancário (47 dígitos)
  if (limpa.length === 47) {
    const valorCentavos = parseInt(limpa.slice(37, 47), 10);
    const valorReais = (valorCentavos / 100).toFixed(2);
    const fatorVencimento = parseInt(limpa.slice(33, 37), 10);

    let dataSugerida = '';
    if (fatorVencimento > 1000) {
      const dataBase = new Date(1997, 9, 7);
      const dataVenc = new Date(dataBase.getTime() + fatorVencimento * 24 * 60 * 60 * 1000);
      dataSugerida = dataVenc.toISOString().split('T')[0];
    }

    return {
      valida: true,
      chaveLimpa: limpa,
      tipoDocumento: 'BOLETO',
      numeroNf: limpa.slice(0, 5),
      codigoTi: `BOL-${limpa.slice(0, 5)}`,
      tipoDespesaSugerido: 'Produto',
      valorSugerido: valorReais,
      dataCompraSugerida: dataSugerida || new Date().toISOString().split('T')[0],
      formaPagamentoSugerida: 'Boleto Bancário',
      mensagem: `Linha digitável de boleto decodificada: Valor R$ ${valorReais.replace('.', ',')}.`,
    };
  }

  // 6. Número sequencial simples de Nota Fiscal (1 a 9 dígitos)
  if (limpa.length >= 1 && limpa.length <= 9) {
    return {
      valida: true,
      chaveLimpa: limpa,
      tipoDocumento: 'NUMERO_SIMPLES',
      numeroNf: limpa,
      codigoTi: `NF-${limpa}`,
      tipoDespesaSugerido: 'Produto',
      dataCompraSugerida: new Date().toISOString().split('T')[0],
      mensagem: `Número de nota fiscal definido como NF-${limpa}.`,
    };
  }

  return null;
}
