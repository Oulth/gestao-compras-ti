import { supabase } from './supabase';
import type { Equipamento, EquipamentoInput } from '../types';

export const DEFAULT_TIPOS_EQUIPAMENTO: string[] = [
  'Notebook',
  'Desktop (Gabinete/PC)',
  'Monitor',
  'Switch de Rede',
  'Roteador / Access Point (Wi-Fi)',
  'Impressora / Multifuncional',
  'Nobreak / Estabilizador',
  'Projetor / Datashow',
  'Tablet',
  'Servidor',
  'Câmera / CFTV',
  'Periférico / Acessório',
  'Outro',
];

export const DEFAULT_LOCALIZACOES: string[] = [
  'CPD / Servidores',
  'Secretaria / Administrativo',
  'Sala dos Professores',
  'Coordenação Pedagógica',
  'Diretoria',
  'Financeiro',
  'Recepção / Portaria',
  'Laboratório 1 de Informática',
  'Laboratório 2 de Informática',
  'Biblioteca',
  'Sala de Reuniões',
  'Estoque T.I',
  'Geral',
];

/**
 * Busca todos os equipamentos ordenados pelo código de patrimônio
 */
export async function getEquipamentos(): Promise<Equipamento[]> {
  try {
    const { data, error } = await supabase
      .from('equipamentos')
      .select('*')
      .order('patrimonio', { ascending: true });

    if (error) {
      console.error('[Supabase] Erro ao buscar equipamentos:', error);
      throw new Error(`Falha ao buscar equipamentos: ${error.message}`);
    }

    return (data as Equipamento[]) || [];
  } catch (err: unknown) {
    console.error('[EquipamentosService] Exceção em getEquipamentos:', err);
    throw err;
  }
}

/**
 * Cria um novo equipamento no Supabase
 */
export async function createEquipamento(
  equipamento: EquipamentoInput
): Promise<Equipamento> {
  const payload = {
    patrimonio: equipamento.patrimonio.trim(),
    tipo: equipamento.tipo.trim(),
    marca: equipamento.marca.trim(),
    modelo: equipamento.modelo.trim(),
    numero_serie: equipamento.numero_serie?.trim() || null,
    localizacao: equipamento.localizacao.trim(),
    status: equipamento.status,
    responsavel: equipamento.responsavel?.trim() || null,
    funcao_responsavel: equipamento.funcao_responsavel?.trim() || null,
    compra_id: equipamento.compra_id || null,
    data_aquisicao: equipamento.data_aquisicao || null,
    valor_estimado: equipamento.valor_estimado || 0,
    especificacoes: equipamento.especificacoes?.trim() || null,
    acessorios: equipamento.acessorios?.trim() || null,
    observacoes: equipamento.observacoes?.trim() || null,
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('equipamentos')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`O patrimônio "${equipamento.patrimonio}" já está cadastrado em outro equipamento.`);
    }
    console.error('[Supabase] Erro ao criar equipamento:', error);
    throw new Error(`Falha ao cadastrar equipamento: ${error.message}`);
  }

  return data as Equipamento;
}

/**
 * Cria múltiplos equipamentos em lote no Supabase
 */
export async function createEquipamentosBatch(
  equipamentos: EquipamentoInput[]
): Promise<Equipamento[]> {
  if (!equipamentos || equipamentos.length === 0) return [];

  const payloads = equipamentos.map((eq) => ({
    patrimonio: eq.patrimonio.trim(),
    tipo: eq.tipo.trim(),
    marca: eq.marca.trim(),
    modelo: eq.modelo.trim(),
    numero_serie: eq.numero_serie?.trim() || null,
    localizacao: eq.localizacao.trim(),
    status: eq.status,
    responsavel: eq.responsavel?.trim() || null,
    funcao_responsavel: eq.funcao_responsavel?.trim() || null,
    compra_id: eq.compra_id || null,
    data_aquisicao: eq.data_aquisicao || null,
    valor_estimado: eq.valor_estimado || 0,
    especificacoes: eq.especificacoes?.trim() || null,
    acessorios: eq.acessorios?.trim() || null,
    observacoes: eq.observacoes?.trim() || null,
    atualizado_em: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('equipamentos')
    .insert(payloads)
    .select();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Um ou mais códigos de patrimônio já estão cadastrados no inventário.`);
    }
    console.error('[Supabase] Erro ao cadastrar lote de equipamentos:', error);
    throw new Error(`Falha ao cadastrar itens no inventário: ${error.message}`);
  }

  return (data as Equipamento[]) || [];
}

/**
 * Atualiza um equipamento existente
 */
export async function updateEquipamento(
  id: string,
  equipamento: Partial<EquipamentoInput>
): Promise<Equipamento> {
  const payload: Record<string, unknown> = {
    ...equipamento,
    atualizado_em: new Date().toISOString(),
  };

  if (equipamento.patrimonio) payload.patrimonio = equipamento.patrimonio.trim();
  if (equipamento.marca) payload.marca = equipamento.marca.trim();
  if (equipamento.modelo) payload.modelo = equipamento.modelo.trim();

  const { data, error } = await supabase
    .from('equipamentos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`O patrimônio "${equipamento.patrimonio}" já está em uso por outro equipamento.`);
    }
    console.error('[Supabase] Erro ao atualizar equipamento:', error);
    throw new Error(`Falha ao atualizar equipamento: ${error.message}`);
  }

  return data as Equipamento;
}

/**
 * Salva equipamento (Criação ou Atualização)
 */
export async function saveEquipamento(
  equipamento: EquipamentoInput | Equipamento
): Promise<Equipamento> {
  if ('id' in equipamento && equipamento.id) {
    return updateEquipamento(equipamento.id, equipamento);
  }
  return createEquipamento(equipamento as EquipamentoInput);
}

/**
 * Remove um equipamento
 */
export async function deleteEquipamento(id: string): Promise<void> {
  const { error } = await supabase.from('equipamentos').delete().eq('id', id);

  if (error) {
    console.error('[Supabase] Erro ao excluir equipamento:', error);
    throw new Error(`Falha ao excluir equipamento: ${error.message}`);
  }
}

/**
 * Busca configurações de tipos e localizações para equipamentos
 */
export async function getConfiguracoesEquipamentos(): Promise<{
  tipos: string[];
  localizacoes: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('id, itens')
      .in('id', ['tipos_equipamento', 'localizacoes']);

    if (error || !data || data.length === 0) {
      return {
        tipos: DEFAULT_TIPOS_EQUIPAMENTO,
        localizacoes: DEFAULT_LOCALIZACOES,
      };
    }

    let tipos = DEFAULT_TIPOS_EQUIPAMENTO;
    let localizacoes = DEFAULT_LOCALIZACOES;

    data.forEach((row) => {
      if (row.id === 'tipos_equipamento' && Array.isArray(row.itens) && row.itens.length > 0) {
        tipos = row.itens;
      }
      if (row.id === 'localizacoes' && Array.isArray(row.itens) && row.itens.length > 0) {
        localizacoes = row.itens;
      }
    });

    return { tipos, localizacoes };
  } catch (err) {
    console.warn('[EquipamentosService] Falha ao carregar configurações:', err);
    return {
      tipos: DEFAULT_TIPOS_EQUIPAMENTO,
      localizacoes: DEFAULT_LOCALIZACOES,
    };
  }
}
