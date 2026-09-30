import type { CnpjSearchResult } from '../types';

/**
 * Consulta informações de pessoa jurídica na BrasilAPI a partir do CNPJ.
 * Aceita CNPJ com ou sem formatação (pontos, barra, traço).
 * Retorna { razaoSocial, nomeFantasia } ou null se inválido/não encontrado.
 */
export async function consultarCnpj(
  cnpj: string
): Promise<CnpjSearchResult | null> {
  if (!cnpj) return null;

  // Higieniza removendo qualquer caractere não numérico
  const cleanCnpj = cnpj.replace(/\D/g, '');

  // Validação preliminar: CNPJ deve ter exatamente 14 dígitos
  if (cleanCnpj.length !== 14) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[brasilApi] CNPJ ${cleanCnpj} não encontrado na base da Receita.`);
      } else {
        console.warn(`[brasilApi] Resposta HTTP ${response.status} ao consultar CNPJ.`);
      }
      return null;
    }

    const data = await response.json();

    const razaoSocial: string =
      data.razao_social || data.nome_empresarial || '';
    const nomeFantasia: string =
      data.nome_fantasia || razaoSocial;

    if (!razaoSocial) {
      return null;
    }

    return {
      razaoSocial,
      nomeFantasia,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[brasilApi] Tempo limite excedido ao consultar CNPJ.');
    } else {
      console.error('[brasilApi] Erro na consulta do CNPJ:', error);
    }
    return null;
  }
}
