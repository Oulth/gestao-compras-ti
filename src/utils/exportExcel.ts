import * as XLSX from 'xlsx';
import type { Compra } from '../types';
import { formatDate, formatCnpj } from './formatters';

/**
 * Exporta uma lista de compras para formato .xlsx utilizando SheetJS (xlsx).
 * Inclui colunas formatadas, larguras automáticas e nome de arquivo padronizado.
 */
export function exportarParaExcel(
  compras: Compra[],
  nomeArquivoPersonalizado?: string
): void {
  const dados = compras.map((c) => ({
    'Código': c.codigo_ti || '-',
    'Data': formatDate(c.data_compra),
    'Tipo': c.tipo,
    'Fornecedor': c.fornecedor,
    'CNPJ': c.cnpj ? formatCnpj(c.cnpj) : '-',
    'Descrição': c.descricao,
    'Categoria': c.categoria,
    'Centro de Custo': c.centro_custo || '-',
    'Valor (R$)': Number(c.valor) || 0,
    'Forma de Pagamento': c.forma_pagamento || '-',
    'Status': c.status_pagamento,
    'Parcelas': c.parcelas || '-',
    'Garantia': c.garantia ? formatDate(c.garantia) : '-',
    'Link NF': c.link_nf || '-',
    'Observações': c.observacoes || '-',
  }));

  const colunasPadrao = [
    'Código',
    'Data',
    'Tipo',
    'Fornecedor',
    'CNPJ',
    'Descrição',
    'Categoria',
    'Centro de Custo',
    'Valor (R$)',
    'Forma de Pagamento',
    'Status',
    'Parcelas',
    'Garantia',
    'Link NF',
    'Observações',
  ];

  let worksheet: XLSX.WorkSheet;

  if (dados.length === 0) {
    // Caso a lista esteja vazia, gera planilha contendo apenas o cabeçalho
    worksheet = XLSX.utils.aoa_to_sheet([colunasPadrao]);
  } else {
    worksheet = XLSX.utils.json_to_sheet(dados, { header: colunasPadrao });
  }

  // Ajuste automático de largura de colunas (!cols)
  const colWidths = colunasPadrao.map((key) => {
    let maxLength = key.length;
    dados.forEach((row) => {
      const val = row[key as keyof typeof row];
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal.length > maxLength) {
        maxLength = Math.min(strVal.length, 60);
      }
    });
    return { wch: Math.max(maxLength + 3, 10) };
  });

  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras T.I');

  const hoje = new Date().toISOString().split('T')[0];
  const nomeFinal =
    nomeArquivoPersonalizado || `Compras_TI_Colegio_Agape_${hoje}.xlsx`;

  XLSX.writeFile(workbook, nomeFinal);
}
