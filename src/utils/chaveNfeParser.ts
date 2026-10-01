/**
 * Utilitário para decodificação matemática e semântica da Chave de Acesso de NF-e (44 dígitos)
 * Padrão SEFAZ Brasil
 */

export interface ChaveNfeDecodificada {
  valida: boolean;
  chaveLimpa: string;
  ufCodigo: string;
  ufSigla: string;
  ano: string;
  mes: string;
  cnpj: string;
  modelo: string;
  serie: string;
  numeroNf: string;
  codigoTi: string;
  dataCompraSugerida: string;
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
 * Decodifica uma chave de acesso de 44 dígitos da NF-e
 */
export function decodificarChaveNfe(chaveInput: string): ChaveNfeDecodificada | null {
  if (!chaveInput) return null;
  const limpa = chaveInput.replace(/\D/g, '');
  if (limpa.length !== 44) return null;

  const ufCodigo = limpa.slice(0, 2);
  const aamm = limpa.slice(2, 6);
  const ano = `20${aamm.slice(0, 2)}`;
  const mes = aamm.slice(2, 4);
  const cnpjRaw = limpa.slice(6, 20);
  const modelo = limpa.slice(20, 22);
  const serie = limpa.slice(22, 25);
  const nNfRaw = limpa.slice(25, 34);
  const numeroNf = String(parseInt(nNfRaw, 10));

  const cnpj = cnpjRaw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

  return {
    valida: true,
    chaveLimpa: limpa,
    ufCodigo,
    ufSigla: UF_MAP[ufCodigo] || 'BR',
    ano,
    mes,
    cnpj,
    modelo,
    serie,
    numeroNf,
    codigoTi: `NF-${numeroNf}`,
    dataCompraSugerida: `${ano}-${mes}-01`,
  };
}
