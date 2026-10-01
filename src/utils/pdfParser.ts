/**
 * Utilitário universal para leitura e extração automática de dados de Notas Fiscais em PDF:
 * 1. NF-e (DANFE - Documento Auxiliar da Nota Fiscal Eletrônica - Produtos / Mercadorias)
 * 2. NFS-e (DANFSe - Documento Auxiliar da Nota Fiscal de Serviços - Serviços / Contratos)
 */
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Configura o worker do PDF.js localmente na mesma origem
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface DadosNotaFiscalPdfExtraidos {
  tipoDocumento: 'NFE_PRODUTO' | 'NFSE_SERVICO';
  fornecedor: string;
  cnpj: string;
  numeroNf: string;
  codigoTi: string;
  dataCompra: string;
  descricao: string;
  valor: string;
  formaPagamento?: string;
  chavePix?: string;
  chaveAcesso?: string;
  observacoes?: string;
  numParcelas?: number;
}

/**
 * Extrai dados de um DANFE (NF-e Modelo 55 - Produtos / Hardware / Suprimentos)
 */
function extrairDadosDanfe(text: string): DadosNotaFiscalPdfExtraidos {
  // 1. Razão Social / Nome do Emitente
  const emitMatch =
    text.match(/RECEBEMOS DE\s+([A-Z0-9\s\.\-\&\/]+?)(?=\s+OS PRODUTOS|\s+CONSTANTES)/i) ||
    text.match(/DANFE[\s\S]*?Nº\s*\d+[\s\S]*?([A-Z0-9\s\.\-\&\/]{5,80}?)(?=\s+RUA|\s+AV|\s+RODOVIA|\s+CEP|\s+DESTINATÁRIO)/i);
  const fornecedor = emitMatch ? emitMatch[1].trim() : 'FORNECEDOR IDENTIFICADO VIA DANFE';

  // 2. CNPJ do Emitente (busca no bloco anterior a DESTINATÁRIO)
  const textBeforeDest = text.split(/DESTINAT[ÁA]RIO/i)[0] || text;
  const cnpjMatch =
    textBeforeDest.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/) ||
    text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/);
  const cnpj = cnpjMatch ? cnpjMatch[0] : '';

  // 3. Número da Nota Fiscal
  const nfMatch = text.match(/Nº\s*([0-9\.]+)/i);
  const numeroNf = nfMatch ? nfMatch[1].replace(/\./g, '') : '';

  // 4. Data de Emissão (formato YYYY-MM-DD)
  const dateMatch =
    text.match(/Data de emiss[ãa]o:\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
    text.match(/DATA EMISSÃO[\s\S]*?(\d{2})\/(\d{2})\/(\d{4})/i) ||
    text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const dataCompra = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : new Date().toISOString().split('T')[0];

  // 5. Valor Total da Nota
  const valMatch =
    text.match(/Valor Total da Nota[\s\S]*?R\$\s*([\d\.\,]+)/i) ||
    text.match(/Valor:\s*R\$\s*([\d\.\,]+)/i) ||
    text.match(/V\. TOTAL DA NOTA[\s\S]*?R\$\s*([\d\.\,]+)/i);
  let valor = '';
  if (valMatch) {
    const rawVal = valMatch[1].trim();
    if (rawVal.includes('.') && rawVal.includes(',')) {
      valor = rawVal.replace(/\./g, '').replace(',', '.');
    } else if (rawVal.includes(',')) {
      valor = rawVal.replace(',', '.');
    } else {
      valor = rawVal;
    }
  }

  // 6. Chave de Acesso (44 dígitos da NF-e)
  const chaveMatch = text.match(/\b(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})\b/);
  const chaveAcesso = chaveMatch ? chaveMatch[1].replace(/\s+/g, '') : '';

  // 7. Lista Completa de Itens e Produtos
  const prodSection = text.match(
    /DADOS DO PRODUTOS\s*\/\s*SERVIÇOS[\s\S]*?(?=CALCULO DO ISSQN|INFORMAÇÕES COMPLEMENTARES|VERSÃO DO SISTEMA|$)/i
  );
  const itens: string[] = [];
  if (prodSection) {
    const regex = /(\d{4,8})\s+(\*{0,3}[A-Z0-9\s\.\-\/\+]+?)\s+(\d{8})\s+[\d\s]+\s+([A-Z]{2,4})\s+([\d\.\,]+)\s+([\d\.\,]+)\s+([\d\.\,]+)/g;
    const matches = [...prodSection[0].matchAll(regex)];
    for (const m of matches) {
      const qtd = m[5].replace(',', '.');
      const nome = m[2].replace(/^\*+/, '').trim();
      const vTot = m[7];
      itens.push(`• ${qtd}x ${nome} [R$ ${vTot}]`);
    }
  }

  // 8. Duplicatas / Parcelas
  const dupMatches = [...text.matchAll(/(\d{3})\s+(\d{2}\/\d{2}\/\d{4})\s+R\$\s*([\d\.\,]+)/g)];
  let observacoes = '';
  if (dupMatches.length > 0) {
    observacoes = 'Duplicatas: ' + dupMatches.map((d) => `Parc ${d[1]}: ${d[2]} R$ ${d[3]}`).join(' | ');
  }

  // 9. Forma de Pagamento
  let formaPagamento = 'Boleto Bancário';
  if (/BOLETO/i.test(text)) {
    formaPagamento = 'Boleto Bancário';
  } else if (/PIX/i.test(text)) {
    formaPagamento = 'PIX';
  } else if (/CART[ÃA]O/i.test(text)) {
    formaPagamento = 'Cartão de Crédito Corporativo';
  }

  return {
    tipoDocumento: 'NFE_PRODUTO',
    fornecedor: fornecedor.toUpperCase(),
    cnpj,
    numeroNf,
    codigoTi: numeroNf ? `NF-${numeroNf}` : '',
    dataCompra,
    descricao: itens.length > 0 ? itens.join('\n') : 'Aquisição de mercadorias conforme DANFE',
    valor,
    formaPagamento,
    chaveAcesso,
    observacoes,
    numParcelas: dupMatches.length > 1 ? dupMatches.length : undefined,
  };
}

/**
 * Extrai dados de um DANFSe (NFS-e - Nota Fiscal de Serviços)
 */
function extrairDadosNfse(text: string): DadosNotaFiscalPdfExtraidos {
  // 1. Prestador / Fornecedor
  const matchPrestador =
    text.match(
      /PRESTADOR[\s\S]*?Nome\s*\/\s*Nome Empresarial\s+([A-Z0-9\s\.\-\&]+?)(?=\s+Munic[íi]pio|\s+Endere[çc]o|\s+E-mail|\s+Telefone|\s+C[óo]digo)/i
    ) || text.match(/Nome Empresarial\s+([A-Z0-9\s\.\-\&]+?)(?=\s+CNPJ|\s+Endere[çc]o)/i);
  const prestador = matchPrestador ? matchPrestador[1].trim() : '';

  // 2. CNPJ do Prestador
  const matchCnpj =
    text.match(/PRESTADOR[\s\S]*?(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})/i) ||
    text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/);
  const cnpj = matchCnpj ? matchCnpj[1] : '';

  // 3. Número da NFS-e
  const matchNumero =
    text.match(/N[ÚU]MERO DA NFS-E\s*(\d+)/i) ||
    text.match(/N[úu]mero da Nota:?\s*(\d+)/i) ||
    text.match(/NFS-e\s*N[ºo]?\s*(\d+)/i);
  const numeroNfs = matchNumero ? matchNumero[1] : '';

  // 4. Data de Emissão / Competência
  const matchData =
    text.match(/(?:DATA E HORA DA EMISS[ÃA]O|COMPET[ÊE]NCIA DA NFS-E)\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
    text.match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
    text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const dataCompra = matchData ? `${matchData[3]}-${matchData[2]}-${matchData[1]}` : new Date().toISOString().split('T')[0];

  // 5. Descrição do Serviço
  const matchDesc =
    text.match(/Descri[çc][ãa]o do Servi[çc]o\s+([\s\S]+?)(?=\s+TRIBUTA[ÇC][ÃA]O|\s+VALOR TOTAL|\s+Total Dedu|\s+C[óo]digo)/i) ||
    text.match(/Discrimina[çc][ãa]o dos Servi[çc]os:?\s+([\s\S]+?)(?=\s+VALOR|\s+Total)/i);
  const descricao = matchDesc ? matchDesc[1].trim() : 'Prestação de Serviços Especializados de T.I';

  // 6. Valor Líquido / Total
  const matchValor =
    text.match(/Valor (?:L[íi]quido da NFS-e|da Opera[çc][ãa]o\s*\/\s*Servi[çc]o)\s*R\$\s*([\d\.\,]+)/i) ||
    text.match(/VALOR TOTAL.*?R\$\s*([\d\.\,]+)/i) ||
    text.match(/Valor Total da Nota:?\s*R\$\s*([\d\.\,]+)/i);
  let valor = '';
  if (matchValor) {
    const rawVal = matchValor[1].trim();
    if (rawVal.includes('.') && rawVal.includes(',')) {
      valor = rawVal.replace(/\./g, '').replace(',', '.');
    } else if (rawVal.includes(',')) {
      valor = rawVal.replace(',', '.');
    } else {
      valor = rawVal;
    }
  }

  // 7. Dados Bancários / Chave PIX
  const matchPix = text.match(/chave\s*pix:?\s*([^\s\|;]+)/i);
  const matchBanco = text.match(/Inf\.\s*Cont\.:?\s*([\s\S]+?)(?=\s*\|\s*Totais|\s*CANHOTO|$)/i);
  const observacoes = matchBanco ? matchBanco[1].trim() : matchPix ? `Chave PIX para pagamento: ${matchPix[1]}` : '';

  return {
    tipoDocumento: 'NFSE_SERVICO',
    fornecedor: prestador.toUpperCase(),
    cnpj,
    numeroNf: numeroNfs,
    codigoTi: numeroNfs ? `NFS-${numeroNfs}` : '',
    dataCompra,
    descricao,
    valor,
    formaPagamento: matchPix ? 'PIX' : 'Boleto Bancário',
    chavePix: matchPix ? matchPix[1] : undefined,
    observacoes,
  };
}

/**
 * Lê o arquivo PDF e detecta automaticamente se é DANFE (Produtos) ou DANFSe (Serviços)
 */
export async function parseNotaFiscalPdf(file: File): Promise<DadosNotaFiscalPdfExtraidos | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    if (doc.numPages === 0) return null;

    const page = await doc.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join(' ');

    // 1. Verifica se é DANFE (NF-e Modelo 55 - Produtos)
    const isDanfe =
      text.includes('DANFE') ||
      text.includes('DOCUMENTO AUXILIAR DE NOTA FISCAL') ||
      text.includes('www.nfe.fazenda.gov.br') ||
      text.includes('DADOS DO PRODUTOS');

    if (isDanfe) {
      return extrairDadosDanfe(text);
    }

    // 2. Verifica se é NFS-e / DANFSe (Serviços)
    const isNfse =
      text.includes('NFS-e') ||
      text.includes('NFS-E') ||
      text.includes('DANFSe') ||
      (text.includes('PRESTADOR') && text.includes('TOMADOR')) ||
      text.includes('Documento Auxiliar da NFS-e');

    if (isNfse) {
      return extrairDadosNfse(text);
    }

    // Fallback: tenta extrair como DANFE geral
    return extrairDadosDanfe(text);
  } catch (err) {
    console.warn('[pdfParser] Erro ao ler dados do PDF:', err);
    return null;
  }
}

// Mantém export compatível com código existente
export const parseNfsePdf = parseNotaFiscalPdf;
export type DadosNfsePdfExtraidos = DadosNotaFiscalPdfExtraidos;
