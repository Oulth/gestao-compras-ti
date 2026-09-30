export type TipoDespesa =
  | 'Produto'
  | 'Serviço'
  | 'Assinatura Recorrente (SaaS)'
  | 'Contrato Mensal';

export type StatusPagamento = 'Pago' | 'Pendente' | 'Parcelado' | 'Cancelado';

export interface Compra {
  id: string;
  codigo_ti?: string | null;
  data_compra: string;
  tipo: TipoDespesa;
  fornecedor: string;
  cnpj?: string | null;
  descricao: string;
  categoria: string;
  centro_custo?: string | null;
  valor: number;
  forma_pagamento?: string | null;
  status_pagamento: StatusPagamento;
  parcelas?: string | null;
  garantia?: string | null;
  link_nf?: string | null;
  nome_arquivo_nf?: string | null;
  observacoes?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export type CompraInput = Omit<Compra, 'id' | 'criado_em' | 'atualizado_em'>;

export interface ConfiguracoesApp {
  categorias: string[];
  centrosCusto: string[];
  formasPagamento: string[];
}

export interface MonthlyTotal {
  mes: string;
  total: number;
  produtos: number;
  servicos: number;
}

export interface CategoryTotal {
  categoria: string;
  total: number;
  percent: number;
}

export interface TopSupplier {
  fornecedor: string;
  cnpj: string | null;
  total: number;
  percent: number;
}

export interface UpcomingWarranty {
  id: string;
  fornecedor: string;
  descricao: string;
  garantia: string;
  diasRestantes: number;
}

export interface DashboardData {
  totalAno: number;
  totalMesAtual: number;
  mediaMensal: number;
  garantiasVencendoCount: number;
  monthlyTotals: MonthlyTotal[];
  categoryTotals: CategoryTotal[];
  topSuppliers: TopSupplier[];
  upcomingWarranties: UpcomingWarranty[];
}

export interface CnpjSearchResult {
  razaoSocial: string;
  nomeFantasia: string;
}

export type StatusEquipamento =
  | 'Em Uso'
  | 'Disponível / Estoque'
  | 'Em Manutenção'
  | 'Baixado / Sucateado';

export interface Equipamento {
  id: string;
  patrimonio: string;
  tipo: string;
  marca: string;
  modelo: string;
  numero_serie?: string | null;
  localizacao: string;
  status: StatusEquipamento;
  responsavel?: string | null;
  funcao_responsavel?: string | null;
  compra_id?: string | null;
  data_aquisicao?: string | null;
  valor_estimado?: number | null;
  especificacoes?: string | null;
  acessorios?: string | null;
  observacoes?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export type EquipamentoInput = Omit<Equipamento, 'id' | 'criado_em' | 'atualizado_em'>;
