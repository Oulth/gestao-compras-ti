/**
 * Utilitário para Leitura e Extração Automática de Dados de Nota Fiscal Eletrônica (NF-e XML)
 * Padrão SEFAZ Brasil (Versões 2.00, 3.10, 4.00)
 */

export interface DadosNFeExtraidos {
  fornecedor: string;
  cnpj: string;
  valor: string;
  dataCompra: string;
  numeroNf: string;
  codigoTi: string;
  descricao: string;
  formaPagamento?: string;
  chaveAcesso?: string;
  dataVencimento?: string;
}

/**
 * Mapeamento de Códigos de Pagamento SEFAZ (tPag) para o sistema
 */
const FORMAS_PAGAMENTO_MAP: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'PIX',
  '18': 'Transferência bancária, Carteira Digital',
  '19': 'Programa de fidelidade',
  '90': 'Sem pagamento',
  '99': 'Outros',
};

/**
 * Extrai texto seguro de uma tag XML
 */
function getTagText(parent: Element | Document, tagName: string): string {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || '';
}

/**
 * Analisa o conteúdo de texto de um XML de NF-e e extrai os campos estruturados
 */
export function parseNfeXml(xmlString: string): DadosNFeExtraidos {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Verifica se houve erro de parse
  const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error('O arquivo selecionado não é um XML válido ou está corrompido.');
  }

  // 1. Dados do Emitente (Fornecedor)
  const emitEl = xmlDoc.getElementsByTagName('emit')[0];
  let fornecedor = '';
  let cnpj = '';

  if (emitEl) {
    const xNome = getTagText(emitEl, 'xNome');
    const xFant = getTagText(emitEl, 'xFant');
    fornecedor = xNome || xFant || '';

    const cnpjRaw = getTagText(emitEl, 'CNPJ') || getTagText(emitEl, 'CPF');
    if (cnpjRaw) {
      cnpj = cnpjRaw.replace(/\D/g, '');
    }
  }

  // 2. Dados da Identificação da Nota (ide)
  const ideEl = xmlDoc.getElementsByTagName('ide')[0];
  let numeroNf = '';
  let dataCompra = '';

  if (ideEl) {
    numeroNf = getTagText(ideEl, 'nNF');

    // Data de emissão (dhEmi ou dEmi)
    const dhEmi = getTagText(ideEl, 'dhEmi') || getTagText(ideEl, 'dEmi');
    if (dhEmi) {
      dataCompra = dhEmi.slice(0, 10); // formato YYYY-MM-DD
    }
  }

  // 3. Valores Totais (total > ICMSTot)
  let valor = '';
  const totalEl = xmlDoc.getElementsByTagName('total')[0];
  if (totalEl) {
    const vNF = getTagText(totalEl, 'vNF');
    if (vNF) {
      valor = vNF;
    }
  } else {
    // Fallback: procura por vNF em qualquer lugar
    const vNF = getTagText(xmlDoc, 'vNF');
    if (vNF) {
      valor = vNF;
    }
  }

  // 4. Itens e Produtos (det > prod)
  const detList = Array.from(xmlDoc.getElementsByTagName('det'));
  const itensDescricao: string[] = [];

  for (const det of detList) {
    const prodEl = det.getElementsByTagName('prod')[0];
    if (prodEl) {
      const xProd = getTagText(prodEl, 'xProd');
      const qCom = getTagText(prodEl, 'qCom');
      const qNum = parseFloat(qCom);
      const qtdText = !isNaN(qNum) ? `${qNum % 1 === 0 ? qNum : qNum.toFixed(2)}x ` : '';
      const vProd = getTagText(prodEl, 'vProd');
      const vNum = parseFloat(vProd);
      const valorText = !isNaN(vNum) && vNum > 0 ? ` [R$ ${vNum.toFixed(2).replace('.', ',')}]` : '';

      if (xProd) {
        itensDescricao.push(`• ${qtdText}${xProd}${valorText}`);
      }
    }
  }

  // Lista 100% dos produtos e itens sem cortes
  const descricao = itensDescricao.length > 0
    ? itensDescricao.join('\n')
    : (getTagText(xmlDoc, 'infAdic') || 'Aquisição de materiais/serviços de T.I conforme NF-e');

  // 5. Forma de Pagamento
  let formaPagamento = 'Boleto Bancário';
  const pagEl = xmlDoc.getElementsByTagName('pag')[0];
  if (pagEl) {
    const tPag = getTagText(pagEl, 'tPag');
    if (tPag && FORMAS_PAGAMENTO_MAP[tPag]) {
      formaPagamento = FORMAS_PAGAMENTO_MAP[tPag];
    }
  }

  // 6. Chave de Acesso e Vencimento da Duplicata
  let chaveAcesso = '';
  const infNFeEl = xmlDoc.getElementsByTagName('infNFe')[0];
  if (infNFeEl) {
    const idAttr = infNFeEl.getAttribute('Id') || '';
    chaveAcesso = idAttr.replace(/\D/g, '');
  }

  const dVenc = getTagText(xmlDoc, 'dVenc');
  const dataVencimento = dVenc ? dVenc.slice(0, 10) : undefined;

  return {
    fornecedor: fornecedor.toUpperCase(),
    cnpj,
    valor,
    dataCompra: dataCompra || new Date().toISOString().split('T')[0],
    numeroNf,
    codigoTi: numeroNf ? `NF-${numeroNf}` : '',
    descricao,
    formaPagamento,
    chaveAcesso,
    dataVencimento,
  };
}
