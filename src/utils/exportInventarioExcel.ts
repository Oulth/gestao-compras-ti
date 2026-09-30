import * as XLSX from 'xlsx';
import type { Equipamento } from '../types';
import { formatCurrency, formatDate } from './formatters';

export function exportarInventarioParaExcel(
  equipamentos: Equipamento[],
  nomeArquivo?: string
): void {
  if (!equipamentos || equipamentos.length === 0) {
    const wsVazia = XLSX.utils.json_to_sheet([
      {
        Aviso: 'Nenhum equipamento cadastrado no inventário.',
      },
    ]);
    const wbVazio = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbVazio, wsVazia, 'Inventário');
    XLSX.writeFile(wbVazio, nomeArquivo || 'Inventario_Equipamentos_Agape.xlsx');
    return;
  }

  const linhasFormatadas = equipamentos.map((eq) => ({
    'Patrimônio': eq.patrimonio,
    'Tipo': eq.tipo,
    'Marca': eq.marca,
    'Modelo': eq.modelo,
    'Nº de Série (S/N)': eq.numero_serie || 'N/A',
    'Localização / Sala': eq.localizacao,
    'Status Operacional': eq.status,
    'Responsável / Usuário': eq.responsavel || 'Não Atribuído',
    'Cargo / Função': eq.funcao_responsavel || '',
    'Data de Aquisição': formatDate(eq.data_aquisicao),
    'Valor Estimado': eq.valor_estimado ? formatCurrency(eq.valor_estimado) : 'R$ 0,00',
    'Especificações Técnicas': eq.especificacoes || '',
    'Acessórios Acompanhantes': eq.acessorios || '',
    'Observações': eq.observacoes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(linhasFormatadas);

  // Largura calculada das colunas
  worksheet['!cols'] = [
    { wch: 15 }, // Patrimônio
    { wch: 22 }, // Tipo
    { wch: 18 }, // Marca
    { wch: 24 }, // Modelo
    { wch: 22 }, // S/N
    { wch: 26 }, // Localização
    { wch: 20 }, // Status
    { wch: 26 }, // Responsável
    { wch: 22 }, // Cargo
    { wch: 16 }, // Data
    { wch: 16 }, // Valor
    { wch: 35 }, // Especificações
    { wch: 30 }, // Acessórios
    { wch: 30 }, // Observações
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventário T.I');

  const hoje = new Date().toISOString().split('T')[0];
  const filename = nomeArquivo || `Inventario_Equipamentos_Colegio_Agape_${hoje}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
