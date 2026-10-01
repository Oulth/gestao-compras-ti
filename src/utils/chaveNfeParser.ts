/**
 * Utilitário universal para decodificação matemática e semântica de:
 * 1. Chaves de Acesso de NF-e (44 dígitos - Mercadorias / Produtos)
 * 2. Chaves de Acesso de NFS-e Padrão Nacional (50 dígitos - Serviços / Contratos)
 * 3. Linhas Digitáveis de Boletos Bancários (47 dígitos)
 * 4. Números sequenciais de Notas Fiscais (1 a 9 dígitos)
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
  tipoDespesaSugerido: 'Produto' | 'Serviço';
  categoriaSugerida?: string;
  dataCompraSugerida?: string;
  valorSugerido?: string;
  descricaoSugerida?: string;
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

/**
 * Decodifica uma chave de acesso de NF-e (44 dígitos), NFS-e Nacional (50 dígitos),
 * Boleto Bancário (47 dígitos) ou número simples de nota fiscal.
 */
export function decodificarChaveNfe(chaveInput: string): ChaveNfeDecodificada | null {
  if (!chaveInput) return null;
  const limpa = chaveInput.replace(/\D/g, '');
  if (!limpa) return null;

  // CASO 1: NFS-e Padrão Nacional (50 dígitos)
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
      tipoDespesaSugerido: 'Serviço',
      categoriaSugerida: 'Suporte & Serviços Especializados',
      dataCompraSugerida: `${ano}-${mes}-01`,
      mensagem: `NFS-e Nacional decodificada: NFS-e Nº ${numeroNf} (${ufSigla}). Prestador CNPJ: ${cnpj}.`,
    };
  }

  // CASO 2: NF-e Mercadorias / Produtos (44 dígitos)
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
      tipoDespesaSugerido: 'Produto',
      categoriaSugerida: 'Hardware (PCs, Notebooks, Servidores)',
      dataCompraSugerida: `${ano}-${mes}-01`,
      mensagem: `NF-e decodificada: NF Nº ${numeroNf} (${ufSigla}). Fornecedor CNPJ: ${cnpj}.`,
    };
  }

  // CASO 3: Linha Digitável de Boleto Bancário (47 dígitos)
  // Nos boletos, os últimos 10 dígitos (posições 37 a 47) representam o valor do título em centavos
  if (limpa.length === 47) {
    const valorCentavos = parseInt(limpa.slice(37, 47), 10);
    const valorReais = (valorCentavos / 100).toFixed(2);
    const fatorVencimento = parseInt(limpa.slice(33, 37), 10);

    let dataSugerida = '';
    if (fatorVencimento > 1000) {
      // Fator base inicial: 07/10/1997. Após 22/02/2025 há virada do fator.
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
      mensagem: `Linha digitável de boleto decodificada: Valor R$ ${valorReais.replace('.', ',')}.`,
    };
  }

  // CASO 4: Número sequencial simples de Nota Fiscal (1 a 9 dígitos)
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
