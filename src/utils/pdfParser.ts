/**
 * Utilitário para leitura e extração automática de dados de Nota Fiscal de Serviços (NFS-e / DANFSe em PDF)
 * Padrão Nacional e Prefeituras Brasileiras
 */
import * as pdfjsLib from 'pdfjs-dist';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Configura o worker do PDF.js localmente na mesma origem
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface DadosNfsePdfExtraidos {
  prestador: string;
  cnpj: string;
  numeroNfs: string;
  codigoTi: string;
  dataCompra: string;
  descricao: string;
  valor: string;
  formaPagamento?: string;
  chavePix?: string;
  observacoes?: string;
}

/**
 * Lê o arquivo PDF e extrai os campos estruturados de NFS-e caso seja reconhecido
 */
export async function parseNfsePdf(file: File): Promise<DadosNfsePdfExtraidos | null> {
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

    // Validação de documento fiscal (NFS-e, DANFSe, Nota Fiscal)
    const isNfse =
      text.includes('NFS-e') ||
      text.includes('NFS-E') ||
      text.includes('DANFSe') ||
      (text.includes('PRESTADOR') && text.includes('TOMADOR')) ||
      text.includes('Documento Auxiliar da NFS-e');

    if (!isNfse) {
      return null;
    }

    // 1. Prestador / Fornecedor
    const matchPrestador = text.match(
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
    const dataCompra = matchData ? `${matchData[3]}-${matchData[2]}-${matchData[1]}` : '';

    // 5. Descrição do Serviço
    const matchDesc = text.match(
      /Descri[çc][ãa]o do Servi[çc]o\s+([\s\S]+?)(?=\s+TRIBUTA[ÇC][ÃA]O|\s+VALOR TOTAL|\s+Total Dedu|\s+C[óo]digo)/i
    ) || text.match(/Discrimina[çc][ãa]o dos Servi[çc]os:?\s+([\s\S]+?)(?=\s+VALOR|\s+Total)/i);
    const descricao = matchDesc ? matchDesc[1].trim() : 'Prestação de Serviços Especializados de T.I';

    // 6. Valor Líquido / Total
    const matchValor =
      text.match(/Valor (?:L[íi]quido da NFS-e|da Opera[çc][ãa]o\s*\/\s*Servi[çc]o)\s*R\$\s*([\d\.\,]+)/i) ||
      text.match(/VALOR TOTAL.*?R\$\s*([\d\.\,]+)/i) ||
      text.match(/Valor Total da Nota:?\s*R\$\s*([\d\.\,]+)/i);
    const valor = matchValor ? matchValor[1].replace(/\./g, '').replace(',', '.') : '';

    // 7. Dados Bancários / Chave PIX
    const matchPix = text.match(/chave\s*pix:?\s*([^\s\|;]+)/i);
    const matchBanco = text.match(/Inf\.\s*Cont\.:?\s*([\s\S]+?)(?=\s*\|\s*Totais|\s*CANHOTO|$)/i);
    const observacoes = matchBanco ? matchBanco[1].trim() : (matchPix ? `Chave PIX para pagamento: ${matchPix[1]}` : '');

    return {
      prestador: prestador.toUpperCase(),
      cnpj,
      numeroNfs,
      codigoTi: numeroNfs ? `NFS-${numeroNfs}` : '',
      dataCompra: dataCompra || new Date().toISOString().split('T')[0],
      descricao,
      valor,
      formaPagamento: matchPix ? 'PIX' : 'Boleto Bancário',
      chavePix: matchPix ? matchPix[1] : undefined,
      observacoes,
    };
  } catch (err) {
    console.warn('[pdfParser] Não foi possível extrair dados estruturados do PDF:', err);
    return null;
  }
}
