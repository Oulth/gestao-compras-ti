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
