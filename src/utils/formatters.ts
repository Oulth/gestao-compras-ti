import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

export function formatCnpj(cnpj?: string | null): string {
  if (!cnpj) return '-';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length === 14) {
    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  return cnpj;
}

/**
 * Converte com segurança strings monetárias em formato brasileiro (ex: "2.044,00" ou "2044,00")
 * ou numérico padrão (ex: "2044.00" ou 2044) para número sem multiplicar indevidamente por 100.
 */
export function parseMoedaParaNumero(valorInput: string | number | null | undefined): number {
  if (valorInput === null || valorInput === undefined || valorInput === '') return 0;
  if (typeof valorInput === 'number') return isNaN(valorInput) ? 0 : valorInput;

  const str = String(valorInput).trim();
  if (!str) return 0;

  // Se tiver vírgula, trata como decimal brasileiro
  if (str.includes(',')) {
    const semPontosMilhar = str.replace(/\./g, '');
    const comPontoDecimal = semPontosMilhar.replace(',', '.');
    const parsed = parseFloat(comPontoDecimal);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Se tiver apenas ponto e for formato decimal direto (ex: "2044.00")
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

