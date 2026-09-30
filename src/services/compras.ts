import { supabase } from './supabase';
import type { Compra, CompraInput, ConfiguracoesApp } from '../types';

export const DEFAULT_CONFIGURACOES: ConfiguracoesApp = {
  categorias: [
    'Hardware (PCs, Notebooks, Servidores)',
    'Software & Licenças (SaaS, SO, Antivírus)',
    'Redes & Conectividade (Switches, Roteadores, Cabos)',
    'Impressoras & Suprimentos (Toners, Peças)',
    'Suporte & Serviços Especializados',
    'Telefonia & Comunicação',
    'Acessórios & Periféricos',
    'Outros',
  ],
  centrosCusto: [
    'T.I - Infraestrutura',
    'T.I - Sistemas & Licenças',
    'T.I - Pedagógico / Laboratórios',
    'T.I - Administrativo / Secretaria',
    'T.I - Câmeras / CFTV',
    'Geral',
  ],
  formasPagamento: [
    'PIX',
    'Boleto Bancário',
    'Cartão de Crédito Corporativo',
    'Faturamento 30 Dias',
    'Transferência Bancária (TED/DOC)',
    'Outro',
  ],
};

/**
 * Busca todas as compras cadastradas, opcionalmente filtrando por ano.
 * Ordenação padrão: data_compra decrescente.
 */
export async function getCompras(ano?: number): Promise<Compra[]> {
  let query = supabase
    .from('compras')
    .select('*')
    .order('data_compra', { ascending: false });

  if (ano) {
    const startDate = `${ano}-01-01`;
    const endDate = `${ano}-12-31`;
    query = query.gte('data_compra', startDate).lte('data_compra', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[comprasService] Erro ao buscar compras:', error);
    throw new Error(`Falha ao carregar compras: ${error.message}`);
  }

  return (data as Compra[]) || [];
}

/**
 * Cria uma nova compra no banco de dados.
 */
export async function createCompra(compra: CompraInput): Promise<Compra> {
  const { data, error } = await supabase
    .from('compras')
    .insert([compra])
    .select()
    .single();

  if (error) {
    console.error('[comprasService] Erro ao criar compra:', error);
    throw new Error(`Falha ao cadastrar compra: ${error.message}`);
  }

  return data as Compra;
}

/**
 * Atualiza uma compra existente pelo seu ID.
 */
export async function updateCompra(
  id: string,
  compra: Partial<Compra>
): Promise<Compra> {
  const payload = { ...compra };
  delete payload.id;
  delete payload.criado_em;

  // Atualiza timestamp
  payload.atualizado_em = new Date().toISOString();

  const { data, error } = await supabase
    .from('compras')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`[comprasService] Erro ao atualizar compra ${id}:`, error);
    throw new Error(`Falha ao atualizar compra: ${error.message}`);
  }

  return data as Compra;
}

/**
 * Salva uma compra (se possuir id realiza update, caso contrário create).
 */
export async function saveCompra(compra: Partial<Compra>): Promise<Compra> {
  if (compra.id) {
    return updateCompra(compra.id, compra);
  }
  return createCompra(compra as CompraInput);
}

/**
 * Exclui uma compra pelo seu ID.
 */
export async function deleteCompra(id: string): Promise<void> {
  const { error } = await supabase.from('compras').delete().eq('id', id);

  if (error) {
    console.error(`[comprasService] Erro ao excluir compra ${id}:`, error);
    throw new Error(`Falha ao excluir compra: ${error.message}`);
  }
}

/**
 * Obtém as listas de configurações (categorias, centros de custo, formas de pagamento).
 * Retorna valores padrão caso a tabela esteja vazia ou ocorra erro.
 */
export async function getConfiguracoes(): Promise<ConfiguracoesApp> {
  try {
    const { data, error } = await supabase.from('configuracoes').select('*');

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn(
          '[comprasService] Aviso ao buscar configuracoes (usando padrões):',
          error.message
        );
      }
      return DEFAULT_CONFIGURACOES;
    }

    const configs: ConfiguracoesApp = {
      categorias: [...DEFAULT_CONFIGURACOES.categorias],
      centrosCusto: [...DEFAULT_CONFIGURACOES.centrosCusto],
      formasPagamento: [...DEFAULT_CONFIGURACOES.formasPagamento],
    };

    data.forEach((row: { id: string; itens: string[] }) => {
      if (row.id === 'categorias' && Array.isArray(row.itens) && row.itens.length > 0) {
        configs.categorias = row.itens;
      } else if (
        (row.id === 'centros_custo' || row.id === 'centrosCusto') &&
        Array.isArray(row.itens) &&
        row.itens.length > 0
      ) {
        configs.centrosCusto = row.itens;
      } else if (
        (row.id === 'formas_pagamento' || row.id === 'formasPagamento') &&
        Array.isArray(row.itens) &&
        row.itens.length > 0
      ) {
        configs.formasPagamento = row.itens;
      }
    });

    return configs;
  } catch (err) {
    console.warn(
      '[comprasService] Falha ao recuperar configuracoes do Supabase. Usando defaults:',
      err
    );
    return DEFAULT_CONFIGURACOES;
  }
}
