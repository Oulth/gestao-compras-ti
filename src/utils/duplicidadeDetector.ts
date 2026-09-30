import { Compra } from '../types';

export interface ResultadoDuplicidade {
  isDuplicada: boolean;
  motivo?: 'numero_nf' | 'arquivo_anexo' | 'financeiro_identico';
  descricaoMotivo?: string;
  compraExistente?: Compra;
}

/**
 * Normaliza número de NF ou Código TI (remove letras, hífens, zeros à esquerda)
 */
export function normalizarCodigoNf(codigo?: string | null): string {
  if (!codigo) return '';
  const apenasNumeros = codigo.replace(/\D/g, '');
  if (apenasNumeros) {
    return apenasNumeros.replace(/^0+/, '');
  }
  return codigo.trim().toLowerCase();
}

/**
 * Normaliza nome de fornecedor para comparação textual robusta
 */
export function normalizarTexto(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Normaliza CNPJ (somente dígitos numéricos)
 */
export function normalizarCnpj(cnpj?: string | null): string {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
}

/**
 * Verifica se um lançamento ou arquivo de nota fiscal já existe nas compras cadastradas
 */
export function verificarDuplicidade(
  candidato: {
    codigo_ti?: string | null;
    fornecedor?: string | null;
    cnpj?: string | null;
    valor?: number | string | null;
    data_compra?: string | null;
    nome_arquivo_nf?: string | null;
  },
  comprasExistentes: Compra[],
  idIgnorar?: string
): ResultadoDuplicidade {
  if (!comprasExistentes || comprasExistentes.length === 0) {
    return { isDuplicada: false };
  }

  const codCandidato = normalizarCodigoNf(candidato.codigo_ti);
  const cnpjCandidato = normalizarCnpj(candidato.cnpj);
  const fornCandidato = normalizarTexto(candidato.fornecedor);
  const nomeArqCandidato = candidato.nome_arquivo_nf?.trim().toLowerCase() || '';

  const valorCandidato = typeof candidato.valor === 'number'
    ? candidato.valor
    : parseFloat(String(candidato.valor || '0').replace(',', '.'));

  const dataCandidato = candidato.data_compra || '';

  for (const existente of comprasExistentes) {
    if (idIgnorar && existente.id === idIgnorar) continue;

    const codExistente = normalizarCodigoNf(existente.codigo_ti);
    const cnpjExistente = normalizarCnpj(existente.cnpj);
    const fornExistente = normalizarTexto(existente.fornecedor);

    const mesmoCnpj = Boolean(cnpjCandidato && cnpjExistente && cnpjCandidato === cnpjExistente);
    const mesmoFornecedor = Boolean(
      fornCandidato &&
      fornExistente &&
      (fornCandidato.includes(fornExistente) || fornExistente.includes(fornCandidato))
    );

    // 1. Mesmo Número de Nota Fiscal + mesmo Fornecedor ou CNPJ
    if (codCandidato && codExistente && codCandidato === codExistente && (mesmoCnpj || mesmoFornecedor)) {
      return {
        isDuplicada: true,
        motivo: 'numero_nf',
        descricaoMotivo: `Já existe uma compra cadastrada com a Nota Fiscal Nº ${existente.codigo_ti} para o fornecedor "${existente.fornecedor}".`,
        compraExistente: existente,
      };
    }

    // 2. Mesmo Arquivo Anexado (XML da NF-e ou PDF da NFS-e)
    const nomeArqExistente = existente.nome_arquivo_nf?.trim().toLowerCase() || '';
    if (nomeArqCandidato && nomeArqExistente && nomeArqCandidato === nomeArqExistente) {
      return {
        isDuplicada: true,
        motivo: 'arquivo_anexo',
        descricaoMotivo: `O arquivo "${candidato.nome_arquivo_nf}" já foi importado anteriormente no lançamento ${existente.codigo_ti || existente.id.slice(0, 8)}.`,
        compraExistente: existente,
      };
    }

    // 3. Mesmo Fornecedor/CNPJ + Mesma Data + Mesmo Valor
    if (
      (mesmoCnpj || mesmoFornecedor) &&
      dataCandidato &&
      existente.data_compra === dataCandidato &&
      valorCandidato > 0 &&
      Math.abs(existente.valor - valorCandidato) < 0.01
    ) {
      return {
        isDuplicada: true,
        motivo: 'financeiro_identico',
        descricaoMotivo: `Já existe um lançamento idêntico no valor de R$ ${existente.valor.toFixed(2).replace('.', ',')} na data ${existente.data_compra} para "${existente.fornecedor}".`,
        compraExistente: existente,
      };
    }
  }

  return { isDuplicada: false };
}
