import type { Equipamento } from '../types';

/**
 * Utilitários para gestão de quantidades e estoque de equipamentos no Inventário de T.I
 */

/**
 * Extrai a quantidade / saldo em estoque de um equipamento a partir de campos textuais.
 * Procura primeiro por tags estruturadas [QTD: X], depois formatos naturais "Qtd: X",
 * "Lote com X unidades" ou "Xx".
 * Retorna 1 se nenhuma quantidade específica for encontrada.
 */
export function extrairQuantidadeEquipamento(item?: Equipamento | null): number {
  if (!item) return 1;

  const campos = [
    item.especificacoes,
    item.observacoes,
    item.acessorios,
    item.modelo,
  ];

  // 1. Tag explícita estruturada: [QTD: 12] ou [ESTOQUE: 12]
  for (const c of campos) {
    if (!c) continue;
    const matchTag = c.match(/\[(?:QTD|ESTOQUE|QUANTIDADE):\s*(\d+)\]/i);
    if (matchTag) return parseInt(matchTag[1], 10);
  }

  // 2. Formato textual: "Qtd: 12" ou "Quantidade: 12" ou "Lote com 12 unidades"
  for (const c of campos) {
    if (!c) continue;
    const matchQtd = c.match(/(?:Qtd|Quantidade|Lote com)\s*[:=]?\s*(\d+)/i);
    if (matchQtd) return parseInt(matchQtd[1], 10);
  }

  // 3. Multiplicador no modelo ou texto: "12x CABO..."
  for (const c of campos) {
    if (!c) continue;
    const matchX = c.match(/(?:^|[^\w])(\d+)\s*x\b/i);
    if (matchX) return parseInt(matchX[1], 10);
  }

  return 1;
}

/**
 * Atualiza ou insere a tag [QTD: X] no texto de especificações ou observações de um equipamento
 */
export function atualizarTextoComQuantidade(
  textoOriginal: string | null | undefined,
  novaQuantidade: number
): string {
  const base = (textoOriginal || '').trim();
  const valorSeguro = Math.max(0, Math.round(novaQuantidade));
  const novaTag = `[QTD: ${valorSeguro}]`;

  if (/\[(?:QTD|ESTOQUE|QUANTIDADE):\s*\d+\]/i.test(base)) {
    return base.replace(/\[(?:QTD|ESTOQUE|QUANTIDADE):\s*\d+\]/i, novaTag);
  }

  return base ? `${base} ${novaTag}` : novaTag;
}

/**
 * Gera um registro de log de uso/retirada para ser anexado no campo observações
 */
export function formatarLogUsoEquipamento(
  observacoesAtuais: string | null | undefined,
  qtdRetirada: number,
  novaQtdRestante: number,
  responsavel?: string,
  local?: string,
  motivo?: string
): string {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR');
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const resp = responsavel?.trim() ? ` por ${responsavel.trim()}` : '';
  const loc = local?.trim() ? ` (Destino: ${local.trim()})` : '';
  const mot = motivo?.trim() ? ` • Motivo: ${motivo.trim()}` : '';

  const linhaLog = `[${dataFormatada} ${horaFormatada}] -${qtdRetirada} un utilizada${resp}${loc}${mot}. Saldo restante: ${novaQtdRestante} un.`;

  const base = (observacoesAtuais || '').trim();
  return base ? `${base}\n${linhaLog}` : linhaLog;
}
